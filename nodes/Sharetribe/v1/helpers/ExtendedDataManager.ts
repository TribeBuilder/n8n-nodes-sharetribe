import get from 'lodash/get';
import set from 'lodash/set';
import unset from 'lodash/unset';
import isEmpty from 'lodash/isEmpty';
import cloneDeep from 'lodash/cloneDeep';
import type { IExecuteFunctions, IDataObject } from 'n8n-workflow';
import type { Endpoints } from './Sharetribe.types';
import { Sharetribe } from './Sharetribe';
import {
	parseFixedCollectionValues,
	normalizeGeolocation,
	normalizePrice,
	normalizeImages,
} from './Sharetribe.utils';
import { FieldsetBuilder } from './builders/FieldsetBuilder';
import {
	API_RESOURCES,
	UI_RESOURCES,
	RESOURCE_DEFAULTS,
	OUTPUT_MODES,
	USER_ATTRIBUTE_FIELD_MAP,
} from './Sharetribe.types';

interface ResourceConfig {
	endpoint: Endpoints;
	fieldPrefix: string; // '' for listing/transaction, 'profile' for user
	resourceKey: string; // 'user', 'listing', 'transaction'
}

export class ExtendedDataManager {
	private context: IExecuteFunctions;
	private sharetribe: Sharetribe;
	private resourceId: string = '';
	private itemIndex: number = 0;
	private resourceConfig: ResourceConfig | null = null;
	private fieldsConfig: IDataObject = {};
	private dataTypes: readonly string[] = [];
	private body: IDataObject = {};
	private deletions: Array<{ extendedDataType: string; fieldPath: string }> = [];
	private outputMode: string = '';
	private fieldsToReturn: string[] = [];
	private options: IDataObject = {};

	private constructor(context: IExecuteFunctions, sharetribe: Sharetribe) {
		this.context = context;
		this.sharetribe = sharetribe;
	}

	static for(context: IExecuteFunctions, sharetribe: Sharetribe): ExtendedDataManager {
		return new ExtendedDataManager(context, sharetribe);
	}

	resource(id: string, type: 'user' | 'listing' | 'transaction', itemIndex: number): this {
		this.resourceId = id;
		this.itemIndex = itemIndex;
		this.resourceConfig = this.getResourceConfig(type);
		this.body = { id };
		return this;
	}

	withBody(body: IDataObject): this {
		this.body = { ...this.body, ...body };
		return this;
	}

	withCoreFields(fieldsConfig: IDataObject): this {
		if (!this.resourceConfig) {
			throw new Error('Resource must be configured before setting core fields');
		}

		const resourceType = this.resourceConfig.resourceKey as 'user' | 'listing' | 'transaction';

		if (resourceType === 'user') {
			// User core fields: firstName, lastName, displayName, bio, profileImageId
			const coreFieldNames = ['firstName', 'lastName', 'displayName', 'bio', 'profileImageId'];
			for (const fieldName of coreFieldNames) {
				if (fieldsConfig[fieldName] !== undefined && fieldsConfig[fieldName] !== '') {
					this.body[fieldName] = fieldsConfig[fieldName];
				}
			}
		} else if (resourceType === 'listing') {
			// Listing core fields: title, description, geolocation, price, images, availabilityPlan
			// Simple string fields
			if (fieldsConfig.title !== undefined && fieldsConfig.title !== '') {
				this.body.title = fieldsConfig.title;
			}
			if (fieldsConfig.description !== undefined && fieldsConfig.description !== '') {
				this.body.description = fieldsConfig.description;
			}

			// Normalized fields
			const geolocation = normalizeGeolocation(fieldsConfig.geolocation);
			if (geolocation) {
				this.body.geolocation = geolocation;
			}

			const price = normalizePrice(fieldsConfig.price);
			if (price) {
				this.body.price = price;
			}

			const images = normalizeImages(fieldsConfig.images);
			if (images !== undefined) {
				this.body.images = images;
			}

			if (fieldsConfig.availabilityPlan) {
				this.body.availabilityPlan = fieldsConfig.availabilityPlan;
			}
		}
		// Transaction has no core fields

		return this;
	}

	withExtendedDataUpdates(fieldsConfig: IDataObject, dataTypes: readonly string[]): this {
		this.fieldsConfig = fieldsConfig;
		this.dataTypes = dataTypes;
		return this;
	}

