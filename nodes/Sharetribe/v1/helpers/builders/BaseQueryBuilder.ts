import {
	IDataObject,
	IExecuteFunctions,
	INode,
	NodeOperationError,
	NodeApiError,
} from 'n8n-workflow';
import type { DateTime } from 'luxon';
import { SharetribeQueryBuilder } from '../Sharetribe';
import {
	API_RESOURCES,
	DEFAULT_QUERY_LIMIT,
	OUTPUT_MODES,
	QUERY_PARAMS,
	RESULT_MODES,
	type ApiResource,
	type OutputMode,
	type ResultMode,
	type ResultOptions,
} from '../Sharetribe.types';
import {
	convertToUtcIso8601,
	getResourceLocatorValue,
	getExtendedDataPrefix,
} from '../Sharetribe.utils';
import type { JsonObject } from 'n8n-workflow';

export abstract class BaseQueryBuilder {
	protected context: IExecuteFunctions;
	protected qs: IDataObject = {};
	protected simplify: boolean = true;
	protected countOnly: boolean = false;
	protected returnAll: boolean = false;
	protected limit: number = DEFAULT_QUERY_LIMIT;
	protected deferredApiResource?: ApiResource;
	protected deferredFieldsKey?: string;
	protected deferredOptions?: IDataObject;
	private extendedDataSparseFields: Array<{ scope: string; fieldName: string }> = [];

	constructor(context: IExecuteFunctions) {
		this.context = context;
	}

	protected buildOutputModeParams(
		apiResource: ApiResource,
		fieldsKey: string,
		options: IDataObject,
	): void {
		// Determine output mode and fields
		let outputMode: OutputMode;
		let fieldsToReturn: string[] = [];

		if (this.countOnly || this.simplify) {
			outputMode = OUTPUT_MODES.SIMPLIFIED;
		} else {
			outputMode = OUTPUT_MODES.SELECTED_FIELDS;
			const outputFields = options.outputFields as IDataObject | undefined;
			fieldsToReturn = (outputFields?.[fieldsKey] as string[]) || [];
		}

		// Build field/relationship params
		const builder = new SharetribeQueryBuilder(
			this.context.getNode(),
			apiResource,
			outputMode,
			fieldsToReturn,
		);
		const configParams = builder.withOptions(options).build();
		Object.assign(this.qs, configParams);
	}

	protected applyDeferredOutputModeParams(): void {
		if (this.deferredApiResource && this.deferredFieldsKey && this.deferredOptions) {
			this.buildOutputModeParams(
				this.deferredApiResource,
				this.deferredFieldsKey,
				this.deferredOptions,
			);
			this.ensureFilteredScopesInSparseFields(this.deferredApiResource);
		}
	}

	/**
	 * Ensures specific extended data fields used in filters or sorts are included in sparse fields.
	 * Uses Sharetribe's nested sparse field syntax (e.g. `publicData.country`) so only the
	 * exact filtered/sorted field is returned, not the entire extended data blob.
	 */
	private ensureFilteredScopesInSparseFields(resource: ApiResource): void {
		if (this.extendedDataSparseFields.length === 0) return;

		const fieldsParam = this.getFieldsParamForResource(resource);
		if (!fieldsParam || !this.qs[fieldsParam]) return;

		const sparseFields = this.qs[fieldsParam] as string[];
		if (!Array.isArray(sparseFields)) return;

		const isUserResource = resource === API_RESOURCES.USER;

		for (const { scope, fieldName } of this.extendedDataSparseFields) {
			const scopePath = isUserResource ? `profile.${scope}` : scope;
			const sparseField = `${scopePath}.${fieldName}`;

			// Skip if the whole scope or exact field is already included
			if (!sparseFields.includes(scopePath) && !sparseFields.includes(sparseField)) {
				sparseFields.push(sparseField);
			}
		}
	}

	private getFieldsParamForResource(resource: ApiResource): string | null {
		switch (resource) {
			case API_RESOURCES.USER:
				return QUERY_PARAMS.FIELDS_USER;
			case API_RESOURCES.LISTING:
				return QUERY_PARAMS.FIELDS_LISTING;
			case API_RESOURCES.TRANSACTION:
				return QUERY_PARAMS.FIELDS_TRANSACTION;
			default:
				return null;
		}
	}

	protected getResultMode(): ResultMode {
		if (this.countOnly) return RESULT_MODES.TOTALS as ResultMode;
		if (this.returnAll) return RESULT_MODES.RETURN_ALL as ResultMode;
		return RESULT_MODES.LIMIT as ResultMode;
	}

	protected buildResultOptions(): ResultOptions {
		const resultMode = this.getResultMode();
		const resultOptions: ResultOptions = { mode: resultMode };

		if (!this.returnAll) {
			resultOptions.limit = this.limit;
		}

		return resultOptions;
	}

