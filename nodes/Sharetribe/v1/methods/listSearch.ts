/**
 * Load Options - Auto-populate resource locator dropdown options for:
 * Transactions, Listings, Users.
 *
 * Data is auto populated by querying and learning from 100 recent
 * transactions, listings and users. Categories and listing types come from asset data.
 *
 * Data learned includes:
 *
 * Transaction: states, transition names, process names, searchable protected and metadata attributes.
 * Listing: Listing types, searchable public, private and metadata attributes.
 * User: User types, searchable public, private, protected and metadata attributes.
 *
 */

import type {
	IDataObject,
	ILoadOptionsFunctions,
	INodePropertyOptions,
	INodeListSearchResult,
} from 'n8n-workflow';
import {
	PREDEFINED_PUBLIC_DATA_FIELDS,
	CurrencyCode,
	listSearchApiCall,
	listSearchAssetCall,
	applyFilterToResults,
	toSortedOptions,
	fieldsToOptions,
	fieldsToOptionsWithLabels,
	getCategoryIdFromFilterOptions,
	categoriesToOptions,
	getCategoriesAtLevel,
	type Category,
	type ListingTypesAssetResponse,
	type ListingCategoriesAssetResponse,
	type ListingFieldsAssetResponse,
	type UserFieldsAssetResponse,
	type UserTypesAssetResponse,
	type SharetribeApiResponse,
} from '../helpers/Sharetribe';

/**
 * Builds a human-readable description of a field's schema type for display in dropdowns.
 * Uses marketplace terminology (e.g. "Dropdown", "Checkbox", "Number").
 */
function buildFieldDescription(
	schemaType?: string,
	enumOptions?: Array<{ option: string; label: string }>,
): string {
	if (!schemaType) return '';
	const typeLabels: Record<string, string> = {
		text: 'Free text',
		enum: 'Dropdown',
		'multi-enum': 'Checkbox',
		boolean: 'boolean',
		long: 'Number',
	};
	const typeLabel = typeLabels[schemaType] || schemaType;
	if ((schemaType === 'enum' || schemaType === 'multi-enum') && enumOptions?.length) {
		const values = enumOptions.map((o) => o.label || o.option).join(', ');
		return `${typeLabel}: ${values}`;
	}
	if (schemaType === 'boolean') return 'boolean: true, false';
	return typeLabel;
}

/**
 * Fetches listing field definitions from the listing-fields.json asset.
 * Fields with `filterConfig.indexForSearch === true` are returned as `indexed`
 * and can skip binary elimination. All matching fields are returned in `all`
 * with their display labels for use in dropdown options.
 *
 * @param context - n8n load options context
 * @param scope - The extended data scope to filter by
 * @returns Object with `indexed` (pre-validated filterable fields), `all` (all fields with labels),
 *   and `descriptions` (schema type descriptions for dropdown display)
 */
async function getIndexedListingFieldsFromAsset(
	context: ILoadOptionsFunctions,
	scope: 'public' | 'private' | 'metadata',
): Promise<{
	indexed: Map<string, string>;
	all: Map<string, string>;
	descriptions: Map<string, string>;
}> {
	try {
		const response = await listSearchAssetCall<ListingFieldsAssetResponse>(
			context,
			'listings/listing-fields.json',
		);
		const fields = response.data[0]?.attributes?.data?.listingFields || [];
		const indexed = new Map<string, string>();
		const all = new Map<string, string>();
		const descriptions = new Map<string, string>();
		const dataType =
			scope === 'public' ? 'publicData' : scope === 'private' ? 'privateData' : 'metadata';
		for (const field of fields) {
			if (field.scope === scope) {
				const key = `${dataType}.${field.key}`;
				all.set(key, field.label);
				const desc = buildFieldDescription(field.schemaType, field.enumOptions);
				if (desc) descriptions.set(key, desc);
				if (field.filterConfig?.indexForSearch) {
					indexed.set(key, field.label);
				}
			}
		}
		return { indexed, all, descriptions };
	} catch (error) {
		context.logger.error(`[Sharetribe] Failed to fetch listing fields asset: ${error}`);
		return { indexed: new Map(), all: new Map(), descriptions: new Map() };
	}
}

/**
 * Fetches user field definitions from the user-fields.json asset.
 * User fields don't have `indexForSearch`, so the asset only provides
 * known field names and labels — fields still need binary elimination
 * to confirm filterability.
 *
 * @param context - n8n load options context
 * @param scope - The extended data scope to filter by
 * @returns Object with `labels` (field value to display label) and `descriptions` (schema type descriptions)
 */