	withExtendedDataDeletions(fieldDeletionsConfig: IDataObject): this {
		this.deletions = this.parseDeletions(fieldDeletionsConfig);
		return this;
	}

	withOutput(fieldsToReturn: string[], outputMode: string, options: IDataObject): this {
		this.fieldsToReturn = fieldsToReturn;
		this.outputMode = outputMode;
		this.options = options;
		return this;
	}

	getNestedDataTypes(): {
		extendedDataTypes: string[];
		endpoint: Endpoints;
		resourceKey: string;
		fieldPrefix: string;
	} | null {
		if (!this.resourceConfig) return null;

		const nestedTypesFromUpdates = this.dataTypes.filter((extendedDataType) =>
			this.hasNestedAssignments(extendedDataType),
		);
		const nestedTypesFromDeletions = this.deletions
			.filter((d) => d.fieldPath.includes('.'))
			.map((d) => d.extendedDataType);

		const extendedDataTypes = [
			...new Set([...nestedTypesFromUpdates, ...nestedTypesFromDeletions]),
		];

		if (extendedDataTypes.length === 0) return null;

		return {
			extendedDataTypes,
			endpoint: this.resourceConfig.endpoint,
			resourceKey: this.resourceConfig.resourceKey,
			fieldPrefix: this.resourceConfig.fieldPrefix,
		};
	}

	build(
		endpoint: Endpoints,
		existingData: Record<string, IDataObject> = {},
	): { body: IDataObject; qs: IDataObject } {
		if (!this.resourceConfig) {
			throw new Error('Resource must be configured before building');
		}

		this.context.logger.debug(
			`[EDM] Build ${this.resourceConfig.resourceKey} | extendedDataTypes=${JSON.stringify(this.dataTypes)}`,
		);

		this.applyUpdates(this.body, existingData);
		this.applyDeletions(this.body, this.deletions, existingData);

		const { fields: effectiveFields, mode: effectiveMode } = this.getEffectiveOutputConfig();

		const resourceType = this.resourceConfig.resourceKey as 'user' | 'listing' | 'transaction';
		const apiResource =
			resourceType === 'user'
				? API_RESOURCES.USER
				: resourceType === 'listing'
					? API_RESOURCES.LISTING
					: API_RESOURCES.TRANSACTION;
		const uiResource =
			resourceType === 'user'
				? UI_RESOURCES.USER
				: resourceType === 'listing'
					? UI_RESOURCES.LISTING
					: UI_RESOURCES.TRANSACTION;

		const { qs } = new FieldsetBuilder(this.context, apiResource, uiResource, endpoint)
			.withResourceId(this.resourceId, this.itemIndex)
			.withFields(effectiveFields, effectiveMode)
			.withOptions(this.options)
			.build();

		return { body: this.body, qs };
	}

	async buildSpeculative(existingData: Record<string, IDataObject> = {}): Promise<IDataObject> {
		if (!this.resourceConfig) {
			throw new Error('Resource must be configured before building speculative preview');
		}

		this.applyUpdates(this.body, existingData);

		const { fields: effectiveFields } = this.getEffectiveOutputConfig();

		return await this.buildSpeculativePreview(
			this.sharetribe,
			this.resourceId,
			this.body,
			this.deletions,
			effectiveFields,
		);
	}

	private applyUpdates(body: IDataObject, existingData: Record<string, IDataObject>): void {
		for (const extendedDataType of this.dataTypes) {
			const config = get(this.fieldsConfig, extendedDataType) as IDataObject | undefined;
			const values = get(config, `${extendedDataType}Values`) as IDataObject | undefined;

			if (!values) continue;

			const mode = get(values, 'mode') as string;
			const baseData =
				mode === 'manual' && existingData[extendedDataType]
					? cloneDeep(existingData[extendedDataType])
					: undefined;

			this.context.logger.debug(
				`[EDM] Build ${extendedDataType} | mode=${mode} | base=${JSON.stringify(baseData || {})}`,
			);

			const result = parseFixedCollectionValues(values, baseData);
			if (result) {
				this.context.logger.debug(`[EDM] Final ${extendedDataType}=${JSON.stringify(result)}`);
				set(body, extendedDataType, result);
			}
		}
	}