	/**
	 * Builds sort array from sort options
	 * Handles listing-specific keyword/origin mutual exclusivity if filterOptions provided
	 */
	protected buildSortArray(sortOptions: IDataObject, filterOptions?: IDataObject): string[] | null {
		if (!sortOptions.sort) {
			return null;
		}

		const hasKeywordsFilter =
			filterOptions?.keywords !== undefined &&
			filterOptions.keywords !== null &&
			filterOptions.keywords !== '';
		const hasOriginFilter =
			filterOptions?.origin !== undefined &&
			filterOptions.origin !== null &&
			filterOptions.origin !== '';

		const sortArray = (sortOptions.sort as IDataObject[])
			.map((sortRule) => {
				const field = sortRule.field as string;
				const direction = (sortRule.direction as string) || 'DESC';

				if (hasKeywordsFilter && field === 'origin') {
					return null;
				}
				if (hasOriginFilter && field === 'keywords') {
					return null;
				}

				return this.formatSortField(sortRule, field, direction);
			})
			.filter(Boolean) as string[];

		return sortArray.length > 0 ? sortArray : null;
	}

	/**
	 * Formats a sort field appending the necessary prefix for ascending or descending
	 */
	private formatSortField(sortRule: IDataObject, field: string, direction: string): string {
		// Sharetribe API: no prefix = descending, "-" prefix = ascending
		const prefix = direction === 'ASC' ? '-' : '';

		const extendedDataFields = ['metadata', 'privateData', 'publicData', 'protectedData'];
		if (extendedDataFields.includes(field)) {
			const keyNameRaw = getResourceLocatorValue(sortRule[`${field}AttributeName`]);
			let keyName = Array.isArray(keyNameRaw) ? keyNameRaw[0] : keyNameRaw;
			// Strip scope prefix if present (e.g. "publicData.region_location" → "region_location")
			if (keyName?.startsWith(`${field}.`)) {
				keyName = keyName.slice(field.length + 1);
			}
			const dataPrefix = getExtendedDataPrefix(
				field as 'metadata' | 'publicData' | 'privateData' | 'protectedData',
			);
			if (keyName) {
				this.extendedDataSparseFields.push({ scope: field, fieldName: keyName });
			}
			return `${prefix}${dataPrefix}_${keyName}`;
		}

		// No mapping needed - field names match API
		return `${prefix}${field}`;
	}

	/**
	 * Processes an array of filters and applies them to a query string object
	 */
	protected addFiltersToQueryParams(filters: IDataObject[], qs: IDataObject, node: INode): void {
		for (const filter of filters) {
			const filterType = filter.filterType as string;

			// Simple ID filters
			const idFilters = ['customerId', 'providerId', 'listingId', 'userId', 'authorId'];
			if (idFilters.includes(filterType) && filter[filterType]) {
				qs[filterType] = filter[filterType];
			}

			// Array filters
			if (filterType === 'bookingStates' && filter.bookingStates) {
				qs.bookingStates = filter.bookingStates;
			}
			if (filterType === 'stockReservationStates' && filter.stockReservationStates) {
				qs.stockReservationStates = filter.stockReservationStates;
			}

			// Date filters - convert to UTC ISO8601
			if (filterType === 'createdAtStart' && filter.createdAtStartTime) {
				qs.createdAtStart = convertToUtcIso8601(filter.createdAtStartTime as DateTime | string);
			}
			if (filterType === 'createdAtEnd' && filter.createdAtEndTime) {
				qs.createdAtEnd = convertToUtcIso8601(filter.createdAtEndTime as DateTime | string);
			}

			// Date range filters
			if (filterType === 'bookingStart') {
				const result = this.handleDateRangeFilter(filter, 'bookingStart');
				if (result) qs.bookingStart = result;
			}
			if (filterType === 'bookingEnd') {
				const result = this.handleDateRangeFilter(filter, 'bookingEnd');
				if (result) qs.bookingEnd = result;
			}

			// Boolean filters
			const booleanFilters = ['hasBooking', 'hasMessage', 'hasPayin', 'hasStockReservation'];
			for (const boolFilter of booleanFilters) {
				if (filterType === boolFilter && typeof filter[boolFilter] === 'boolean') {
					qs[boolFilter] = filter[boolFilter].toString();
				}
			}

			// Resource locator filters
			if (filterType === 'lastTransition' && filter.lastTransitions) {
				const transitions = getResourceLocatorValue(filter.lastTransitions);
				const transitionsStr = Array.isArray(transitions) ? transitions[0] : transitions;
				if (transitionsStr) {
					// Validate transition name format: should start with "transition/"
					if (!transitionsStr.startsWith('transition/')) {
						throw new NodeOperationError(node, 'Invalid transition name format in filter', {
							description: `Transition name must start with "transition/" (e.g., "transition/accept", "transition/decline").<br><br>Received: "${transitionsStr}"`,
						});
					}
					// Ensure there's something after "transition/"
					if (transitionsStr === 'transition/' || transitionsStr.length <= 11) {
						throw new NodeOperationError(node, 'Invalid transition name in filter', {
							description: `Transition name must have an action after "transition/".<br><br>Received: "${transitionsStr}"`,
						});
					}
					qs.lastTransitions = transitionsStr;
				}
			}
			if (filterType === 'processNames' && filter.processNames) {
				const processNames = getResourceLocatorValue(filter.processNames);
				if (processNames) qs.processNames = processNames;
			}
			if (filterType === 'states' && filter.states) {
				const states = getResourceLocatorValue(filter.states);
				if (states) qs.states = states;
			}
			if (filterType === 'userType' && filter.userType) {
				const userTypeValue = getResourceLocatorValue(filter.userType);
				if (userTypeValue) qs.pub_userType = userTypeValue;
			}

			// Extended data filters
			const extendedDataTypes = ['metadata', 'privateData', 'publicData', 'protectedData'] as const;
			for (const dataType of extendedDataTypes) {
				if (filterType === dataType) {
					const result = this.handleExtendedDataFilter(filter, dataType, node);
					if (result) qs[result.key] = result.value;
				}
			}
		}
	}