async function getUserFieldsFromAsset(
	context: ILoadOptionsFunctions,
	scope: 'public' | 'private' | 'protected',
): Promise<{ labels: Map<string, string>; descriptions: Map<string, string> }> {
	try {
		const response = await listSearchAssetCall<UserFieldsAssetResponse>(
			context,
			'users/user-fields.json',
		);
		const fields = response.data[0]?.attributes?.data?.userFields || [];
		const labels = new Map<string, string>();
		const descriptions = new Map<string, string>();
		const dataType =
			scope === 'public' ? 'publicData' : scope === 'private' ? 'privateData' : 'protectedData';
		for (const field of fields) {
			if (field.scope === scope) {
				const key = `${dataType}.${field.key}`;
				labels.set(key, field.label);
				const desc = buildFieldDescription(field.schemaType, field.enumOptions);
				if (desc) descriptions.set(key, desc);
			}
		}
		return { labels, descriptions };
	} catch (error) {
		context.logger.error(`[Sharetribe] Failed to fetch user fields asset: ${error}`);
		return { labels: new Map(), descriptions: new Map() };
	}
}

/**
 * Queries recent resources to discover extended data field names, then validates
 * which fields are actually filterable using binary elimination probes.
 *
 * @param context - n8n load options context
 * @param resourceType - The resource type to query
 * @param scope - The extended data scope to discover fields for
 * @param preKnownFields - Optional set of field names from asset data to merge
 *   into the discovered set before validation (catches fields not present in sampled resources)
 * @returns Set of validated filterable field names
 */
async function discoverAndValidateFields(
	context: ILoadOptionsFunctions,
	resourceType: 'listing' | 'transaction' | 'user',
	scope: 'metadata' | 'publicData' | 'privateData' | 'protectedData',
	preKnownFields?: Set<string>,
): Promise<Set<string>> {
	const endpointMap = {
		listing: 'listings/query',
		transaction: 'transactions/query',
		user: 'users/query',
	};

	const endpoint = endpointMap[resourceType];

	const sparseFields: IDataObject = {};

	if (resourceType === 'listing') {
		sparseFields['fields.listing'] = [scope];
	} else if (resourceType === 'user') {
		sparseFields['fields.user'] = [`profile.${scope}`];
	} else if (resourceType === 'transaction') {
		sparseFields['fields.transaction'] = [scope];
	}

	try {
		const discoveryStart = Date.now();
		context.logger.info(`[Sharetribe] Querying ${resourceType}s to discover ${scope} fields`);

		const response = await listSearchApiCall<SharetribeApiResponse>(
			context,
			endpoint,
			sparseFields,
		);

		context.logger.info(
			`[Sharetribe] Discovery query for ${resourceType} ${scope} returned ${response.data?.length || 0} items (${Date.now() - discoveryStart}ms)`,
		);

		const data = response.data;
		const discovered = new Set<string>();

		// Discover fields from the resources
		for (const item of data || []) {
			const attributes = item.attributes as IDataObject;

			const extendedData = (
				resourceType === 'user'
					? (attributes?.profile as IDataObject)?.[scope]
					: attributes?.[scope]
			) as IDataObject;

			if (extendedData && typeof extendedData === 'object') {
				for (const [key, value] of Object.entries(extendedData)) {
					const fieldName = `${scope}.${key}`;
					const dataType = Array.isArray(value) ? 'array' : typeof value;

					// Only include filterable types (not arrays or objects)
					if (dataType !== 'array' && dataType !== 'object') {
						discovered.add(fieldName);
					}
				}
			}
		}

		// Merge pre-known fields from asset data into discovered set
		if (preKnownFields) {
			for (const field of preKnownFields) {
				discovered.add(field);
			}
		}

		// Validate which fields can actually be filtered
		if (discovered.size > 0) {
			// Exclude fields that have own filter in UI or known not filterable
			const fieldsToValidate = new Set(discovered);

			if (resourceType === 'listing' && scope === 'publicData') {
				fieldsToValidate.delete('publicData.listingType');
				fieldsToValidate.delete('publicData.categoryLevel1');
				fieldsToValidate.delete('publicData.categoryLevel2');
				fieldsToValidate.delete('publicData.categoryLevel3');
			}

			if (resourceType === 'user' && scope === 'publicData') {
				fieldsToValidate.delete('publicData.userType');
			}

			if (resourceType === 'transaction' && scope === 'metadata') {
				fieldsToValidate.delete('metadata.inquiryMessage');
			}

			const validated = await validateFilterableFields(
				context,
				resourceType,
				scope,
				fieldsToValidate,
			);
			context.logger.debug(
				`[Sharetribe] Validated ${validated.size}/${discovered.size} ${scope} fields for ${resourceType}`,
			);
			return validated;
		}

		context.logger.debug(`[Sharetribe] No ${scope} fields found in ${resourceType}s`);
		return new Set();
	} catch (error) {
		context.logger.error(
			`[Sharetribe] Failed to discover ${scope} fields for ${resourceType}: ${error}`,
		);
		return new Set();
	}
}