	parseDeletions(
		fieldDeletionsConfig: IDataObject,
	): Array<{ extendedDataType: string; fieldPath: string }> {
		const deletions: Array<{ extendedDataType: string; fieldPath: string }> = [];

		if (!fieldDeletionsConfig?.deletions || !Array.isArray(fieldDeletionsConfig.deletions)) {
			return deletions;
		}

		for (const deletion of fieldDeletionsConfig.deletions as IDataObject[]) {
			const extendedDataType = deletion.dataType as string;
			const fieldPathLocator = deletion.fieldPath as IDataObject | string;

			let fieldPath: string;
			if (typeof fieldPathLocator === 'string') {
				fieldPath = fieldPathLocator;
			} else if (fieldPathLocator && typeof fieldPathLocator === 'object') {
				fieldPath = (fieldPathLocator.value as string) || '';
			} else {
				continue;
			}

			if (!fieldPath) continue;

			const prefix = `${extendedDataType}.`;
			if (fieldPath.startsWith(prefix)) {
				fieldPath = fieldPath.substring(prefix.length);
			}

			deletions.push({ extendedDataType, fieldPath });
		}

		return deletions;
	}

	private applyDeletions(
		body: IDataObject,
		deletions: Array<{ extendedDataType: string; fieldPath: string }>,
		existingData: Record<string, IDataObject>,
	): void {
		for (const { extendedDataType, fieldPath } of deletions) {
			if (fieldPath.includes('.')) {
				const data =
					get(body, extendedDataType) || cloneDeep(get(existingData, extendedDataType, {}));
				if (isEmpty(data)) continue;

				unset(data, fieldPath);
				set(body, extendedDataType, data);
			} else {
				set(body, `${extendedDataType}.${fieldPath}`, null);
			}
		}
	}

	async buildSpeculativePreview(
		sharetribe: Sharetribe,
		resourceId: string,
		body: IDataObject,
		deletions: Array<{ extendedDataType: string; fieldPath: string }>,
		fieldsToReturn: string[],
	): Promise<IDataObject> {
		if (!this.resourceConfig) {
			throw new Error('Resource must be configured before building preview');
		}

		const { endpoint, resourceKey, fieldPrefix } = this.resourceConfig;

		const sparseFields: string[] = [];
		for (const field of fieldsToReturn) {
			if (fieldPrefix) {
				sparseFields.push(USER_ATTRIBUTE_FIELD_MAP[field] || `${fieldPrefix}.${field}`);
			} else {
				sparseFields.push(field);
			}
		}

		const { data } = await sharetribe.request({
			method: 'GET',
			endpoint,
			qs: {
				id: resourceId,
				[`fields.${resourceKey}`]: sparseFields.length > 0 ? sparseFields : undefined,
			},
		});

		const preview = cloneDeep((data[0]?.json || {}) as IDataObject);
		const container = fieldPrefix ? (preview[fieldPrefix] as IDataObject) || {} : preview;

		const extendedDataKeys = new Set(this.dataTypes);
		for (const [key, value] of Object.entries(body)) {
			if (key !== 'id' && !extendedDataKeys.has(key)) {
				container[key] = value;
			}
		}

		for (const extendedDataType of this.dataTypes) {
			if (body[extendedDataType]) {
				container[extendedDataType] = container[extendedDataType] || {};

				const updates = body[extendedDataType] as IDataObject;
				for (const [key, value] of Object.entries(updates)) {
					set(container[extendedDataType] as IDataObject, key, value);
				}
			}
		}

		for (const { extendedDataType, fieldPath } of deletions) {
			if (!container[extendedDataType]) continue;
			unset(container[extendedDataType] as IDataObject, fieldPath);
		}

		if (fieldPrefix) {
			preview[fieldPrefix] = container;
		}

		return { ...preview, _speculative: true };
	}