	/**
	 * Handles date range filters (e.g., bookingStart, bookingEnd)
	 */
	private handleDateRangeFilter(filter: IDataObject, fieldName: string): string | undefined {
		const rangeType = filter[`${fieldName}RangeType`] || 'exact';

		if (rangeType === 'exact' && filter[`${fieldName}Exact`]) {
			return convertToUtcIso8601(filter[`${fieldName}Exact`] as DateTime | string);
		} else if (
			rangeType === 'range' &&
			(filter[`${fieldName}Start`] || filter[`${fieldName}End`])
		) {
			const start = filter[`${fieldName}Start`]
				? convertToUtcIso8601(filter[`${fieldName}Start`] as DateTime | string)
				: '';
			const end = filter[`${fieldName}End`]
				? convertToUtcIso8601(filter[`${fieldName}End`] as DateTime | string)
				: '';
			return `${start},${end}`;
		} else if (rangeType === 'after' && filter[`${fieldName}Start`]) {
			return `${convertToUtcIso8601(filter[`${fieldName}Start`] as DateTime | string)},`;
		} else if (rangeType === 'before' && filter[`${fieldName}End`]) {
			return `,${convertToUtcIso8601(filter[`${fieldName}End`] as DateTime | string)}`;
		}

		return undefined;
	}

	/**
	 * Handles extended data filters (metadata, publicData, privateData, protectedData)
	 */
	private handleExtendedDataFilter(
		filter: IDataObject,
		dataType: 'metadata' | 'publicData' | 'privateData' | 'protectedData',
		node: INode,
	): { key: string; value: string } | undefined {
		const attributeNameField = `${dataType}AttributeName`;
		const prefix = getExtendedDataPrefix(dataType);

		if (!filter[attributeNameField]) {
			return undefined;
		}

		const key = getResourceLocatorValue(filter[attributeNameField]);
		const condition = (filter.condition_type as string) || 'eq';

		// Validate attribute name — strip scope prefix if present
		// (resource locator values include the scope, e.g. "publicData.region_location")
		let keyStr = Array.isArray(key) ? key[0] : key;
		if (keyStr?.startsWith(`${dataType}.`)) {
			keyStr = keyStr.slice(dataType.length + 1);
		}
		if (!keyStr || !keyStr.trim()) {
			const dataTypeLabels = {
				metadata: 'Metadata',
				publicData: 'Public data',
				privateData: 'Private data',
				protectedData: 'Protected data',
			};
			const dataTypeLabel = dataTypeLabels[dataType] || dataType;
			throw new NodeApiError(node, {
				message: `${dataTypeLabel} field name cannot be empty`,
				description: 'Please provide a valid field name',
			} as JsonObject);
		}

		const filterKey = `${prefix}_${keyStr}`;
		this.extendedDataSparseFields.push({ scope: dataType, fieldName: keyStr });

		// Handle range condition (uses min/max instead of single value)
		if (condition === 'range') {
			if (!filter.extendedDataMinValue && !filter.extendedDataMaxValue) return undefined;
			const min = (filter.extendedDataMinValue as string) || '';
			const max = (filter.extendedDataMaxValue as string) || '';
			return { key: filterKey, value: `${min},${max}` };
		}

		if (!filter.extendedDataValue) {
			return undefined;
		}

		const value = filter.extendedDataValue as string;
		const filterValue = this.formatExtendedDataFilterValue(condition, value);

		return { key: filterKey, value: filterValue };
	}

	/**
	 * Formats extended data filter value based on condition type.
	 */
	private formatExtendedDataFilterValue(condition: string, value: string): string {
		switch (condition) {
			case 'eq':
				return value;
			case 'gteq':
				return `${value},`;
			case 'lt':
				return `,${value}`;
			case 'includesAll':
				return `has_all:${value}`;
			case 'includesAny':
				return `has_any:${value}`;
			case 'isOneOf':
				return value;
			default:
				return value;
		}
	}
}