const MAX_CONCURRENT_PROBES = 6;

/**
 * Simple concurrency limiter for API probe calls.
 * Limits the number of in-flight requests to prevent overwhelming the API.
 */
class Semaphore {
	private queue: (() => void)[] = [];
	private running = 0;

	constructor(private maxConcurrency: number) {}

	async acquire(): Promise<void> {
		if (this.running < this.maxConcurrency) {
			this.running++;
			return;
		}
		return new Promise<void>((resolve) => {
			this.queue.push(resolve);
		});
	}

	release(): void {
		this.running--;
		const next = this.queue.shift();
		if (next) {
			this.running++;
			next();
		}
	}
}

/**
 * Binary elimination probe: recursively split fields and test to find valid ones
 * This is much more efficient than testing each field individually.
 * Uses a shared semaphore to limit concurrent API calls.
 */
async function binaryEliminationProbe(
	context: ILoadOptionsFunctions,
	endpoint: string,
	fields: string[],
	scope: string,
	prefix: string,
	semaphore: Semaphore,
): Promise<Set<string>> {
	if (fields.length === 0) return new Set();

	// Base case: single field, test it
	if (fields.length === 1) {
		const field = fields[0];
		const key = field.replace(`${scope}.`, '');
		const impossibleValue = '___IMPOSSIBLE___';

		await semaphore.acquire();
		const start = Date.now();
		try {
			const response = await listSearchApiCall<SharetribeApiResponse>(context, endpoint, {
				[`${prefix}${key}`]: impossibleValue,
				pageSize: 1,
			});
			const data = response.data;
			const dataLength = data.length;
			const total = response.meta?.totalItems ?? dataLength;
			const valid = total === 0;
			context.logger.info(
				`[Sharetribe] Probe single field ${prefix}${key} → ${valid ? 'valid' : 'invalid'} (${Date.now() - start}ms)`,
			);
			// 0 results = field is valid (impossible value filtered successfully)
			return valid ? new Set([field]) : new Set();
		} catch {
			context.logger.info(
				`[Sharetribe] Probe single field ${prefix}${key} → error (${Date.now() - start}ms)`,
			);
			return new Set();
		} finally {
			semaphore.release();
		}
	}

	// Recursive case: split in half
	const mid = Math.floor(fields.length / 2);
	const leftHalf = fields.slice(0, mid);
	const rightHalf = fields.slice(mid);

	// Test left half with impossible values
	const leftQs: IDataObject = { pageSize: 1 };
	for (const field of leftHalf) {
		const key = field.replace(`${scope}.`, '');
		leftQs[`${prefix}${key}`] = '___IMPOSSIBLE___';
	}

	// Test right half with impossible values
	const rightQs: IDataObject = { pageSize: 1 };
	for (const field of rightHalf) {
		const key = field.replace(`${scope}.`, '');
		rightQs[`${prefix}${key}`] = '___IMPOSSIBLE___';
	}

	const probeWithSemaphore = async (
		label: string,
		qs: IDataObject,
	): Promise<SharetribeApiResponse> => {
		await semaphore.acquire();
		const start = Date.now();
		try {
			const response = await listSearchApiCall<SharetribeApiResponse>(context, endpoint, qs);
			const total = response.meta?.totalItems ?? response.data.length;
			context.logger.info(
				`[Sharetribe] Probe ${label} (${fields.length} fields) → ${total} results (${Date.now() - start}ms)`,
			);
			return response;
		} catch {
			context.logger.info(
				`[Sharetribe] Probe ${label} (${fields.length} fields) → error (${Date.now() - start}ms)`,
			);
			return { data: [], meta: { totalItems: 1 } } as SharetribeApiResponse;
		} finally {
			semaphore.release();
		}
	};

	const [leftResponse, rightResponse] = await Promise.all([
		probeWithSemaphore('left', leftQs),
		probeWithSemaphore('right', rightQs),
	]);

	const leftData = leftResponse.data;
	const leftDataLength = leftData.length;
	const leftTotal = leftResponse.meta?.totalItems ?? leftDataLength;

	const rightData = rightResponse.data;
	const rightDataLength = rightData.length;
	const rightTotal = rightResponse.meta?.totalItems ?? rightDataLength;

	const validFields = new Set<string>();

	// Recursively probe halves that returned 0 (meaning they have valid fields)
	// Run both branches concurrently when both need recursion
	const recursivePromises: Promise<Set<string>>[] = [];
	if (leftTotal === 0) {
		recursivePromises.push(
			binaryEliminationProbe(context, endpoint, leftHalf, scope, prefix, semaphore),
		);
	}
	if (rightTotal === 0) {
		recursivePromises.push(
			binaryEliminationProbe(context, endpoint, rightHalf, scope, prefix, semaphore),
		);
	}

	const results = await Promise.all(recursivePromises);
	for (const resultSet of results) {
		resultSet.forEach((k) => validFields.add(k));
	}

	return validFields;
}