	/**
	 * Detects manual mapping field names that would cause accidental path
	 * duplication when dot notation is enabled and fields are dragged from the input pane.
	 * For users, entering "profile.publicData.x"
	 * would produce profile.publicData.profile.publicData.x.
	 */
	getFieldNameWarnings(): string[] {
		if (!this.resourceConfig) return [];

		const warnings: string[] = [];
		const { fieldPrefix } = this.resourceConfig;

		for (const extendedDataType of this.dataTypes) {
			const values = get(this.fieldsConfig, `${extendedDataType}.${extendedDataType}Values`) as
				| IDataObject
				| undefined;
			if (!values || get(values, 'mode') !== 'manual') continue;
			if (get(values, 'dotNotation') === false) continue;

			const assignments = get(values, 'fields.assignments', []) as Array<{ name: string }>;
			if (!Array.isArray(assignments)) continue;

			for (const assignment of assignments) {
				const name = assignment.name;
				if (!name || !name.includes('.')) continue;

				let suggested: string | undefined;
				let apiPath: string | undefined;

				// Check if field name starts with its own data type prefix (e.g. "metadata.x" inside metadata)
				const typePrefix = `${extendedDataType}.`;
				if (name.startsWith(typePrefix)) {
					apiPath = fieldPrefix
						? `${fieldPrefix}.${extendedDataType}.${name}`
						: `${extendedDataType}.${name}`;
					suggested = name.substring(typePrefix.length);
				} else if (fieldPrefix) {
					// For users: check if field name starts with the profile prefix path
					const fullPrefix = `${fieldPrefix}.${extendedDataType}.`;
					if (name.startsWith(fullPrefix)) {
						apiPath = `${fieldPrefix}.${extendedDataType}.${name}`;
						suggested = name.substring(fullPrefix.length);
					} else if (name.startsWith(`${fieldPrefix}.`)) {
						apiPath = `${fieldPrefix}.${extendedDataType}.${name}`;
						suggested = name.substring(`${fieldPrefix}.`.length);
					}
				}

				if (apiPath && suggested) {
					const example: IDataObject = {};
					set(example, apiPath, '...');
					warnings.push(
						`Field "${name}" in ${extendedDataType} creates a duplicated path.<br>` +
							`Did you mean "${suggested}"?<br>` +
							`Result: <pre>${JSON.stringify(example, null, 2)}</pre>`,
					);
				}
			}
		}

		return warnings;
	}

	private hasNestedAssignments(extendedDataType: string): boolean {
		const values = get(this.fieldsConfig, `${extendedDataType}.${extendedDataType}Values`) as
			| IDataObject
			| undefined;
		if (!values || get(values, 'mode') !== 'manual') return false;

		const dotNotation = get(values, 'dotNotation');
		if (dotNotation === false) return false; // dot notation disabled — no nested paths possible

		const assignments = get(values, 'fields.assignments', []) as Array<{ name: string }>;
		const hasNested = Array.isArray(assignments) && assignments.some((a) => a.name.includes('.'));
		const names = assignments.map((a) => a.name).join(',');
		this.context.logger.debug(`[EDM] hasNested(${extendedDataType})=${hasNested} fields=${names}`);
		return hasNested;
	}

	/**
	 * Computes the effective fields-to-return and output mode, ensuring that
	 * any fields being modified (body keys + deletion data types) are included
	 * in the sparse fieldset. In simplified mode, starts from RESOURCE_DEFAULTS;
	 * in selectedFields mode, starts from the user's selection.
	 */
	private getEffectiveOutputConfig(): { fields: string[]; mode: string } {
		if (!this.resourceConfig) {
			return { fields: this.fieldsToReturn, mode: this.outputMode };
		}

		const bodyFields = Object.keys(this.body).filter((k) => k !== 'id');
		const deletionTypes = [...new Set(this.deletions.map((d) => d.extendedDataType))];
		const modifiedFields = [...new Set([...bodyFields, ...deletionTypes])];

		if (this.outputMode === OUTPUT_MODES.SIMPLIFIED) {
			const defaults = [...(RESOURCE_DEFAULTS[this.resourceConfig.resourceKey] || [])];
			return {
				fields: [...new Set([...defaults, ...modifiedFields])],
				mode: OUTPUT_MODES.SELECTED_FIELDS,
			};
		}

		if (modifiedFields.length === 0) {
			return { fields: this.fieldsToReturn, mode: this.outputMode };
		}

		return {
			fields: [...new Set([...this.fieldsToReturn, ...modifiedFields])],
			mode: this.outputMode,
		};
	}

	private getResourceConfig(type: 'user' | 'listing' | 'transaction'): ResourceConfig {
		const configs: Record<'user' | 'listing' | 'transaction', ResourceConfig> = {
			user: {
				endpoint: 'users/show' as Endpoints,
				fieldPrefix: 'profile',
				resourceKey: 'user',
			},
			listing: {
				endpoint: 'listings/show' as Endpoints,
				fieldPrefix: '',
				resourceKey: 'listing',
			},
			transaction: {
				endpoint: 'transactions/show' as Endpoints,
				fieldPrefix: '',
				resourceKey: 'transaction',
			},
		};
		return configs[type];
	}
}