/**
 * Validates which fields can actually be filtered using binary elimination.
 * Creates a semaphore-limited probe session and delegates to binaryEliminationProbe.
 *
 * @param context - n8n load options context
 * @param resourceType - The resource type to validate against
 * @param scope - The extended data scope
 * @param fields - Set of candidate field names to validate
 * @returns Set of validated filterable field names
 */
async function validateFilterableFields(
	context: ILoadOptionsFunctions,
	resourceType: 'listing' | 'transaction' | 'user',
	scope: string,
	fields: Set<string>,
): Promise<Set<string>> {
	if (fields.size === 0) return new Set();

	const endpointMap = {
		listing: 'listings/query',
		transaction: 'transactions/query',
		user: 'users/query',
	};

	const endpoint = endpointMap[resourceType];

	const prefixMap: Record<string, string> = {
		metadata: 'meta_',
		publicData: 'pub_',
		privateData: 'priv_',
		protectedData: 'prot_',
	};

	const prefix = prefixMap[scope];

	try {
		context.logger.info(
			`[Sharetribe] Binary elimination starting for ${fields.size} ${resourceType} ${scope} fields (max ${MAX_CONCURRENT_PROBES} concurrent)`,
		);

		// Use binary elimination to efficiently find valid fields
		const semaphore = new Semaphore(MAX_CONCURRENT_PROBES);
		const overallStart = Date.now();
		const validatedFields = await binaryEliminationProbe(
			context,
			endpoint,
			Array.from(fields),
			scope,
			prefix,
			semaphore,
		);

		context.logger.info(
			`[Sharetribe] Binary elimination complete: ${validatedFields.size}/${fields.size} valid fields in ${Date.now() - overallStart}ms`,
		);

		return validatedFields;
	} catch (error) {
		context.logger.error(`[Sharetribe] Binary elimination failed: ${error}`);
		return new Set();
	}
}

// Discover transaction process information (processes, states, transitions) from actual transactions
async function discoverTransactionProcessInfo(
	context: ILoadOptionsFunctions,
	type: 'processes' | 'states' | 'transitions',
): Promise<Set<string>> {
	// Use sparse fields to only get what we need for efficiency
	const fieldMap = {
		processes: ['processName'],
		states: ['state'],
		transitions: ['transitions'],
	};

	const fields = fieldMap[type];

	try {
		context.logger.debug(`[Sharetribe] Querying transactions to discover ${type}`);

		const response = await listSearchApiCall<SharetribeApiResponse>(context, 'transactions/query', {
			'fields.transaction': fields,
		});

		const discovered = new Set<string>();

		for (const item of response.data) {
			const attributes = item.attributes as IDataObject | undefined;
			if (!attributes) continue;

			if (type === 'processes') {
				const processName = attributes.processName as string;
				if (processName) discovered.add(processName);
			} else if (type === 'states') {
				const state = attributes.state as string;
				if (state) discovered.add(state);
			} else if (type === 'transitions') {
				const transitions = attributes.transitions as IDataObject[];
				if (transitions) {
					for (const transition of transitions) {
						const transitionName = transition.transition as string;
						if (transitionName) discovered.add(transitionName);
					}
				}
			}
		}

		context.logger.debug(`[Sharetribe] Discovered ${discovered.size} ${type} from transactions`);
		return discovered;
	} catch (error) {
		context.logger.error(`[Sharetribe] Failed to discover ${type} from transactions: ${error}`);
		return new Set();
	}
}

export async function getProcessNames(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	const processes = await discoverTransactionProcessInfo(this, 'processes');
	return toSortedOptions(processes, undefined, filter);
}

export async function getTransactionStates(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	const states = await discoverTransactionProcessInfo(this, 'states');
	return toSortedOptions(states, 'state/', filter);
}

const DEFAULT_OPERATOR_TRANSITIONS = new Set([
	'transition/operator-accept',
	'transition/operator-decline',
	'transition/operator-complete',
	'transition/cancel',
	'transition/operator-reject-request',
	'transition/operator-accept-update',
	'transition/operator-reject-offer',
	'transition/operator-reject-from-customer-counter-offer',
	'transition/operator-mark-delivered',
	'transition/operator-request-changes',
	'transition/operator-mark-changes-delivered',
	'transition/operator-cancel-from-changes-requested',
	'transition/operator-cancel-from-delivered',
	'transition/operator-accept-deliverable',
	'transition/operator-dispute',
	'transition/mark-received-from-disputed',
	'transition/cancel-from-disputed',
]);

export async function getTransitions(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	return toSortedOptions(DEFAULT_OPERATOR_TRANSITIONS, 'transition/', filter);
}

/**
 * Sort-specific methods — only return "long" (number) fields from assets.
 * Sorting by extended data only works on number fields in Sharetribe.
 */

async function getNumberFieldsFromListingAsset(
	context: ILoadOptionsFunctions,
	scope: 'public' | 'private' | 'metadata',
): Promise<{ fields: Set<string>; labels: Map<string, string> }> {
	try {
		const response = await listSearchAssetCall<ListingFieldsAssetResponse>(
			context,
			'listings/listing-fields.json',
		);
		const allFields = response.data[0]?.attributes?.data?.listingFields || [];
		const fields = new Set<string>();
		const labels = new Map<string, string>();
		const dataType =
			scope === 'public' ? 'publicData' : scope === 'private' ? 'privateData' : 'metadata';
		for (const field of allFields) {
			if (field.scope === scope && field.schemaType === 'long') {
				const key = `${dataType}.${field.key}`;
				fields.add(key);
				labels.set(key, field.label);
			}
		}
		return { fields, labels };
	} catch {
		return { fields: new Set(), labels: new Map() };
	}
}

async function getNumberFieldsFromUserAsset(
	context: ILoadOptionsFunctions,
	scope: 'public' | 'private' | 'protected',
): Promise<{ fields: Set<string>; labels: Map<string, string> }> {
	try {
		const response = await listSearchAssetCall<UserFieldsAssetResponse>(
			context,
			'users/user-fields.json',
		);
		const allFields = response.data[0]?.attributes?.data?.userFields || [];
		const fields = new Set<string>();
		const labels = new Map<string, string>();
		const dataType =
			scope === 'public' ? 'publicData' : scope === 'private' ? 'privateData' : 'protectedData';
		for (const field of allFields) {
			if (field.scope === scope && field.schemaType === 'long') {
				const key = `${dataType}.${field.key}`;
				fields.add(key);
				labels.set(key, field.label);
			}
		}
		return { fields, labels };
	} catch {
		return { fields: new Set(), labels: new Map() };
	}
}

export async function getSortableMetadataAttributes(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	const resource = this.getNodeParameter('resource', 0) as string;
	const asset =
		resource === 'listing' || resource === 'transaction'
			? await getNumberFieldsFromListingAsset(this, 'metadata')
			: await getNumberFieldsFromUserAsset(this, 'public'); // user metadata not in asset; fall through
	if (asset.fields.size === 0) {
		return fieldsToOptions(new Set(), 'metadata.', filter);
	}
	return fieldsToOptionsWithLabels(asset.fields, 'metadata.', asset.labels, filter);
}

export async function getSortablePublicDataAttributes(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	const resource = this.getNodeParameter('resource', 0) as string;
	const asset =
		resource === 'listing'
			? await getNumberFieldsFromListingAsset(this, 'public')
			: await getNumberFieldsFromUserAsset(this, 'public');
	if (asset.fields.size === 0) {
		return fieldsToOptions(new Set(), 'publicData.', filter);
	}
	return fieldsToOptionsWithLabels(asset.fields, 'publicData.', asset.labels, filter);
}

export async function getSortablePrivateDataAttributes(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	const resource = this.getNodeParameter('resource', 0) as string;
	const asset =
		resource === 'listing'
			? await getNumberFieldsFromListingAsset(this, 'private')
			: await getNumberFieldsFromUserAsset(this, 'private');
	if (asset.fields.size === 0) {
		return fieldsToOptions(new Set(), 'privateData.', filter);
	}
	return fieldsToOptionsWithLabels(asset.fields, 'privateData.', asset.labels, filter);
}

export async function getSortableProtectedDataAttributes(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	const resource = this.getNodeParameter('resource', 0) as string;
	const asset =
		resource === 'user'
			? await getNumberFieldsFromUserAsset(this, 'protected')
			: { fields: new Set<string>(), labels: new Map<string, string>() };
	if (asset.fields.size === 0) {
		return fieldsToOptions(new Set(), 'protectedData.', filter);
	}
	return fieldsToOptionsWithLabels(asset.fields, 'protectedData.', asset.labels, filter);
}

export async function getMetadataAttributes(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	const resource = this.getNodeParameter('resource', 0) as 'listing' | 'transaction' | 'user';
	const fields = await discoverAndValidateFields(this, resource, 'metadata');
	return fieldsToOptions(fields, 'metadata.', filter);
}

export async function getPublicDataAttributes(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	const resource = this.getNodeParameter('resource', 0) as 'listing' | 'user';
	const predefinedFields = new Set(PREDEFINED_PUBLIC_DATA_FIELDS);
	let labelMap = new Map<string, string>();

	if (resource === 'listing') {
		const assetData = await getIndexedListingFieldsFromAsset(this, 'public');
		labelMap = assetData.all;

		// Discovery + binary validation for live data fields
		const fields = await discoverAndValidateFields(this, resource, 'publicData');

		// Add indexed asset fields directly — pre-validated, no binary search needed
		for (const [fieldValue] of assetData.indexed) {
			if (!predefinedFields.has(fieldValue)) {
				fields.add(fieldValue);
			}
		}

		return fieldsToOptionsWithLabels(
			fields,
			'publicData.',
			labelMap,
			filter,
			predefinedFields,
			assetData.descriptions,
		);
	} else {
		// User: asset provides field names but no filterability info
		const assetFields = await getUserFieldsFromAsset(this, 'public');
		labelMap = assetFields.labels;

		// Pass asset field names as preKnownFields so they enter binary validation
		const preKnown = new Set(assetFields.labels.keys());
		const fields = await discoverAndValidateFields(this, resource, 'publicData', preKnown);

		return fieldsToOptionsWithLabels(
			fields,
			'publicData.',
			labelMap,
			filter,
			predefinedFields,
			assetFields.descriptions,
		);
	}
}

export async function getPrivateDataAttributes(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	const resource = this.getNodeParameter('resource', 0) as 'listing' | 'user';

	if (resource === 'listing') {
		const assetData = await getIndexedListingFieldsFromAsset(this, 'private');
		const fields = await discoverAndValidateFields(this, resource, 'privateData');

		// Add indexed asset fields directly — pre-validated
		for (const [fieldValue] of assetData.indexed) {
			fields.add(fieldValue);
		}

		return fieldsToOptionsWithLabels(
			fields,
			'privateData.',
			assetData.all,
			filter,
			undefined,
			assetData.descriptions,
		);
	} else {
		// User: asset provides field names for binary validation
		const assetFields = await getUserFieldsFromAsset(this, 'private');
		const preKnown = new Set(assetFields.labels.keys());
		const fields = await discoverAndValidateFields(this, resource, 'privateData', preKnown);

		return fieldsToOptionsWithLabels(
			fields,
			'privateData.',
			assetFields.labels,
			filter,
			undefined,
			assetFields.descriptions,
		);
	}
}

export async function getProtectedDataAttributes(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	const resource = this.getNodeParameter('resource', 0) as 'transaction' | 'user';
	const fields = await discoverAndValidateFields(this, resource, 'protectedData');
	return fieldsToOptions(fields, 'protectedData.', filter);
}

export async function getUserTypes(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	const response = await listSearchAssetCall<UserTypesAssetResponse>(this, 'users/user-types.json');

	const userTypes = response.data[0]?.attributes?.data?.userTypes || [];

	const results: INodePropertyOptions[] = userTypes.map((type) => {
		const value = type.id;
		let name = type.label;

		// If label looks like an identifier (snake_case/kebab-case), format it
		if (name === value && /^[a-z0-9_-]+$/.test(name)) {
			name = name
				.split(/[_-]/)
				.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
				.join(' ');
		}

		return { name, value };
	});

	results.sort((a, b) => a.name.localeCompare(b.name));

	return { results: applyFilterToResults(results, filter) };
}

export async function getListingTypes(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	const response = await listSearchAssetCall<ListingTypesAssetResponse>(
		this,
		'listings/listing-types.json',
	);

	// Response structure: { data: [{ attributes: { data: { listingTypes: [...] } } }] }
	const listingTypes = response.data[0]?.attributes?.data?.listingTypes || [];

	const results: INodePropertyOptions[] = listingTypes.map((type) => {
		const value = type.id;
		let name = type.label;

		// If label looks like an identifier (snake_case/kebab-case), format it
		if (name === value && /^[a-z0-9_-]+$/.test(name)) {
			name = name
				.split(/[_-]/)
				.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
				.join(' ');
		}

		return { name, value };
	});

	results.sort((a, b) => a.name.localeCompare(b.name));

	return { results: applyFilterToResults(results, filter) };
}

export async function getCategoryLevel1(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	const categories = await getCategoriesAtLevel(this, []);
	const results = categoriesToOptions(categories);
	return { results: applyFilterToResults(results, filter) };
}

export async function getCategoryLevel2(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	const filterOptions = this.getNodeParameter('filterOptions', undefined, {
		extractValue: true,
	}) as IDataObject;

	const level1Id = getCategoryIdFromFilterOptions(filterOptions, 'categoryLevel1');

	let categories: Category[];
	if (level1Id) {
		// Filter by parent category
		categories = await getCategoriesAtLevel(this, [level1Id]);
	} else {
		// No parent selected - show all level 2 categories from all level 1 parents
		const response = await listSearchAssetCall<ListingCategoriesAssetResponse>(
			this,
			'listings/listing-categories.json',
		);
		const allLevel1 = response.data[0]?.attributes?.data?.categories || [];
		categories = allLevel1.flatMap((cat) => cat.subcategories || []);
	}

	const results = categoriesToOptions(categories);
	return { results: applyFilterToResults(results, filter) };
}

export async function getCategoryLevel3(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	const filterOptions = this.getNodeParameter('filterOptions', undefined, {
		extractValue: true,
	}) as IDataObject;

	const level1Id = getCategoryIdFromFilterOptions(filterOptions, 'categoryLevel1');
	const level2Id = getCategoryIdFromFilterOptions(filterOptions, 'categoryLevel2');

	let categories: Category[];
	if (level1Id && level2Id) {
		// Both parents selected - show filtered subcategories
		categories = await getCategoriesAtLevel(this, [level1Id, level2Id]);
	} else if (level1Id) {
		// Only level 1 selected - show all level 3 from that level 1's subcategories
		const level2Categories = await getCategoriesAtLevel(this, [level1Id]);
		categories = level2Categories.flatMap((cat) => cat.subcategories || []);
	} else {
		// No parents selected - show all level 3 categories from everywhere
		const response = await listSearchAssetCall<ListingCategoriesAssetResponse>(
			this,
			'listings/listing-categories.json',
		);
		const allLevel1 = response.data[0]?.attributes?.data?.categories || [];
		categories = allLevel1.flatMap((l1) =>
			(l1.subcategories || []).flatMap((l2) => l2.subcategories || []),
		);
	}

	const results = categoriesToOptions(categories);
	return { results: applyFilterToResults(results, filter) };
}

export async function getCurrencyCodes(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	const results: INodePropertyOptions[] = Object.values(CurrencyCode).map((code) => ({
		name: code,
		value: code,
	}));

	return { results: applyFilterToResults(results, filter) };
}

// Helper to recursively extract all field paths from an object in dot notation
function extractFieldPaths(obj: IDataObject, prefix = ''): string[] {
	return Object.keys(obj).reduce((acc, key) => {
		const pre = prefix.length ? `${prefix}.` : '';
		const currentPath = pre + key;

		// Always add the current path
		acc.push(currentPath);

		// If value is a nested object (not array, not null), recurse into it
		if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
			acc.push(...extractFieldPaths(obj[key] as IDataObject, currentPath));
		}

		return acc;
	}, [] as string[]);
}

// Discover user extended data fields without validation (for deletion)
async function discoverUserExtendedDataFields(
	context: ILoadOptionsFunctions,
	scope: 'metadata' | 'publicData' | 'privateData' | 'protectedData',
): Promise<Set<string>> {
	const sparseFields: IDataObject = {
		'fields.user': [`profile.${scope}`],
		perPage: 100,
		include: [],
	};

	try {
		const response = await listSearchApiCall<SharetribeApiResponse>(
			context,
			'users/query',
			sparseFields,
		);

		const discovered = new Set<string>();

		for (const item of response.data || []) {
			const attributes = item.attributes as IDataObject;
			const extendedData = (attributes?.profile as IDataObject)?.[scope] as IDataObject;

			if (extendedData && typeof extendedData === 'object') {
				const fieldPaths = extractFieldPaths(extendedData);
				for (const path of fieldPaths) {
					discovered.add(`${scope}.${path}`);
				}
			}
		}

		return discovered;
	} catch (error) {
		context.logger.error(`[Sharetribe] Failed to discover ${scope} fields: ${error}`);
		return new Set();
	}
}

// Get user extended data fields - unified method that reads dataType from context
export async function getUserExtendedDataFields(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	// Get the dataType from the current parameter context
	const dataType = (this.getNodeParameter('fieldDeletions.deletions[0].dataType', 0, {
		extractValue: true,
	}) || 'metadata') as string;

	let scope: 'metadata' | 'publicData' | 'privateData' | 'protectedData';
	switch (dataType) {
		case 'publicData':
			scope = 'publicData';
			break;
		case 'privateData':
			scope = 'privateData';
			break;
		case 'protectedData':
			scope = 'protectedData';
			break;
		case 'metadata':
		default:
			scope = 'metadata';
			break;
	}

	const fields = await discoverUserExtendedDataFields(this, scope);

	const predefinedFields =
		scope === 'publicData' ? new Set(PREDEFINED_PUBLIC_DATA_FIELDS) : undefined;
	return fieldsToOptions(fields, `${scope}.`, filter, predefinedFields);
}

// Discover listing extended data fields without validation (for deletion)
async function discoverListingExtendedDataFields(
	context: ILoadOptionsFunctions,
	scope: 'metadata' | 'publicData' | 'privateData',
): Promise<Set<string>> {
	const sparseFields: IDataObject = {
		'fields.listing': [scope],
		perPage: 100,
		include: [],
	};

	try {
		const response = await listSearchApiCall<SharetribeApiResponse>(
			context,
			'listings/query',
			sparseFields,
		);

		const discovered = new Set<string>();

		for (const item of response.data || []) {
			const attributes = item.attributes as IDataObject;
			const extendedData = attributes?.[scope] as IDataObject;

			if (extendedData && typeof extendedData === 'object') {
				const fieldPaths = extractFieldPaths(extendedData);
				for (const path of fieldPaths) {
					discovered.add(`${scope}.${path}`);
				}
			}
		}

		return discovered;
	} catch (error) {
		context.logger.error(`[Sharetribe] Failed to discover listing ${scope} fields: ${error}`);
		return new Set();
	}
}

// Get listing extended data fields - unified method that reads dataType from context
export async function getListingExtendedDataFields(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	const dataType = (this.getNodeParameter('fieldDeletions.deletions[0].dataType', 0, {
		extractValue: true,
	}) || 'metadata') as string;

	let scope: 'metadata' | 'publicData' | 'privateData';
	switch (dataType) {
		case 'publicData':
			scope = 'publicData';
			break;
		case 'privateData':
			scope = 'privateData';
			break;
		case 'metadata':
		default:
			scope = 'metadata';
			break;
	}

	const fields = await discoverListingExtendedDataFields(this, scope);
	return fieldsToOptions(fields, `${scope}.`, filter);
}

// Discover transaction extended data fields without validation (for deletion)
async function discoverTransactionExtendedDataFields(
	context: ILoadOptionsFunctions,
	scope: 'metadata' | 'protectedData',
): Promise<Set<string>> {
	const sparseFields: IDataObject = {
		'fields.transaction': [scope],
		perPage: 100,
		include: [],
	};

	try {
		const response = await listSearchApiCall<SharetribeApiResponse>(
			context,
			'transactions/query',
			sparseFields,
		);

		const discovered = new Set<string>();

		for (const item of response.data || []) {
			const attributes = item.attributes as IDataObject;
			const extendedData = attributes?.[scope] as IDataObject;

			if (extendedData && typeof extendedData === 'object') {
				const fieldPaths = extractFieldPaths(extendedData);
				for (const path of fieldPaths) {
					discovered.add(`${scope}.${path}`);
				}
			}
		}

		return discovered;
	} catch (error) {
		context.logger.error(`[Sharetribe] Failed to discover transaction ${scope} fields: ${error}`);
		return new Set();
	}
}

// Get transaction extended data fields - unified method that reads dataType from context
export async function getTransactionExtendedDataFields(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	const dataType = (this.getNodeParameter('fieldDeletions.deletions[0].dataType', 0, {
		extractValue: true,
	}) || 'metadata') as string;

	let scope: 'metadata' | 'protectedData';
	switch (dataType) {
		case 'protectedData':
			scope = 'protectedData';
			break;
		case 'metadata':
		default:
			scope = 'metadata';
			break;
	}

	const fields = await discoverTransactionExtendedDataFields(this, scope);
	return fieldsToOptions(fields, `${scope}.`, filter);
}
