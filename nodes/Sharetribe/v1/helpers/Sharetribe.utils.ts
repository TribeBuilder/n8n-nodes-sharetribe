import type {
	IDataObject,
	IExecuteFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
	IPollFunctions,
	IWebhookFunctions,
	INodeProperties,
	INodePropertyOptions,
	INodeListSearchResult,
	INode,
	FieldType,
	NodeExecutionHint,
	IHttpRequestOptions,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError, NodeOperationError, validateFieldType } from 'n8n-workflow';
import { DateTime } from 'luxon';
import set from 'lodash/set';
import {
	QUERY_PARAMS,
	EXTENDED_DATA_TYPES,
	EXTENDED_DATA_PREFIXES,
	API_RESOURCES,
	ApiResource,
	UiResource,
	ExtendedDataType,
	LISTING_RELATIONSHIPS,
	USER_ATTRIBUTE_KEYS,
	LISTING_ATTRIBUTE_KEYS,
	TRANSACTION_ATTRIBUTE_KEYS,
	USER_RELATIONSHIPS,
	TRANSACTION_RELATIONSHIPS,
	STOCK_RELATIONSHIPS,
	AVAILABILITY_EXCEPTION_RELATIONSHIPS,
	EVENT_RELATIONSHIPS,
	USER_ATTRIBUTE_FIELD_MAP,
	RESOURCE_DEFAULTS,
	UI_OPERATIONS,
	UI_RESOURCES,
	RESULT_MODES,
	ENDPOINTS,
	OUTPUT_MODES,
} from './Sharetribe.types';
import type {
	SharetribeApiResponseType,
	SharetribeResource,
	Category,
	ListingCategoriesAssetResponse,
	ListingFieldsAssetResponse,
	ListingTypesAssetResponse,
	ResultMode,
	ResultOptions,
	OutputMode,
	FetchedImage,
	AssetDeliveryResponse,
	SharetribeApiResponse,
	TimeslotResponse,
	UserFieldsAssetResponse,
} from './Sharetribe.types';
import { listSearchApiCall, listSearchAssetCall } from './Sharetribe';
import { getAnonymousMarketplaceToken, clearAnonymousMarketplaceToken, getMarketplaceApiBaseUrl, getAssetApiBaseUrl, getPublicMarketplaceClientId } from '../transport';

export function normalizeGeolocation(
	geolocation: unknown,
): { lat: number; lng: number } | undefined {
	if (!geolocation || geolocation === ',') {
		return undefined;
	}

	const geo = String(geolocation);
	const parts = geo.split(',').map((s) => s.trim());

	if (parts.length === 2 && parts[0] && parts[1]) {
		const lat = parseFloat(parts[0]);
		const lng = parseFloat(parts[1]);

		if (!isNaN(lat) && !isNaN(lng)) {
			return { lat, lng };
		}
	}

	return undefined;
}

export function normalizeOrigin(origin: unknown): string | undefined {
	if (!origin) {
		return undefined;
	}

	if (typeof origin === 'string') {
		const trimmed = origin.trim();
		if (!trimmed || trimmed === ',') {
			return undefined;
		}
		const parts = trimmed.split(',').map((s) => s.trim());
		if (parts.length === 2 && parts[0] && parts[1]) {
			const lat = parseFloat(parts[0]);
			const lng = parseFloat(parts[1]);
			if (!isNaN(lat) && !isNaN(lng)) {
				return `${parts[0]},${parts[1]}`;
			}
		}
		return undefined;
	}

	if (typeof origin === 'object' && origin !== null) {
		const obj = origin as IDataObject;
		if (obj.lat !== undefined && obj.lng !== undefined) {
			const lat = parseFloat(String(obj.lat));
			const lng = parseFloat(String(obj.lng));
			if (!isNaN(lat) && !isNaN(lng)) {
				return `${lat},${lng}`;
			}
		}
	}

	return undefined;
}

export function normalizeBounds(boundsNE: unknown, boundsSW: unknown): string | undefined {
	if (typeof boundsNE === 'string' && typeof boundsSW === 'string') {
		const ne = boundsNE.trim();
		const sw = boundsSW.trim();
		if (!ne || !sw || ne === ',' || sw === ',') {
			return undefined;
		}
		const neParts = ne.split(',').map((s) => s.trim());
		const swParts = sw.split(',').map((s) => s.trim());
		if (
			neParts.length === 2 &&
			neParts[0] &&
			neParts[1] &&
			swParts.length === 2 &&
			swParts[0] &&
			swParts[1]
		) {
			const neLat = parseFloat(neParts[0]);
			const neLng = parseFloat(neParts[1]);
			const swLat = parseFloat(swParts[0]);
			const swLng = parseFloat(swParts[1]);
			if (!isNaN(neLat) && !isNaN(neLng) && !isNaN(swLat) && !isNaN(swLng)) {
				return `${neLat},${neLng},${swLat},${swLng}`;
			}
		}
		return undefined;
	}

	if (
		typeof boundsNE === 'object' &&
		boundsNE !== null &&
		typeof boundsSW === 'object' &&
		boundsSW !== null
	) {
		const ne = boundsNE as IDataObject;
		const sw = boundsSW as IDataObject;
		if (
			ne.lat !== undefined &&
			ne.lng !== undefined &&
			sw.lat !== undefined &&
			sw.lng !== undefined
		) {
			const neLat = parseFloat(String(ne.lat));
			const neLng = parseFloat(String(ne.lng));
			const swLat = parseFloat(String(sw.lat));
			const swLng = parseFloat(String(sw.lng));
			if (!isNaN(neLat) && !isNaN(neLng) && !isNaN(swLat) && !isNaN(swLng)) {
				return `${neLat},${neLng},${swLat},${swLng}`;
			}
		}
	}

	return undefined;
}

export function normalizePrice(
	priceCollection: unknown,
): { amount: number; currency: string } | undefined {
	if (!priceCollection || typeof priceCollection !== 'object') {
		return undefined;
	}

	const priceCol = priceCollection as IDataObject;
	if (!priceCol.priceDetails || typeof priceCol.priceDetails !== 'object') {
		return undefined;
	}

	const priceDetails = priceCol.priceDetails as IDataObject;
	if (priceDetails.amount === undefined || !priceDetails.currency) {
		return undefined;
	}

	let currencyCode: string;
	if (typeof priceDetails.currency === 'object' && priceDetails.currency !== null) {
		const currencyLocator = priceDetails.currency as IDataObject;
		currencyCode = String(currencyLocator.value || '');
	} else {
		currencyCode = String(priceDetails.currency);
	}

	if (!currencyCode) {
		return undefined;
	}

	return {
		amount: Number(priceDetails.amount),
		currency: currencyCode,
	};
}

export function normalizeImages(images: unknown): string[] | undefined {
	if (!images || !Array.isArray(images)) {
		return undefined;
	}

	if (images.length === 0) {
		return [];
	}

	return images.map((img) => String(img));
}

export function addStringField(
	body: IDataObject,
	parsedFields: IDataObject,
	fieldName: string,
	apiFieldName?: string,
): void {
	const value = parsedFields[fieldName];
	if (value !== undefined && value !== null && value !== '') {
		body[apiFieldName || fieldName] = value;
	}
}

export function addExtendedDataFields(body: IDataObject, parsedFields: IDataObject): void {
	const extendedFields = ['publicData', 'privateData', 'metadata'];

	for (const field of extendedFields) {
		if (parsedFields[field]) {
			body[field] = parsedFields[field];
		}
	}
}

export function removeEmptyFields(fields: IDataObject): IDataObject {
	const cleaned: IDataObject = {};

	for (const [key, value] of Object.entries(fields)) {
		if (value !== null && value !== undefined && value !== '') {
			cleaned[key] = value;
		}
	}

	return cleaned;
}

export function parseJsonFields(fields: IDataObject, jsonFieldNames: string[]): IDataObject {
	const parsed: IDataObject = { ...fields };

	for (const fieldName of jsonFieldNames) {
		const fieldValue = fields[fieldName];

		if (typeof fieldValue === 'string' && fieldValue.trim()) {
			try {
				parsed[fieldName] = JSON.parse(fieldValue);
			} catch (error) {
				throw new Error(
					`Invalid JSON in field "${fieldName}": ${error instanceof Error ? error.message : 'Unknown error'}`,
				);
			}
		}
	}

	return parsed;
}

/**
 * Parses an assignment value based on its type.
 * Delegates to n8n-workflow's validateFieldType — the same function
 * the built-in Set node uses for type coercion.
 */
export function parseAssignmentValue(value: unknown, type?: string, fieldName?: string): unknown {
	if (!type || value === null || value === undefined) {
		return value;
	}

	const result = validateFieldType(fieldName || 'field', value, type as FieldType);

	if (!result.valid) {
		throw new Error(result.errorMessage);
	}

	return result.newValue !== undefined ? result.newValue : value;
}

/**
 * Parses a fixedCollection with manual/JSON mode into an IDataObject.
 * Used by transition params and extended data updates.
 *
 * @param values - The inner fixedCollection values containing `mode`, `fields`, `json`
 * @param baseData - Optional base object to merge manual assignments into
 * @returns Parsed IDataObject, or undefined if no values provided
 */
export function parseFixedCollectionValues(
	values: IDataObject,
	baseData?: IDataObject,
): IDataObject | undefined {
	const mode = values.mode as string;

	if (mode === 'json') {
		const jsonValue = values.json;
		if (!jsonValue) return undefined;

		if (typeof jsonValue === 'string') {
			try {
				return JSON.parse(jsonValue) as IDataObject;
			} catch (error) {
				throw new Error(
					`Invalid JSON: ${error instanceof Error ? error.message : 'Unknown error'}`,
				);
			}
		}

		if (typeof jsonValue === 'object') {
			return jsonValue as IDataObject;
		}

		return undefined;
	}

	// Manual mode
	const dotNotation = values.dotNotation !== false; // undefined → true for backwards compat
	const fields = values.fields as IDataObject | undefined;
	const assignments =
		(fields?.assignments as Array<{
			name: string;
			value: unknown;
			type: string;
		}>) || [];

	if (!Array.isArray(assignments) || assignments.length === 0) return undefined;

	const result: IDataObject = baseData || {};
	for (const assignment of assignments) {
		const parsedValue = parseAssignmentValue(assignment.value, assignment.type, assignment.name);
		if (dotNotation) {
			set(result, assignment.name, parsedValue);
		} else {
			result[assignment.name] = parsedValue as IDataObject[keyof IDataObject];
		}
	}

	return result;
}

export function isValidUUID(uuidString: string): boolean {
	const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[45][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
	return uuidRegex.test(uuidString);
}

/**
 * Extracts the Marketplace API Client ID from a Sharetribe marketplace HTML page.
 * Finds window.__PRELOADED_STATE__ and extracts tenant.clientId from it.
 *
 * Handles both formats Sharetribe uses:
 *  - Double-encoded JSON string: window.__PRELOADED_STATE__ = "{\"tenant\":{...}}"
 *  - Raw JS object: window.__PRELOADED_STATE__ = {"tenant":{...}}
 */
export function extractClientIdFromHtml(html: string): string | null {
	const marker = 'window.__PRELOADED_STATE__';
	const markerIdx = html.indexOf(marker);
	if (markerIdx === -1) {
		return null;
	}

	// Find the '=' after the marker
	const eqIdx = html.indexOf('=', markerIdx + marker.length);
	if (eqIdx === -1) {
		return null;
	}

	// Find the closing </script> tag
	const scriptEndIdx = html.indexOf('</script>', eqIdx);
	if (scriptEndIdx === -1) {
		return null;
	}

	// Extract the raw value between '=' and '</script>', trimming whitespace and trailing semicolons
	const rawValue = html
		.substring(eqIdx + 1, scriptEndIdx)
		.trim()
		.replace(/;$/, '');

	try {
		let parsed = JSON.parse(rawValue);

		// Handle double-encoded JSON (value is a string that needs a second parse)
		if (typeof parsed === 'string') {
			parsed = JSON.parse(parsed);
		}

		const clientId = parsed?.tenant?.clientId;
		if (clientId && typeof clientId === 'string' && isValidUUID(clientId)) {
			return clientId;
		}
	} catch {
		return null;
	}

	return null;
}

export function convertToUtcIso8601(datetime: string | Date | DateTime): string {
	if (DateTime.isDateTime(datetime)) {
		// If it's already a DateTime, preserve the time by setting zone to UTC with keepLocalTime
		// This ensures user input stays as UTC without conversion
		const utcDateTime = datetime.setZone('utc', { keepLocalTime: true });
		return utcDateTime.toISO()!;
	}
	if (datetime instanceof Date) {
		return DateTime.fromJSDate(datetime).toUTC().toISO()!;
	}
	return DateTime.fromISO(datetime).toUTC().toISO()!;
}

export function getResourceLocatorValue(resourceLocator: unknown): string | string[] {
	if (!resourceLocator) {
		return '';
	}

	if (typeof resourceLocator === 'string') {
		return resourceLocator;
	}

	if (typeof resourceLocator === 'object' && resourceLocator !== null) {
		const obj = resourceLocator as { mode?: string; value?: string | string[] };

		if (obj.mode === 'list') {
			return Array.isArray(obj.value) ? obj.value : obj.value || '';
		}

		if (obj.mode === 'name') {
			return (obj.value as string) || '';
		}

		const rlObj = resourceLocator as { __rl?: boolean; value?: string };
		if (rlObj.__rl === true && rlObj.value) {
			return String(rlObj.value);
		}
	}

	if (typeof resourceLocator === 'number') {
		return '';
	}

	return String(resourceLocator);
}

export function formatSortParameter(sortOptions: IDataObject): string[] | undefined {
	const sortRules = (sortOptions.sort || []) as IDataObject[];

	if (!Array.isArray(sortRules) || sortRules.length === 0) {
		return undefined;
	}

	const sortFields: string[] = [];

	for (const rule of sortRules) {
		const field = String(rule.field || '');
		const direction = String(rule.direction || 'DESC').toUpperCase();

		if (!field) {
			continue;
		}

		if (direction === 'ASC') {
			sortFields.push(`-${field}`);
		} else {
			sortFields.push(field);
		}
	}

	return sortFields.length > 0 ? sortFields : undefined;
}

export function extractResourceMapperFields(this: IDataObject, parameterName: string): IDataObject {
	const mappedFields = (this[parameterName] as IDataObject) || {};
	return mappedFields;
}

/**
 * Gets API query parameter prefix for extended data field type
 *
 * @param fieldType - The extended data type (metadata, publicData, privateData, protectedData)
 * @returns The corresponding API query parameter prefix
 *
 * @example
 * ```typescript
 * getExtendedDataPrefix(EXTENDED_DATA_TYPES.PUBLIC_DATA) // Returns 'pub_'
 * getExtendedDataPrefix(EXTENDED_DATA_TYPES.METADATA) // Returns 'meta_'
 * ```
 */
export function getExtendedDataPrefix(fieldType: ExtendedDataType): string {
	switch (fieldType) {
		case EXTENDED_DATA_TYPES.METADATA:
			return EXTENDED_DATA_PREFIXES[EXTENDED_DATA_TYPES.METADATA];
		case EXTENDED_DATA_TYPES.PRIVATE_DATA:
			return EXTENDED_DATA_PREFIXES[EXTENDED_DATA_TYPES.PRIVATE_DATA];
		case EXTENDED_DATA_TYPES.PROTECTED_DATA:
			return EXTENDED_DATA_PREFIXES[EXTENDED_DATA_TYPES.PROTECTED_DATA];
		case EXTENDED_DATA_TYPES.PUBLIC_DATA:
		default:
			return EXTENDED_DATA_PREFIXES[EXTENDED_DATA_TYPES.PUBLIC_DATA];
	}
}

/**
 * Builds fields.{type} parameter from selected attributes
 */
export function buildSparseFieldsList(includeOptions: string[], attributeKeys: string[]): string[] {
	const selectedAttributes = includeOptions.filter((key) => attributeKeys.includes(key));
	if (selectedAttributes.length > 0) {
		return ['id', ...selectedAttributes];
	}
	return ['id'];
}

/**
 * Defines all available attribute keys for each resource type
 * These are the fields that can be selected in the sparse fieldsets
 *
 * Uses constants from constants.ts where available, with additional UI-specific fields
 */
const RESOURCE_ATTRIBUTE_KEYS: Record<ApiResource, readonly string[]> = {
	user: [
		...USER_ATTRIBUTE_KEYS,
		'abbreviatedName',
		'bio',
		'categories',
		'deleted',
		'displayName',
		'firstName',
		'identityProviders',
		'lastName',
		'state',
	],
	listing: [
		...LISTING_ATTRIBUTE_KEYS,
		'categories',
		'publicData.categoryLevel1',
		'publicData.categoryLevel2',
		'publicData.categoryLevel3',
	],
	transaction: [...TRANSACTION_ATTRIBUTE_KEYS, 'state'],
	availabilityExceptions: ['start', 'end', 'seats'],
	stockAdjustment: ['at', 'quantity'],
	marketplace: [],
	image: [],
	event: ['sequenceId', 'eventType', 'resourceType', 'resourceId', 'createdAt'],
	timeslot: ['start', 'end', 'seats'],
};

/**
 * Defines all available relationship keys for each resource type
 * These are used in the 'include' parameter
 *
 * Uses constants from constants.ts
 */
const RESOURCE_RELATIONSHIP_KEYS: Record<ApiResource, readonly string[]> = {
	user: Object.values(USER_RELATIONSHIPS),
	listing: Object.values(LISTING_RELATIONSHIPS),
	transaction: Object.values(TRANSACTION_RELATIONSHIPS),
	availabilityExceptions: Object.values(AVAILABILITY_EXCEPTION_RELATIONSHIPS),
	stockAdjustment: Object.values(STOCK_RELATIONSHIPS),
	event: Object.values(EVENT_RELATIONSHIPS),
	marketplace: [],
	image: [],
	timeslot: [],
};

/**
 * Gets attribute keys for a given resource type
 * Returns a mutable copy of the attribute keys array
 */
function getAttributeKeys(resource: ApiResource): string[] {
	const keys = RESOURCE_ATTRIBUTE_KEYS[resource];
	return keys ? [...keys] : [];
}

/**
 * Gets relationship keys for a given resource type
 * Returns a mutable copy of the relationship keys array
 */
function getRelationshipKeys(resource: ApiResource): string[] {
	const keys = RESOURCE_RELATIONSHIP_KEYS[resource];
	return keys ? [...keys] : [];
}

/**
 * Gets the appropriate sparse attribute mapper function for a resource
 */
function getSparseAttributeMapper(
	resource: ApiResource,
): ((attrs: string[]) => string[] | null) | null {
	switch (resource) {
		case API_RESOURCES.USER:
			return sparseAttributesFromNodeParameter;
		case API_RESOURCES.LISTING:
			return sparseListingAttributesFromNodeParameter;
		case API_RESOURCES.TRANSACTION:
			return sparseTransactionAttributesFromNodeParameter;
		case API_RESOURCES.STOCK_ADJUSTMENT:
			return sparseTransactionAttributesFromNodeParameter; // Stock uses transaction mapper
		case API_RESOURCES.AVAILABILITY_EXCEPTIONS:
			return (attrs) => (attrs.length > 0 ? ['id', ...attrs] : null);
		case API_RESOURCES.EVENT:
			return (attrs) => (attrs.length > 0 ? ['id', ...attrs] : null);
		default:
			return null;
	}
}

/**
 * Gets the appropriate query parameter field name for a resource
 */
function getFieldsQueryParam(resource: ApiResource): string | null {
	switch (resource) {
		case API_RESOURCES.USER:
			return QUERY_PARAMS.FIELDS_USER;
		case API_RESOURCES.LISTING:
			return QUERY_PARAMS.FIELDS_LISTING;
		case API_RESOURCES.TRANSACTION:
			return QUERY_PARAMS.FIELDS_TRANSACTION;
		case API_RESOURCES.STOCK_ADJUSTMENT:
			return QUERY_PARAMS.FIELDS_STOCK_ADJUSTMENT;
		case API_RESOURCES.AVAILABILITY_EXCEPTIONS:
			return 'fields.availabilityException';
		case API_RESOURCES.EVENT:
			return 'fields.event';
		default:
			return null;
	}
}

/**
 * Selects attributes based on output mode
 * Returns a mutable array copy of the selected attributes
 */
function selectAttributesByOutputMode(
	node: INode,
	outputMode: string,
	includeOptions: string[],
	resource: ApiResource,
	attributeKeys: string[],
): string[] {
	switch (outputMode) {
		case 'simplified': {
			let defaults: readonly string[];
			switch (resource) {
				case API_RESOURCES.LISTING:
					defaults = RESOURCE_DEFAULTS.listing;
					break;
				case API_RESOURCES.TRANSACTION:
					defaults = RESOURCE_DEFAULTS.transaction;
					break;
				case API_RESOURCES.AVAILABILITY_EXCEPTIONS:
					defaults = RESOURCE_DEFAULTS.availabilityException;
					break;
				case API_RESOURCES.STOCK_ADJUSTMENT:
					defaults = RESOURCE_DEFAULTS.stock;
					break;
				default:
					defaults = RESOURCE_DEFAULTS.user;
			}
			return [...defaults];
		}
		case 'raw':
			return [...attributeKeys];
		case 'selectedFields':
			return includeOptions.filter((key) => attributeKeys.includes(key));
		default:
			throw new NodeOperationError(node, `Unsupported 'Output' mode: ${outputMode}`);
	}
}

/**
 * Add user attributes to query string for relationships
 */
export function addUserAttributesToQueryString(
	context: IExecuteFunctions | ILoadOptionsFunctions,
	qs: IDataObject,
	includeOptions: string[],
	relationshipKey: string,
	resource: UiResource,
	operation: string,
	index: number = 0,
): void {
	if (includeOptions.includes(relationshipKey)) {
		const userAttributes = context.getNodeParameter(
			`userAttributes_${resource}_${operation}`,
			index,
			[],
		) as string[];
		if (userAttributes.length > 0) {
			const mappedAttributes = userAttributes.map((attr) => USER_ATTRIBUTE_FIELD_MAP[attr] || attr);
			qs[QUERY_PARAMS.FIELDS_USER] = ['id', ...mappedAttributes];
		} else {
			qs[QUERY_PARAMS.FIELDS_USER] = ['id'];
		}
	}
}

export const USER_RELATIONSHIP_VALUES: string[] = Object.values(USER_RELATIONSHIPS);

/**
 * Builds result options from node parameters
 * Handles returnAll, countOnly, and limit logic uniformly across all getMany operations
 */
export function buildResultOptions(
	context: IExecuteFunctions,
	itemIndex: number = 0,
): { resultMode: ResultMode; resultOptions: ResultOptions } {
	const returnAll = context.getNodeParameter('returnAll', itemIndex, false) as boolean;
	const countOnly = context.getNodeParameter('countOnly', itemIndex, false) as boolean;
	const limit = context.getNodeParameter('limit', itemIndex, 50) as number;

	let resultMode: ResultMode;
	if (countOnly) {
		resultMode = 'totals';
	} else if (returnAll) {
		resultMode = 'returnAll';
	} else {
		resultMode = 'limit';
	}

	const resultOptions: ResultOptions = {
		mode: resultMode,
	};

	if (!returnAll) {
		resultOptions.limit = limit;
	}

	return { resultMode, resultOptions };
}

/**
 * Builds complete query context from node parameters
 * Fetches all standard parameters and determines output mode/fields for a resource
 */
export function buildQueryContext(
	context: IExecuteFunctions,
	resourceFieldsKey: string,
	itemIndex: number = 0,
): {
	resultMode: ResultMode;
	resultOptions: ResultOptions;
	simplify: boolean;
	options: IDataObject;
	filterOptions: IDataObject;
	sortOptions: IDataObject;
	outputMode: string;
	fieldsToReturn: string[];
} {
	const { resultMode, resultOptions } = buildResultOptions(context, itemIndex);
	const simplify = context.getNodeParameter('simplify', itemIndex, true) as boolean;
	const options = context.getNodeParameter('options', itemIndex, {}) as IDataObject;
	const filterOptions = context.getNodeParameter('filterOptions', itemIndex, {}) as IDataObject;
	const sortOptions = context.getNodeParameter('sort', itemIndex, {}) as IDataObject;

	let outputMode: string;
	let fieldsToReturn: string[] = [];

	if (resultMode === 'totals') {
		outputMode = 'simplified';
	} else if (simplify) {
		outputMode = 'simplified';
	} else {
		outputMode = 'selectedFields';
		const outputFields = options.outputFields as IDataObject | undefined;
		fieldsToReturn = (outputFields?.[resourceFieldsKey] as string[]) || [];
	}

	return {
		resultMode,
		resultOptions,
		simplify,
		options,
		filterOptions,
		sortOptions,
		outputMode,
		fieldsToReturn,
	};
}

/**
 * Builds output configuration for update/create operations
 * Always fetches options but only extracts outputFields when simplify is false
 */
export function buildOutputConfig(
	context: IExecuteFunctions,
	resourceFieldsKey: string,
	itemIndex: number = 0,
): {
	outputMode: OutputMode;
	fieldsToReturn: string[];
	outputFields: IDataObject;
} {
	const simplify = context.getNodeParameter('simplify', itemIndex, true) as boolean;

	if (simplify) {
		return {
			outputMode: OUTPUT_MODES.SIMPLIFIED,
			fieldsToReturn: [],
			outputFields: {},
		};
	}

	const fieldsToReturn =
		(context.getNodeParameter(resourceFieldsKey, itemIndex, []) as string[]) || [];
	return {
		outputMode: OUTPUT_MODES.SELECTED_FIELDS,
		fieldsToReturn,
		outputFields: { [resourceFieldsKey]: fieldsToReturn },
	};
}

/**
 * Builds filter array from transaction filterOptions
 * Handles all transaction-specific filters
 */

/**
 * Builds sort array from sort options
 * Handles listing-specific keyword/origin mutual exclusivity if filterOptions provided
 */
/**
 * SharetribeQueryBuilder - Centralized query parameter builder for Sharetribe API requests
 *
 * Eliminates spaghetti code by handling all relationship and field logic in one place:
 * - Primary resource fields and relationships
 * - Nested relationships (author, customer, provider, etc.)
 * - Nested nested relationships (profileImage, listing.author, etc.)
 * - Sparse fieldsets for all resource types
 *
 * Usage:
 *   const builder = new SharetribeQueryBuilder(node, API_RESOURCES.LISTING, 'selectedFields', fieldsToReturn);
 *   const queryParams = builder.withOptions(options).build();
 */
export class SharetribeQueryBuilder {
	private node: INode;
	private resource: ApiResource;
	private outputMode: string;
	private fieldsToReturn: string[];
	private options: IDataObject;
	private qs: IDataObject;

	constructor(node: INode, resource: ApiResource, outputMode: string, fieldsToReturn: string[]) {
		this.node = node;
		this.resource = resource;
		this.outputMode = outputMode;
		this.fieldsToReturn = fieldsToReturn;
		this.options = {};
		this.qs = {};
	}

	withOptions(options: IDataObject): this {
		this.options = options;
		return this;
	}

	build(): IDataObject {
		this.buildPrimaryResourceParams();
		this.buildNestedRelationships();
		return this.qs;
	}

	private buildPrimaryResourceParams(): void {
		if (!Array.isArray(this.fieldsToReturn)) {
			return;
		}

		const relationshipKeys = getRelationshipKeys(this.resource);
		const relationships = this.fieldsToReturn.filter((key) => relationshipKeys.includes(key));

		if (relationships.length > 0) {
			this.qs[QUERY_PARAMS.INCLUDE] = relationships;
		}

		const attributeKeys = getAttributeKeys(this.resource);
		const selectedAttributes = selectAttributesByOutputMode(
			this.node,
			this.outputMode,
			this.fieldsToReturn,
			this.resource,
			attributeKeys,
		);

		if (selectedAttributes.length > 0) {
			const sparseMapper = getSparseAttributeMapper(this.resource);
			if (sparseMapper) {
				const sparseAttributes = sparseMapper(selectedAttributes);
				if (sparseAttributes) {
					const fieldsParam = getFieldsQueryParam(this.resource);
					if (fieldsParam) {
						this.qs[fieldsParam] = sparseAttributes;
					}
				}
			}
		}
	}

	private buildNestedRelationships(): void {
		switch (this.resource) {
			case API_RESOURCES.LISTING:
				this.buildListingNestedRelationships();
				break;
			case API_RESOURCES.TRANSACTION:
				this.buildTransactionNestedRelationships();
				break;
			case API_RESOURCES.STOCK_ADJUSTMENT:
				this.buildStockNestedRelationships();
				break;
			case API_RESOURCES.AVAILABILITY_EXCEPTIONS:
				this.buildAvailabilityExceptionRelationships();
				break;
		}
	}

	private buildListingNestedRelationships(): void {
		if (!this.fieldsToReturn.includes(LISTING_RELATIONSHIPS.AUTHOR)) {
			return;
		}

		const outputFields = this.options?.outputFields as IDataObject | undefined;
		const authorAttributes = (outputFields?.authorFields as string[]) || [];

		if (authorAttributes.length > 0) {
			const mappedAttributes = authorAttributes.map(
				(attr) => USER_ATTRIBUTE_FIELD_MAP[attr] || attr,
			);

			const userAttributeFields = mappedAttributes.filter(
				(attr) => !USER_RELATIONSHIP_VALUES.includes(attr),
			);
			if (userAttributeFields.length > 0) {
				this.qs[QUERY_PARAMS.FIELDS_USER] = ['id', ...userAttributeFields];
			}

			if (mappedAttributes.includes(USER_RELATIONSHIPS.PROFILE_IMAGE)) {
				this.addToInclude(`author.${USER_RELATIONSHIPS.PROFILE_IMAGE}`);
			}
		} else {
			this.qs[QUERY_PARAMS.FIELDS_USER] = ['id'];
		}
	}

	private buildTransactionNestedRelationships(): void {
		const hasUserRelationships =
			this.fieldsToReturn.includes(TRANSACTION_RELATIONSHIPS.CUSTOMER) ||
			this.fieldsToReturn.includes(TRANSACTION_RELATIONSHIPS.PROVIDER) ||
			this.fieldsToReturn.includes(TRANSACTION_RELATIONSHIPS.LISTING);

		if (hasUserRelationships) {
			this.buildTransactionUserFields();
		}

		if (this.fieldsToReturn.includes(TRANSACTION_RELATIONSHIPS.LISTING)) {
			this.buildTransactionListingFields();
		}
	}

	private buildTransactionUserFields(): void {
		const outputFields = this.options?.outputFields as IDataObject | undefined;
		const userAttributes = (outputFields?.userFields as string[]) || [];

		const listingFields = (outputFields?.listingFields as string[]) || [];
		const hasListingAuthor =
			this.fieldsToReturn.includes(TRANSACTION_RELATIONSHIPS.LISTING) &&
			listingFields.includes('author');

		if (userAttributes.length > 0) {
			const mappedAttributes = userAttributes.map((attr) => USER_ATTRIBUTE_FIELD_MAP[attr] || attr);

			const userAttributeFields = mappedAttributes.filter(
				(attr) => !USER_RELATIONSHIP_VALUES.includes(attr),
			);
			if (userAttributeFields.length > 0) {
				this.qs[QUERY_PARAMS.FIELDS_USER] = ['id', ...userAttributeFields];
			}

			if (mappedAttributes.includes(USER_RELATIONSHIPS.PROFILE_IMAGE)) {
				if (this.fieldsToReturn.includes(TRANSACTION_RELATIONSHIPS.CUSTOMER)) {
					this.addToInclude(`customer.${USER_RELATIONSHIPS.PROFILE_IMAGE}`);
				}
				if (this.fieldsToReturn.includes(TRANSACTION_RELATIONSHIPS.PROVIDER)) {
					this.addToInclude(`provider.${USER_RELATIONSHIPS.PROFILE_IMAGE}`);
				}
				if (hasListingAuthor) {
					this.addToInclude(`listing.author.${USER_RELATIONSHIPS.PROFILE_IMAGE}`);
				}
			}
		} else {
			this.qs[QUERY_PARAMS.FIELDS_USER] = ['id'];
		}
	}

	private buildTransactionListingFields(): void {
		const outputFields = this.options?.outputFields as IDataObject | undefined;
		const listingAttributes = (outputFields?.listingFields as string[]) || [];

		if (listingAttributes.length > 0) {
			const regularFields = listingAttributes.filter(
				(attr) => attr !== 'images' && attr !== 'currentStock' && attr !== 'author',
			);

			if (regularFields.length > 0) {
				const mappedFields = sparseListingAttributesFromNodeParameter(regularFields);
				if (mappedFields && mappedFields.length > 0) {
					this.qs[QUERY_PARAMS.FIELDS_LISTING] = mappedFields;
				}
			}

			if (listingAttributes.includes('images')) {
				this.addToInclude('listing.images');
			}

			if (listingAttributes.includes('currentStock')) {
				this.addToInclude('listing.currentStock');
			}

			if (listingAttributes.includes('author')) {
				this.addToInclude('listing.author');
			}
		} else {
			this.qs[QUERY_PARAMS.FIELDS_LISTING] = ['id'];
		}
	}

	private buildStockNestedRelationships(): void {
		const outputFields = this.options?.outputFields as IDataObject | undefined;
		const stockFields = (outputFields?.stockFields as string[]) || [];

		if (stockFields.includes(STOCK_RELATIONSHIPS.LISTING)) {
			this.buildStockListingFields();
		}

		if (stockFields.includes(STOCK_RELATIONSHIPS.TRANSACTION)) {
			this.buildStockTransactionFields();
		}

		if (stockFields.includes('stockReservation')) {
			this.buildStockReservationFields();
		}
	}

	private buildAvailabilityExceptionRelationships(): void {
		const outputFields = this.options?.outputFields as IDataObject | undefined;
		const availabilityExceptionFields =
			(outputFields?.availabilityExceptionFields as string[]) || [];

		if (availabilityExceptionFields.includes('listing')) {
			this.buildAvailabilityExceptionListingFields();
		}
	}

	private buildAvailabilityExceptionListingFields(): void {
		const outputFields = this.options?.outputFields as IDataObject | undefined;
		const listingFields = (outputFields?.listingFields as string[]) || [];

		if (listingFields.length > 0) {
			const mappedFields = sparseListingAttributesFromNodeParameter(listingFields);
			if (mappedFields && mappedFields.length > 0) {
				this.qs[QUERY_PARAMS.FIELDS_LISTING] = mappedFields;
			}
		} else {
			this.qs[QUERY_PARAMS.FIELDS_LISTING] = ['id'];
		}
	}

	private buildStockListingFields(): void {
		const outputFields = this.options?.outputFields as IDataObject | undefined;
		const listingFields = (outputFields?.listingFields as string[]) || [];

		if (listingFields.length > 0) {
			const regularFields = listingFields.filter(
				(attr) => attr !== 'images' && attr !== 'currentStock' && attr !== 'author',
			);

			if (regularFields.length > 0) {
				const mappedFields = sparseListingAttributesFromNodeParameter(regularFields);
				if (mappedFields && mappedFields.length > 0) {
					this.qs[QUERY_PARAMS.FIELDS_LISTING] = mappedFields;
				}
			}

			if (listingFields.includes('currentStock')) {
				this.addToInclude('listing.currentStock');
			}

			if (listingFields.includes('author')) {
				this.addToInclude('listing.author');

				const userFields = (outputFields?.userFields as string[]) || [];
				if (userFields.length > 0) {
					const mappedAttributes = userFields.map((attr) => USER_ATTRIBUTE_FIELD_MAP[attr] || attr);
					const userAttributeFields = mappedAttributes.filter(
						(attr) => !USER_RELATIONSHIP_VALUES.includes(attr),
					);
					if (userAttributeFields.length > 0) {
						this.qs[QUERY_PARAMS.FIELDS_USER] = ['id', ...userAttributeFields];
					}

					if (mappedAttributes.includes(USER_RELATIONSHIPS.PROFILE_IMAGE)) {
						this.addToInclude(`listing.author.${USER_RELATIONSHIPS.PROFILE_IMAGE}`);
					}
				} else {
					this.qs[QUERY_PARAMS.FIELDS_USER] = ['id'];
				}
			}
		} else {
			this.qs[QUERY_PARAMS.FIELDS_LISTING] = ['id'];
		}
	}

	private buildStockTransactionFields(): void {
		const outputFields = this.options?.outputFields as IDataObject | undefined;
		const transactionFields = (outputFields?.transactionFields as string[]) || [];

		if (transactionFields.length > 0) {
			const regularFields = transactionFields.filter(
				(attr) => attr !== 'customer' && attr !== 'provider' && attr !== 'listing',
			);

			if (regularFields.length > 0) {
				const mappedFields = sparseTransactionAttributesFromNodeParameter(regularFields);
				if (mappedFields && mappedFields.length > 0) {
					this.qs[QUERY_PARAMS.FIELDS_TRANSACTION] = mappedFields;
				}
			}

			const hasCustomer = transactionFields.includes('customer');
			const hasProvider = transactionFields.includes('provider');

			if (hasCustomer || hasProvider) {
				const userFields = (outputFields?.userFields as string[]) || [];
				if (userFields.length > 0) {
					const mappedAttributes = userFields.map((attr) => USER_ATTRIBUTE_FIELD_MAP[attr] || attr);
					const userAttributeFields = mappedAttributes.filter(
						(attr) => !USER_RELATIONSHIP_VALUES.includes(attr),
					);
					if (userAttributeFields.length > 0) {
						this.qs[QUERY_PARAMS.FIELDS_USER] = ['id', ...userAttributeFields];
					}

					if (mappedAttributes.includes(USER_RELATIONSHIPS.PROFILE_IMAGE)) {
						if (hasCustomer) {
							this.addToInclude('stockReservation.transaction.customer.profileImage');
						}
						if (hasProvider) {
							this.addToInclude('stockReservation.transaction.provider.profileImage');
						}
					}
				} else {
					this.qs[QUERY_PARAMS.FIELDS_USER] = ['id'];
				}

				if (hasCustomer) {
					this.addToInclude('stockReservation.transaction.customer');
				}
				if (hasProvider) {
					this.addToInclude('stockReservation.transaction.provider');
				}
			}

			if (transactionFields.includes('listing')) {
				this.addToInclude('stockReservation.transaction.listing');
			}
		} else {
			this.qs[QUERY_PARAMS.FIELDS_TRANSACTION] = ['id'];
		}
	}

	private buildStockReservationFields(): void {
		const outputFields = this.options?.outputFields as IDataObject | undefined;
		const transactionFields = (outputFields?.transactionFields as string[]) || [];

		const hasCustomer = transactionFields.includes('customer');
		const hasProvider = transactionFields.includes('provider');

		if (hasCustomer || hasProvider) {
			const userFields = (outputFields?.userFields as string[]) || [];
			if (userFields.length > 0) {
				const mappedAttributes = userFields.map((attr) => USER_ATTRIBUTE_FIELD_MAP[attr] || attr);
				const userAttributeFields = mappedAttributes.filter(
					(attr) => !USER_RELATIONSHIP_VALUES.includes(attr),
				);
				if (userAttributeFields.length > 0) {
					this.qs[QUERY_PARAMS.FIELDS_USER] = ['id', ...userAttributeFields];
				}

				if (mappedAttributes.includes(USER_RELATIONSHIPS.PROFILE_IMAGE)) {
					if (hasCustomer) {
						this.addToInclude('transaction.customer.profileImage');
					}
					if (hasProvider) {
						this.addToInclude('transaction.provider.profileImage');
					}
				}
			} else {
				this.qs[QUERY_PARAMS.FIELDS_USER] = ['id'];
			}

			if (hasCustomer) {
				this.addToInclude('transaction.customer');
			}
			if (hasProvider) {
				this.addToInclude('transaction.provider');
			}
		}
	}

	private addToInclude(path: string): void {
		const existingInclude = this.qs[QUERY_PARAMS.INCLUDE] as string[] | undefined;
		if (existingInclude) {
			if (!existingInclude.includes(path)) {
				existingInclude.push(path);
			}
		} else {
			this.qs[QUERY_PARAMS.INCLUDE] = [path];
		}
	}
}

export const sparseAttributesFromNodeParameter = (
	attributesToReturn: string[],
): string[] | null => {
	const sparseAttributes = ['id'];

	if (Array.isArray(attributesToReturn) && attributesToReturn.length) {
		const FIELD_MAP: Record<string, string> = {
			deleted: 'deleted',
			state: 'state',
			createdAt: 'createdAt',
			email: 'email',
			emailVerified: 'emailVerified',
			identityProviders: 'identityProviders',
			metadata: 'profile.metadata',
			pendingEmail: 'pendingEmail',
			permissions: 'permissions',
			stripeConnected: 'stripeConnected',
			firstName: 'profile.firstName',
			lastName: 'profile.lastName',
			displayName: 'profile.displayName',
			abbreviatedName: 'profile.abbreviatedName',
			bio: 'profile.bio',
			publicData: 'profile.publicData',
			protectedData: 'profile.protectedData',
			privateData: 'profile.privateData',
			userType: 'profile.publicData.userType',
		};

		const mapped =
			attributesToReturn.map((k) => FIELD_MAP[k]).filter((v): v is string => Boolean(v)) ?? [];

		if (mapped.length) {
			sparseAttributes.push(...mapped);
		}
	}
	return sparseAttributes;
};

export const sparseListingAttributesFromNodeParameter = (
	attributesToReturn: string[],
): string[] | null => {
	const sparseAttributes = ['id'];

	if (Array.isArray(attributesToReturn) && attributesToReturn.length) {
		// Per API doc, listing ATTRIBUTES (not relationships):
		// title, description, geolocation, createdAt, price, availabilityPlan,
		// publicData, privateData, metadata, state, deleted
		// Note: author, images, currentStock, marketplace are RELATIONSHIPS
		const FIELD_MAP: Record<string, string> = {
			availabilityPlan: 'availabilityPlan',
			categories: 'categories',
			createdAt: 'createdAt',
			deleted: 'deleted',
			description: 'description',
			geolocation: 'geolocation',
			listingType: 'listingType',
			metadata: 'metadata',
			price: 'price',
			privateData: 'privateData',
			publicData: 'publicData',
			state: 'state',
			timezone: 'timezone',
			title: 'title',
		};

		let mapped =
			attributesToReturn.map((k) => FIELD_MAP[k]).filter((v): v is string => Boolean(v)) ?? [];
		if (attributesToReturn.includes('categories')) {
			mapped = mapped.filter((field) => field !== 'categories');
			mapped.push(
				...['publicData.categoryLevel1', 'publicData.categoryLevel2', 'publicData.categoryLevel3'],
			);
		}

		if (attributesToReturn.includes('listingType')) {
			mapped = mapped.filter((field) => field !== 'listingType');
			mapped.push('publicData.listingType');
		}

		if (attributesToReturn.includes('timezone')) {
			mapped = mapped.filter((field) => field !== 'timezone');
			mapped.push('availabilityPlan.timezone');
		}
		if (mapped.length) {
			sparseAttributes.push(...mapped);
		}
	}
	return sparseAttributes;
};

export const sparseTransactionAttributesFromNodeParameter = (
	attributesToReturn: string[],
): string[] | null => {
	const sparseAttributes = ['id'];

	if (Array.isArray(attributesToReturn) && attributesToReturn.length) {
		// Per API doc, transaction ATTRIBUTES (not relationships):
		// createdAt, processName, processVersion, lastTransition, lastTransitionedAt, state,
		// lineItems, payinTotal, payoutTotal, protectedData, metadata, transitions
		// Note: marketplace, listing, provider, customer, booking, stockReservation, reviews, messages are RELATIONSHIPS
		const FIELD_MAP: Record<string, string> = {
			createdAt: 'createdAt',
			lastTransition: 'lastTransition',
			lastTransitionedAt: 'lastTransitionedAt',
			lineItems: 'lineItems',
			metadata: 'metadata',
			payinTotal: 'payinTotal',
			payoutTotal: 'payoutTotal',
			processName: 'processName',
			processVersion: 'processVersion',
			protectedData: 'protectedData',
			state: 'state',
			transitions: 'transitions',
		};

		const mapped =
			attributesToReturn.map((k) => FIELD_MAP[k]).filter((v): v is string => Boolean(v)) ?? [];

		if (mapped.length) {
			sparseAttributes.push(...mapped);
		}
	}
	return sparseAttributes;
};

/**
 * Normalizes Sharetribe API response format to flatten the data structure.
 * Converts nested {data: {id, type, attributes, relationships}} format to flat objects.
 * Also processes included relationships and embeds them into the main data.
 *
 * @param responseData - Raw response from Sharetribe API (JSON:API format or raw array/object)
 * @returns Array of normalized data objects with id, type, and flattened attributes
 */
export const flattenSharetribeResponse = (
	responseData: SharetribeApiResponseType | IDataObject[] | IDataObject,
): IDataObject[] => {
	// Handle array responses (raw data arrays from aggregated pagination)
	if (Array.isArray(responseData)) {
		return responseData.map((item) => normalizeSharetribeItem(item, []));
	}

	// Handle object responses with JSON:API structure
	if (responseData && typeof responseData === 'object') {
		const included = (responseData as SharetribeApiResponseType).included || [];

		if ('data' in responseData && responseData.data) {
			if (Array.isArray(responseData.data)) {
				return responseData.data.map((item) =>
					normalizeSharetribeItem(item as SharetribeResource | IDataObject, included),
				);
			} else {
				return [
					normalizeSharetribeItem(responseData.data as SharetribeResource | IDataObject, included),
				];
			}
		}

		// Handle single resource without data wrapper (edge case)
		if ('id' in responseData && 'type' in responseData) {
			return [normalizeSharetribeItem(responseData as unknown as SharetribeResource, included)];
		}
	}

	return [responseData as IDataObject];
};

/**
 * Normalizes a single Sharetribe item and resolves included relationships.
 * Flattens the structure by moving attributes to root level and resolving
 * relationship references to actual included data.
 *
 * @param item - Single resource from Sharetribe API (JSON:API resource object)
 * @param included - Array of included relationship objects
 * @returns Normalized flat object
 */
const normalizeSharetribeItem = (
	item: SharetribeResource | IDataObject,
	included: SharetribeResource[] | IDataObject[] = [],
): IDataObject => {
	if (!item || typeof item !== 'object') {
		return item as IDataObject;
	}

	// Handle nested data wrapper (when item has a 'data' property that is also a resource)
	if ('data' in item && item.data && typeof item.data === 'object') {
		return normalizeSharetribeItem(item.data as SharetribeResource | IDataObject, included);
	}

	const normalized: IDataObject = {};

	// Always include id and type at root level
	if ('id' in item && item.id) {
		normalized.id = item.id;
	}

	if ('type' in item && item.type) {
		normalized.type = item.type;
	}

	// Flatten attributes to root level
	if ('attributes' in item && item.attributes && typeof item.attributes === 'object') {
		Object.assign(normalized, item.attributes);
	}

	// Process relationships - resolve references to included data
	if ('relationships' in item && item.relationships && typeof item.relationships === 'object') {
		for (const [relationshipKey, relationshipValue] of Object.entries(item.relationships)) {
			if (relationshipValue && typeof relationshipValue === 'object') {
				// Check if relationship has a 'data' property (even if null)
				if ('data' in relationshipValue) {
					const relData = (relationshipValue as IDataObject).data;

					if (relData === null) {
						// Preserve null relationships in output
						normalized[relationshipKey] = null;
					} else if (Array.isArray(relData)) {
						// Handle array relationships
						normalized[relationshipKey] = relData.map((ref) =>
							findAndNormalizeIncluded(ref as SharetribeResource | IDataObject, included),
						);
					} else {
						// Handle single relationship
						normalized[relationshipKey] = findAndNormalizeIncluded(
							relData as SharetribeResource | IDataObject,
							included,
						);
					}
				}
			}
		}
	}

	return normalized;
};

/**
 * Finds an included item by id and type, then normalizes it.
 * If not found in included array, returns the reference as-is.
 *
 * @param reference - Resource identifier with id and type
 * @param included - Array of included resources to search
 * @returns Normalized included object or original reference
 */
const findAndNormalizeIncluded = (
	reference: SharetribeResource | IDataObject,
	included: SharetribeResource[] | IDataObject[],
): IDataObject => {
	if (!reference || typeof reference !== 'object') {
		return reference as IDataObject;
	}

	if (!('id' in reference) || !('type' in reference)) {
		return reference;
	}

	// Find the matching included item
	const includedItem = included.find(
		(item) =>
			'id' in item && 'type' in item && item.id === reference.id && item.type === reference.type,
	);

	if (includedItem) {
		// Recursively normalize the included item with full included array to resolve nested relationships
		return normalizeSharetribeItem(includedItem, included);
	}

	// Return reference if not found in included (cast to IDataObject for compatibility)
	return reference as IDataObject;
};

/**
 * Resolves _ref objects in asset data by looking them up in the included array
 * Used by Asset Delivery API which uses _ref instead of standard JSON:API relationships
 *
 * @param data - Asset data that may contain _ref objects
 * @param included - Array of included resources
 * @returns Data with _ref objects resolved to actual included resources
 */
export const resolveAssetReferences = (
	data: IDataObject | IDataObject[],
	included: IDataObject[] = [],
): IDataObject | IDataObject[] => {
	if (Array.isArray(data)) {
		return data.map((item) => resolveAssetReferences(item, included) as IDataObject);
	}

	if (!data || typeof data !== 'object') {
		return data;
	}

	// Check if this is a _ref object
	if ('_ref' in data && typeof data._ref === 'object') {
		const ref = data._ref as IDataObject;
		if ('id' in ref && 'type' in ref) {
			// Find matching included item
			const includedItem = included.find((item) => item.id === ref.id && item.type === ref.type);
			if (includedItem) {
				// Normalize the included item (flatten attributes)
				return normalizeSharetribeItem(includedItem as unknown as SharetribeResource, []);
			}
		}
		// Return the ref as-is if not found
		return data;
	}

	// Recursively process all properties
	const resolved: IDataObject = {};
	for (const [key, value] of Object.entries(data)) {
		if (value && typeof value === 'object') {
			resolved[key] = resolveAssetReferences(value as IDataObject, included);
		} else {
			resolved[key] = value;
		}
	}

	return resolved;
};

/**
 * Validates that end time is after start time and throws a NodeOperationError if not.
 *
 * This is used for operations that accept time ranges (availability exceptions, stock adjustments)
 * to ensure the time range is valid before making API requests.
 *
 * @param context - The n8n execution context (IExecuteFunctions)
 * @param itemIndex - The item index from the node execution (used for error context)
 * @param start - The start date/time string (ISO 8601 format)
 * @param end - The end date/time string (ISO 8601 format)
 * @param resourceName - Human-readable resource name for error messages (e.g., 'availability exception', 'stock adjustment')
 * @throws NodeOperationError if end time is not after start time
 *
 * @example
 * ```typescript
 * const start = this.getNodeParameter('start', index) as string;
 * const end = this.getNodeParameter('end', index) as string;
 * validateStartEndTimes(this, index, start, end, 'availability exception');
 * ```
 */
export function validateStartEndTimes(
	context: IExecuteFunctions,
	itemIndex: number,
	start: string,
	end: string,
	resourceName: string,
): void {
	const startDate = new Date(start);
	const endDate = new Date(end);

	if (endDate <= startDate) {
		throw new NodeOperationError(context.getNode(), `Invalid time range for ${resourceName}`, {
			itemIndex,
			description: `End time must be after start time.<br><br>Received start: ${start}<br>Received end: ${end}`,
		});
	}
}

/**
 * Validates that a number is a non-negative integer.
 *
 * This is commonly used for stock quantities, seat counts, and other discrete quantities
 * that cannot be negative or fractional.
 *
 * @param context - The n8n execution context (IExecuteFunctions)
 * @param itemIndex - The item index from the node execution (used for error context)
 * @param value - The number to validate
 * @param fieldName - Human-readable field name for error messages (e.g., 'quantity', 'seats', 'stock')
 * @throws NodeOperationError if value is negative or not an integer
 *
 * @example
 * ```typescript
 * const seats = this.getNodeParameter('seats', index) as number;
 * validatePositiveInteger(this, index, seats, 'seats');
 * ```
 */
export function validatePositiveInteger(
	context: IExecuteFunctions,
	itemIndex: number,
	options: { value: number; fieldName: string },
): void {
	const { value, fieldName } = options;

	if (value < 0) {
		throw new NodeOperationError(context.getNode(), `Invalid ${fieldName} value`, {
			itemIndex,
			description: `${fieldName} cannot be negative.<br><br>Received: ${value}<br>Expected: 0 or greater`,
		});
	}
	if (!Number.isInteger(value)) {
		throw new NodeOperationError(context.getNode(), `Invalid ${fieldName} value`, {
			itemIndex,
			description: `${fieldName} must be a whole number (no decimals).<br><br>Received: ${value}`,
		});
	}
}

/**
 * Validates that a number is an integer (can be positive, negative, or zero).
 *
 * This is used for quantities that can be negative (like stock adjustments)
 * but must be whole numbers.
 *
 * @param context - The n8n execution context (IExecuteFunctions)
 * @param itemIndex - The item index from the node execution (used for error context)
 * @param value - The number to validate
 * @param fieldName - Human-readable field name for error messages (e.g., 'quantity adjustment')
 * @throws NodeOperationError if value is not an integer
 *
 * @example
 * ```typescript
 * const quantity = this.getNodeParameter('quantity', index) as number;
 * validateInteger(this, index, quantity, 'quantity');
 * ```
 */
export function validateInteger(
	context: IExecuteFunctions,
	itemIndex: number,
	value: number,
	fieldName: string,
): void {
	if (!Number.isInteger(value)) {
		throw new NodeOperationError(context.getNode(), `Invalid ${fieldName} value`, {
			itemIndex,
			description: `${fieldName} must be a whole number (no decimals).<br><br>Received: ${value}`,
		});
	}
}

/**
 * Validates that seats is greater than 0 when available is true.
 *
 * Used for availability exception creation where available=true requires seats > 0.
 *
 * @param context - The n8n execution context (IExecuteFunctions)
 * @param itemIndex - The item index from the node execution (used for error context)
 * @param seats - The number of seats
 * @throws NodeOperationError if seats is 0 or less
 *
 * @example
 * ```typescript
 * const seats = this.getNodeParameter('seats', i) as number;
 * validateSeatsGreaterThanZero(this, i, seats);
 * ```
 */

/**
 * Validates that a stock adjustment quantity is non-zero.
 * According to Sharetribe API: "It is not possible to create stock adjustments with 0 quantity"
 *
 * @param context - The n8n execution context
 * @param itemIndex - The item index for error context
 * @param quantity - The adjustment quantity to validate
 * @throws NodeOperationError if quantity is 0
 */
export function validateStockAdjustmentQuantity(
	context: IExecuteFunctions,
	itemIndex: number,
	quantity: number,
): void {
	validateInteger(context, itemIndex, quantity, 'adjustment quantity');

	if (quantity === 0) {
		throw new NodeOperationError(context.getNode(), 'Invalid stock adjustment quantity', {
			itemIndex,
			description:
				'Stock adjustment quantity cannot be 0.<br><br>Use a positive number to increase stock or a negative number to decrease stock.<br><br>Note: Stock adjustments with 0 quantity are not allowed by the Sharetribe API.',
		});
	}
}

/**
 * Validates time range for stock adjustments query.
 * According to Sharetribe API:
 * - Start time must be between 366 days in the past and 1 day in the future
 * - End time must be after start time and at most 1 day in the future
 * - End time must be at most 366 days from start time
 *
 * @param context - The n8n execution context
 * @param itemIndex - The item index for error context
 * @param createdAfter - Start timestamp (ISO 8601)
 * @param createdBefore - End timestamp (ISO 8601)
 */

/**
 * Validates time range for availability exceptions query.
 * According to Sharetribe API:
 * - Start and end must be between 366 days in the past and 366 days in the future
 * - End must be after start
 * - End must be at most 366 days after start
 *
 * @param context - The n8n execution context
 * @param itemIndex - The item index for error context
 * @param start - Start DateTime object (will be converted to UTC ISO8601)
 * @param end - End DateTime object (will be converted to UTC ISO8601)
 */
export function validateAvailabilityExceptionTimeRange(
	context: IExecuteFunctions,
	itemIndex: number,
	start: DateTime,
	end: DateTime,
): void {
	const startDateTime = start.toUTC();
	const endDateTime = end.toUTC();

	// Validate times are between 366 days past and 366 days future
	const past366Days = DateTime.utc().minus({ days: 366 });
	const future366Days = DateTime.utc().plus({ days: 366 });

	if (startDateTime < past366Days || startDateTime > future366Days) {
		const allowedRange = `${past366Days.toFormat('yyyy-MM-dd HH:mm:ss')} to ${future366Days.toFormat('yyyy-MM-dd HH:mm:ss')} UTC`;
		throw new NodeOperationError(
			context.getNode(),
			'Invalid start time for availability exception',
			{
				itemIndex,
				description: `Start time must be between 366 days in the past and 366 days in the future.<br><br>Received: ${startDateTime.toFormat('yyyy-MM-dd HH:mm:ss')} UTC<br>Allowed range: ${allowedRange}`,
			},
		);
	}

	if (endDateTime < past366Days || endDateTime > future366Days) {
		const allowedRange = `${past366Days.toFormat('yyyy-MM-dd HH:mm:ss')} to ${future366Days.toFormat('yyyy-MM-dd HH:mm:ss')} UTC`;
		throw new NodeOperationError(context.getNode(), 'Invalid end time for availability exception', {
			itemIndex,
			description: `End time must be between 366 days in the past and 366 days in the future.<br><br>Received: ${endDateTime.toFormat('yyyy-MM-dd HH:mm:ss')} UTC<br>Allowed range: ${allowedRange}`,
		});
	}

	// Validate end is after start
	if (endDateTime <= startDateTime) {
		throw new NodeOperationError(context.getNode(), 'End time must be after start time', {
			itemIndex,
			description: `End time must be later than start time.<br><br>Received start: ${startDateTime.toFormat('yyyy-MM-dd HH:mm:ss')} UTC<br>Received end: ${endDateTime.toFormat('yyyy-MM-dd HH:mm:ss')} UTC`,
		});
	}

	// Validate end is at most 366 days from start
	const max366DaysFromStart = startDateTime.plus({ days: 366 });

	if (endDateTime > max366DaysFromStart) {
		const rangeInDays = Math.floor(endDateTime.diff(startDateTime, 'days').days);
		throw new NodeOperationError(context.getNode(), 'Time range exceeds maximum allowed duration', {
			itemIndex,
			description: `The time range between start and end cannot exceed 366 days.<br><br>Received start: ${startDateTime.toFormat('yyyy-MM-dd HH:mm:ss')} UTC<br>Received end: ${endDateTime.toFormat('yyyy-MM-dd HH:mm:ss')} UTC<br>Range: ${rangeInDays} days<br><br>Maximum allowed: 366 days`,
		});
	}
}

/**
 * Validates time range for timeslot queries.
 * According to Sharetribe API:
 * - Start must be at most 1 day in the past and 366 days in the future
 * - End must be at most 366 days in the future
 * - End must be after start
 * - Range must be at most 90 days
 *
 * A 1-day buffer is added to past/future checks to account for timezone
 * differences between the user's browser and UTC.
 *
 * @param context - The n8n execution context
 * @param start - Start DateTime object
 * @param end - End DateTime object
 */
export function validateTimeslotTimeRange(
	context: IExecuteFunctions,
	start: DateTime,
	end: DateTime,
): void {
	const startDateTime = start.toUTC();
	const endDateTime = end.toUTC();
	const now = DateTime.utc();

	if (endDateTime <= startDateTime) {
		throw new NodeOperationError(context.getNode(), 'End date/time must be after start date/time', {
			description: `Received start: ${startDateTime.toFormat('yyyy-MM-dd HH:mm:ss')} UTC<br>Received end: ${endDateTime.toFormat('yyyy-MM-dd HH:mm:ss')} UTC`,
		});
	}

	// Allow 1-day buffer for timezone drift
	const daysPastStart = now.diff(startDateTime, 'days').days;
	if (daysPastStart > 2) {
		throw new NodeOperationError(
			context.getNode(),
			'Start date cannot be more than 1 day in the past',
			{
				description: `Received: ${startDateTime.toFormat('yyyy-MM-dd HH:mm:ss')} UTC`,
			},
		);
	}

	const daysFutureStart = startDateTime.diff(now, 'days').days;
	if (daysFutureStart > 367) {
		throw new NodeOperationError(
			context.getNode(),
			'Start date cannot be more than 366 days in the future',
			{
				description: `Received: ${startDateTime.toFormat('yyyy-MM-dd HH:mm:ss')} UTC`,
			},
		);
	}

	const daysFutureEnd = endDateTime.diff(now, 'days').days;
	if (daysFutureEnd > 367) {
		throw new NodeOperationError(
			context.getNode(),
			'End date cannot be more than 366 days in the future',
			{
				description: `Received: ${endDateTime.toFormat('yyyy-MM-dd HH:mm:ss')} UTC`,
			},
		);
	}

	const rangeSpanDays = endDateTime.diff(startDateTime, 'days').days;
	if (rangeSpanDays > 90) {
		throw new NodeOperationError(context.getNode(), 'Date range cannot exceed 90 days', {
			description: `Received start: ${startDateTime.toFormat('yyyy-MM-dd HH:mm:ss')} UTC<br>Received end: ${endDateTime.toFormat('yyyy-MM-dd HH:mm:ss')} UTC<br>Range: ${Math.floor(rangeSpanDays)} days`,
		});
	}
}

/**
 * Validates the availability filter date range for listing queries.
 * According to Sharetribe API:
 * - Start must be at most 1 day in the past and 365 days in the future
 * - End must be after start
 * - End must be at most 365 days in the future
 * - End must be at most 90 days after start
 *
 * A 1-day buffer is added to past/future checks to account for timezone
 * differences between the user's browser and UTC.
 *
 * @param context - The n8n execution context
 * @param start - Start DateTime (UTC)
 * @param end - End DateTime (UTC)
 */
export function validateListingAvailabilityFilterRange(
	context: IExecuteFunctions,
	start: DateTime,
	end: DateTime,
): void {
	const startDateTime = start.toUTC();
	const endDateTime = end.toUTC();
	const now = DateTime.utc();

	if (endDateTime <= startDateTime) {
		throw new NodeOperationError(context.getNode(), 'End date/time must be after start date/time', {
			description: `Received start: ${startDateTime.toFormat('yyyy-MM-dd HH:mm:ss')} UTC<br>Received end: ${endDateTime.toFormat('yyyy-MM-dd HH:mm:ss')} UTC`,
		});
	}

	// Allow 1-day buffer for timezone drift
	const daysPastStart = now.diff(startDateTime, 'days').days;
	if (daysPastStart > 2) {
		throw new NodeOperationError(
			context.getNode(),
			'Start date cannot be more than 1 day in the past',
			{
				description: `Received: ${startDateTime.toFormat('yyyy-MM-dd HH:mm:ss')} UTC`,
			},
		);
	}

	const daysFutureStart = startDateTime.diff(now, 'days').days;
	if (daysFutureStart > 366) {
		throw new NodeOperationError(
			context.getNode(),
			'Start date cannot be more than 365 days in the future',
			{
				description: `Received: ${startDateTime.toFormat('yyyy-MM-dd HH:mm:ss')} UTC`,
			},
		);
	}

	const daysFutureEnd = endDateTime.diff(now, 'days').days;
	if (daysFutureEnd > 366) {
		throw new NodeOperationError(
			context.getNode(),
			'End date cannot be more than 365 days in the future',
			{
				description: `Received: ${endDateTime.toFormat('yyyy-MM-dd HH:mm:ss')} UTC`,
			},
		);
	}

	const rangeSpanDays = endDateTime.diff(startDateTime, 'days').days;
	if (rangeSpanDays > 90) {
		throw new NodeOperationError(context.getNode(), 'Date range cannot exceed 90 days', {
			description: `Received start: ${startDateTime.toFormat('yyyy-MM-dd HH:mm:ss')} UTC<br>Received end: ${endDateTime.toFormat('yyyy-MM-dd HH:mm:ss')} UTC<br>Range: ${Math.floor(rangeSpanDays)} days`,
		});
	}
}

/**
 * Builds include relationships and fields parameters for stock-related queries
 * Handles listing, listing.currentStock, transaction, and user relationships
 *
 * @param context - The n8n execution context
 * @param index - The current execution index
 * @param responseConfig - Array of selected response attributes
 * @param transactionPath - Path to transaction (e.g., 'transaction' or 'stockReservation.transaction')
 * @param parameterNamePrefix - Prefix for parameter names (e.g., 'stockQuery' or 'stockShowReservation')
 * @returns Object with includeRelationships array and qs (query string) object
 */

/**
 * Handles date range filtering with support for exact, range, before, and after modes
 *
 * @param filter - The filter object containing the date range configuration
 * @param fieldName - The base field name (e.g., 'bookingStart', 'bookingEnd')
 * @returns ISO 8601 formatted date string or range string, or undefined if no valid date
 */
/**
 * Handles extended data filters (metadata, publicData, privateData, protectedData)
 *
 * @param filter - The filter object
 * @param dataType - Type of extended data ('metadata', 'publicData', 'privateData', 'protectedData')
 * @param node - The n8n node (for error throwing)
 * @returns Object with filter key and value, or undefined if invalid
 */
/**
 * Formats a sort field appending the necessary prefix for ascending or descending
 *
 * @param sortRule - The sort rule object
 * @param field - The field name
 * @param direction - Sort direction ('ASC' or 'DESC')
 * @returns Formatted sort string for the API
 */
/**
 * Processes an array of filters and applies them to a query string object
 *
 * @param filters - Array of filter objects
 * @param qs - Query string object to mutate
 * @param node - The n8n node (for error throwing)
 */

function splitAndLowercaseCamelCase(camelCaseString: string): string {
	if (!camelCaseString) {
		return '';
	}

	//    - The expression /([A-Z])/g finds every uppercase letter.
	//    - The replacement ' $1' inserts a space before that uppercase letter.
	const spacedString = camelCaseString.replace(/([A-Z])/g, ' $1');

	return spacedString.toLowerCase().trim();
}

export function validateValidUuid(
	context: IExecuteFunctions,
	itemIndex: number,
	uuidString: string,
	resource: UiResource,
): null | NodeOperationError {
	if (isValidUUID(uuidString)) {
		return null;
	}
	const resourceName = splitAndLowercaseCamelCase(resource);

	const description = `The ${resourceName} ID '${uuidString}' is not a valid UUID`;

	throw new NodeOperationError(context.getNode(), `Invalid ${resourceName} ID`, {
		description,
		itemIndex: itemIndex,
	});
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Validates that a string looks like an email address. Throws a NodeOperationError
 * with the supplied field label when invalid; returns null when valid.
 */
export function validateValidEmail(
	context: IExecuteFunctions,
	itemIndex: number,
	email: string,
	fieldLabel = 'email address',
): null | NodeOperationError {
	if (typeof email === 'string' && EMAIL_REGEX.test(email.trim())) {
		return null;
	}

	throw new NodeOperationError(context.getNode(), `Invalid ${fieldLabel}`, {
		description: `'${email}' is not a valid email address`,
		itemIndex: itemIndex,
	});
}

/**
 * Shared extended data field definitions used across all resources (listings, users, transactions)
 */

export const publicDataField: INodeProperties = {
	displayName: 'Public Data (JSON)',
	name: 'publicData',
	type: 'json',
	default: '{}',
	hint: 'Given object is merged on the top level (i.e. non-deep merge). Nested values are set as given. Top level keys set as <code>null</code> are removed.',
	description:
		'Public data. <a href="https://www.sharetribe.com/docs/references/extended-data/" target="_blank">Learn more</a>.',
};

export const protectedDataField: INodeProperties = {
	displayName: 'Protected Data (JSON)',
	name: 'protectedData',
	type: 'json',
	default: '{}',
	hint: 'Given object is merged on the top level (i.e. non-deep merge). Nested values are set as given. Top level keys set as <code>null</code> are removed.',
	description:
		'Protected data. <a href="https://www.sharetribe.com/docs/references/extended-data/" target="_blank">Learn more</a>.',
};

export const privateDataField: INodeProperties = {
	displayName: 'Private Data (JSON)',
	name: 'privateData',
	type: 'json',
	default: '{}',
	hint: 'Given object is merged on the top level (i.e. non-deep merge). Nested values are set as given. Top level keys set as <code>null</code> are removed.',
	description:
		'Private data. <a href="https://www.sharetribe.com/docs/references/extended-data/" target="_blank">Learn more</a>.',
};

export const metadataField: INodeProperties = {
	displayName: 'Metadata (JSON)',
	name: 'metadata',
	type: 'assignmentCollection',
	default: {},
	hint: 'Given object is merged on the top level (i.e. non-deep merge). Nested values are set as given. Top level keys set as <code>null</code> are removed.',
	description:
		'Metadata. <a href="https://www.sharetribe.com/docs/references/extended-data/" target="_blank">Learn more</a>.',
};

/**
 * Builds the human-readable summary message shown in the n8n output pane after a node runs.
 * Converts the operation + resource + result count into a natural-language sentence
 * (e.g. "Retrieved 3 listings (page 1, 100 per page)" or "Created 1 transaction").
 * Automatically pluralizes the resource name and appends pagination details when present.
 * Resource and operation are read from the node parameters automatically.
 *
 * @example
 * generateExecutionSummary(this, 3, meta)
 * // → "Retrieved 3 listings (page 1, 100 per page)"
 */
export function generateExecutionSummary(
	context: IExecuteFunctions,
	resultCount: number,
	meta?: IDataObject,
): string {
	const resource = context.getNodeParameter('resource', 0) as string;
	const operation = context.getNodeParameter('operation', 0) as string;
	const countOnly = context.getNodeParameter('countOnly', 0, false) as boolean;

	const resourceLabel = (n: number) => (n === 1 ? resource : `${resource}s`);

	if (countOnly) {
		return `Counted ${resultCount} ${resourceLabel(resultCount)}`;
	}

	const verbs: Record<string, string> = {
		create: 'Created',
		update: 'Updated',
		delete: 'Deleted',
		get: 'Retrieved',
		getMany: 'Retrieved',
		query: 'Retrieved',
		approve: 'Approved',
		close: 'Closed',
		open: 'Opened',
		transition: 'Transitioned',
		upload: 'Uploaded',
		forceSet: 'Set',
		safelySet: 'Set',
		adjust: 'Adjusted',
		compareAndSet: 'Set',
		getReservation: 'Retrieved',
	};

	const verb = verbs[operation] || 'Processed';

	if (!meta || (operation !== 'query' && operation !== 'getMany')) {
		return `${verb} ${resultCount} ${resourceLabel(resultCount)}`;
	}

	const totalItems = meta.totalItems as number | null | undefined;
	const page = meta.page as number | undefined;
	const perPage = meta.perPage as number | undefined;
	const totalPages = meta.totalPages as number | null | undefined;
	// paginationUnsupported is set by the API when availability filters are active —
	// those queries cannot return a total count.
	const paginationUnsupported = meta.paginationUnsupported as boolean | undefined;

	if (paginationUnsupported) {
		return `${verb} ${resultCount} ${resourceLabel(resultCount)} (total unavailable — availability filters prevent count queries)`;
	}

	if (totalItems != null) {
		let summary = `${verb} ${resultCount} of ${totalItems} ${resourceLabel(totalItems)}`;
		if (page != null && perPage != null) {
			summary += ` (page ${page}`;
			if (totalPages != null) summary += ` of ${totalPages}`;
			summary += `, ${perPage} per page)`;
		}
		return summary;
	}

	return `${verb} ${resultCount} ${resourceLabel(resultCount)}`;
}

/**
 * Filters results based on a search string
 *
 * @param results - Array of node property options to filter
 * @param filter - Optional search string to filter by (case-insensitive)
 * @returns Filtered array of node property options
 */
export function applyFilterToResults(
	results: INodePropertyOptions[],
	filter?: string,
): INodePropertyOptions[] {
	if (!filter) return results;
	const lowerFilter = filter.toLowerCase();
	return results.filter(
		(item) =>
			item.name.toLowerCase().includes(lowerFilter) ||
			String(item.value).toLowerCase().includes(lowerFilter),
	);
}

/**
 * Converts a Set of strings to sorted node property options
 *
 * @param items - Set of string values to convert
 * @param stripPrefix - Optional prefix to strip from values when creating display names
 * @param filter - Optional search string to filter results
 * @returns Node list search result with sorted and optionally filtered options
 */
export function toSortedOptions(
	items: Set<string>,
	stripPrefix?: string,
	filter?: string,
): INodeListSearchResult {
	const results: INodePropertyOptions[] = Array.from(items).map((item: string) => ({
		name: stripPrefix
			? item
					.replace(new RegExp(`^${stripPrefix}`), '')
					.split('-')
					.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
					.join(' ')
			: item,
		value: item,
	}));

	results.sort((a, b) => a.name.localeCompare(b.name));

	return { results: applyFilterToResults(results, filter) };
}

/**
 * Converts extended data fields to node property options
 *
 * @param fields - Set of field names to convert
 * @param stripPrefix - Prefix to strip from field names for display
 * @param filter - Optional search string to filter results
 * @param excludeFields - Optional set of field values to exclude from results
 * @returns Node list search result with filtered options
 */
export function fieldsToOptions(
	fields: Set<string>,
	stripPrefix: string,
	filter?: string,
	excludeFields?: Set<string>,
): INodeListSearchResult {
	let results: INodePropertyOptions[] = Array.from(fields).map((field: string) => ({
		name: field.replace(stripPrefix, ''),
		value: field,
	}));

	if (excludeFields) {
		results = results.filter((opt) => !excludeFields.has(String(opt.value)));
	}

	return { results: applyFilterToResults(results, filter) };
}

/**
 * Converts extended data fields to node property options, using asset labels where available
 *
 * @param fields - Set of field names to convert
 * @param stripPrefix - Prefix to strip from field names for display (fallback when no label)
 * @param labelMap - Map of field value to display label from asset data
 * @param filter - Optional search string to filter results
 * @param excludeFields - Optional set of field values to exclude from results
 * @returns Node list search result with filtered options
 */
export function fieldsToOptionsWithLabels(
	fields: Set<string>,
	stripPrefix: string,
	labelMap: Map<string, string>,
	filter?: string,
	excludeFields?: Set<string>,
	descriptionMap?: Map<string, string>,
): INodeListSearchResult {
	let results: INodePropertyOptions[] = Array.from(fields).map((field: string) => ({
		name: labelMap.get(field) || field.replace(stripPrefix, ''),
		value: field,
		...(descriptionMap?.get(field) ? { description: descriptionMap.get(field) } : {}),
	}));

	if (excludeFields) {
		results = results.filter((opt) => !excludeFields.has(String(opt.value)));
	}

	results.sort((a, b) => a.name.localeCompare(b.name));

	return { results: applyFilterToResults(results, filter) };
}

/**
 * Finds a category by ID in a category array
 *
 * @param categories - Array of categories to search
 * @param id - Category ID to find
 * @returns The found category or null if not found
 */
export function findCategoryById(categories: Category[], id: string): Category | null {
	for (const cat of categories) {
		if (cat.id === id) return cat;
	}
	return null;
}

/**
 * Extracts category ID from filter options
 *
 * @param filterOptions - Filter options object containing filters array
 * @param level - Category level to extract ('categoryLevel1' or 'categoryLevel2')
 * @returns Category ID string or null if not found
 */
export function getCategoryIdFromFilterOptions(
	filterOptions: IDataObject,
	level: 'categoryLevel1' | 'categoryLevel2',
): string | null {
	if (
		Array.isArray(filterOptions.filters) &&
		filterOptions.filters.length &&
		filterOptions.filters[0]?.filterType === 'category'
	) {
		return (filterOptions.filters[0]?.[level]?.value as string) || null;
	}
	return null;
}

/**
 * Converts categories to node property options
 *
 * @param categories - Array of categories to convert
 * @returns Sorted array of node property options
 */
export function categoriesToOptions(categories: Category[]): INodePropertyOptions[] {
	return categories
		.map((cat) => ({
			name: cat.name,
			value: cat.id,
		}))
		.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Gets categories at a specific hierarchy level
 *
 * @param context - Load options function context for making API calls
 * @param parentIds - Array of parent category IDs to traverse (empty for top-level)
 * @returns Array of categories at the specified level
 */
export async function getCategoriesAtLevel(
	context: ILoadOptionsFunctions,
	parentIds: string[],
): Promise<Category[]> {
	const response = await listSearchAssetCall<ListingCategoriesAssetResponse>(
		context,
		'listings/listing-categories.json',
	);

	// Response structure: { data: [{ attributes: { data: { categories: [...] } } }] }
	let categories = response.data[0]?.attributes?.data?.categories || [];

	for (const parentId of parentIds) {
		const parent = findCategoryById(categories, parentId);
		if (!parent?.subcategories) return [];
		categories = parent.subcategories;
	}

	return categories;
}

/**
 * Creates date range fields for stock queries
 */
export function createStockDateRangeFields(): INodeProperties[] {
	return [
		{
			displayName: 'Start',
			name: 'start',
			type: 'dateTime',
			placeholder: 'Date and time in UTC',
			required: true,
			displayOptions: {
				show: {
					resource: [UI_RESOURCES.STOCK],
					operation: [UI_OPERATIONS.GET_MANY],
				},
			},
			default: '',
			description: 'The start of the time range for stock adjustments',
		},
		{
			displayName: 'End',
			name: 'end',
			type: 'dateTime',
			placeholder: 'Date and time in UTC',
			required: true,
			displayOptions: {
				show: {
					resource: [UI_RESOURCES.STOCK],
					operation: [UI_OPERATIONS.GET_MANY],
				},
			},
			default: '',
			description: 'The end of the time range for stock adjustments',
		},
	];
}

/**
 * Creates listing ID field for stock operations
 */
export function createStockListingIdField(operation: string): INodeProperties {
	return {
		displayName: 'Listing ID',
		name: 'listingId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: [UI_RESOURCES.STOCK],
				operation: [operation],
			},
		},
		default: '',
		description: 'The listing ID to query stock for',
	};
}

/**
 * Creates result mode fields for stock queries
 */
export function createStockResultModeFields(): INodeProperties[] {
	return [
		// eslint-disable-next-line n8n-nodes-base/node-param-default-missing
		{
			displayName: 'Result Mode',
			name: 'resultMode',
			type: 'options',
			displayOptions: {
				show: {
					resource: [UI_RESOURCES.STOCK],
					operation: [UI_OPERATIONS.GET_MANY],
				},
			},
			options: [
				{
					name: 'Return All',
					value: RESULT_MODES.RETURN_ALL,
					description: 'Return all results (max 100 for stock queries)',
				},
				{
					name: 'Limit',
					value: RESULT_MODES.LIMIT,
					description: 'Return a specific number of results',
				},
			],
			default: RESULT_MODES.LIMIT,
		},
		{
			displayName: 'Limit',
			name: 'limit',
			type: 'number',
			displayOptions: {
				show: {
					resource: [UI_RESOURCES.STOCK],
					operation: [UI_OPERATIONS.GET_MANY],
					resultMode: [RESULT_MODES.LIMIT],
				},
			},
			typeOptions: {
				minValue: 1,
				maxValue: 100,
			},
			default: 50,
			description: 'Max number of results to return',
		},
	];
}

/**
 * Helper function for availability-based cursor pagination
 * Used when hourly-fixed plans or partial-match queries are detected
 */
export async function queryWithAvailabilityChunking(
	context: IExecuteFunctions,
	qs: IDataObject,
): Promise<import('n8n-workflow').INodeExecutionData[]> {
	const { apiRequest } = await import('../transport');
	const { flattenSharetribeResponse } = await import('./Sharetribe');
	const CHUNK_SIZE = 20;
	const MAX_REQUESTS = 100;

	context.logger.debug(
		`[Availability Cursor Pagination] Starting query with createdAt cursor-based pagination`,
	);

	const allResults: import('n8n-workflow').INodeExecutionData[] = [];
	const seenIds = new Set<string>();
	let requestCount = 0;
	let lastCreatedAt: string | null = null;

	while (requestCount < MAX_REQUESTS) {
		requestCount++;

		const queryParams: IDataObject = { ...qs, perPage: CHUNK_SIZE, page: 1 };
		if (lastCreatedAt) {
			queryParams.createdAtEnd = lastCreatedAt;
		}

		context.logger.debug(
			`[Availability Cursor Pagination] Request #${requestCount}${lastCreatedAt ? ` | Cursor: createdAt < ${lastCreatedAt}` : ''}`,
		);

		const response = await apiRequest.call(
			context,
			'GET',
			ENDPOINTS.LISTINGS_QUERY,
			{},
			queryParams,
		);

		const normalized = flattenSharetribeResponse(response);
		const result = context.helpers.returnJsonArray(normalized);
		const returnedItems = result.length;

		// Deduplicate by listing ID — the cursor overlap means the boundary item
		// from the previous page is re-fetched on the next page
		const newItems = result.filter((item) => {
			const id = (item.json as IDataObject)?.id as string;
			if (!id || seenIds.has(id)) return false;
			seenIds.add(id);
			return true;
		});

		if (newItems.length > 0) {
			allResults.push(...newItems);
		}

		context.logger.debug(
			`[Availability Cursor Pagination] Response #${requestCount} | Returned: ${returnedItems}, New: ${newItems.length}, Total: ${allResults.length}`,
		);

		if (returnedItems === 0 || newItems.length === 0) {
			break;
		}

		if (returnedItems < CHUNK_SIZE) {
			context.logger.debug(
				`[Availability Cursor Pagination] Received fewer than ${CHUNK_SIZE} results, pagination complete`,
			);
			break;
		}

		// Use the second-to-last item as the cursor rather than the last item.
		// createdAtEnd is exclusive (<), so using the last item's timestamp would skip any
		// listings that share that exact timestamp but weren't returned on this page.
		// Using the second-to-last item ensures the last item is always within the next
		// page's window, preventing missed listings at timestamp boundaries.
		const cursorItem = returnedItems >= 2 ? result[returnedItems - 2] : result[returnedItems - 1];
		const cursorData = cursorItem?.json as IDataObject;
		const createdAt = cursorData?.createdAt as string;

		if (!createdAt) {
			context.logger.warn(
				`[Availability Cursor Pagination] Could not extract createdAt from result, stopping pagination`,
			);
			break;
		}

		lastCreatedAt = createdAt;
	}

	if (requestCount >= MAX_REQUESTS) {
		context.logger.warn(
			`[Availability Cursor Pagination] Reached maximum request limit (${MAX_REQUESTS}). Results may be incomplete.`,
		);
	}

	context.logger.debug(
		`[Availability Cursor Pagination] Complete | Requests: ${requestCount} | Total Results: ${allResults.length}`,
	);

	return allResults;
}

/**
 * Base builder class with common query building logic
 */

/**
 * Extract the last sequence ID from a batch of events - Sharetribe always returns in ascending order
 * Returns the max sequence ID found in the events, or undefined if none found
 */
export function extractMaxSequenceId(events: IDataObject[]): number | undefined {
	const maxSequenceId = (events[events.length - 1]?.attributes as IDataObject)?.sequenceId as
		| number
		| undefined;

	return maxSequenceId;
}

/**
 * Filter event types based on selected resources
 * Returns filtered event types array
 * Empty string in eventTypes means "All Events" - returns empty array (no filter)
 */
export function filterEventTypesByResources(resources: string[], eventTypes: string[]): string[] {
	// Empty string is used as "All Events" sentinel in UI
	// If present, return empty array to indicate no event type filter
	if (eventTypes.includes('')) {
		return [];
	}

	if (resources.includes('all') || resources.length === 0) {
		return eventTypes;
	}

	if (eventTypes.length === 0) {
		return resources;
	}

	return eventTypes.filter((eventType) => {
		const resourceType = eventType.split('/')[0];
		return resources.includes(resourceType);
	});
}

/**
 * Returns an execution hint for single-run operations that received multiple input items,
 * or undefined if there is only one item. The caller is responsible for passing the result
 * to addExecutionHints.
 */
export function multipleInputItemsHint(itemCount: number): NodeExecutionHint | undefined {
	if (itemCount <= 1) return undefined;
	return {
		message: `This node received <b>${itemCount} input items</b> but only ran once — this operation always runs once regardless of input count. Enable <b>Execute Once</b> in node settings, or restructure your workflow if you need to run per input item.`,
		location: 'outputPane',
	};
}

/**
 * Fetches an image from an external URL. No Sharetribe credentials are involved —
 * this is a plain unauthenticated HTTP GET to whatever URL the user provided.
 * Expected use case is pulling a publicly accessible Sharetribe listing image URL
 * and re-uploading it to Sharetribe via the uploadImage operation, since Sharetribe
 * requires images to be uploaded directly rather than linked by URL.
 *
 * @param context - The n8n execution context
 * @param url - The external URL to fetch the image from
 * @returns The fetched image buffer, filename, and content type
 */
export async function fetchExternalImageFromUrl(
	context: IExecuteFunctions,
	url: URL,
): Promise<FetchedImage> {
	const options: IHttpRequestOptions = {
		method: 'GET',
		url: url.toString(),
		returnFullResponse: true,
		encoding: 'arraybuffer',
	};

	const res = await context.helpers.httpRequest(options);
	const buffer = res.body as Buffer;
	const headers = res.headers ?? {};

	let fileName = 'image';
	const contentDisposition: string = headers['content-disposition'];
	if (contentDisposition && contentDisposition.includes('filename')) {
		const filenameMatch = contentDisposition.match(/filename\*?=(?:UTF-8'')?["']?([^"';\n\r]+)/i);
		if (filenameMatch && filenameMatch[1]) {
			fileName = decodeURIComponent(filenameMatch[1]);
		}
	}

	let contentType = 'application/octet-stream';
	const ct = (headers['content-type'] || headers['Content-Type']) as string | undefined;
	if (ct) {
		contentType = ct;
	}

	return { buffer, fileName, contentType };
}

/**
 * Fetches content page sitemap data from the Marketplace API using an anonymous token.
 * No Integration API credentials are used — this is a public read.
 *
 * @param context - The n8n execution context
 * @returns The sitemap response data for content pages
 */
export async function fetchSitemapAnonymously(
	context: ILoadOptionsFunctions,
): Promise<IDataObject> {
	const marketplaceApiBaseUrl = await getMarketplaceApiBaseUrl(context);
	const accessToken = await getAnonymousMarketplaceToken(context);

	return context.helpers.httpRequest({
		method: 'GET',
		url: `${marketplaceApiBaseUrl}/v1/api/sitemap_data/query_assets?pathPrefix=/content/pages/`,
		headers: {
			Accept: 'application/json',
			Authorization: `Bearer ${accessToken}`,
		},
	});
}

/**
 * Fetches assets from the Sharetribe Asset Delivery API (CDN).
 * Authentication is via public marketplace client ID in the URL path — no OAuth headers.
 *
 * @param this - The n8n execution context
 * @param accessType - 'alias' for latest/named versions, 'version' for specific version IDs
 * @param assetPaths - Array of asset paths (currently supports single asset per request)
 * @param versionOrAlias - Version ID or alias name (default: 'latest')
 * @returns Asset delivery response with data, included resources, and version metadata
 */
export async function fetchPublicAssets(
	this:
		| IHookFunctions
		| IExecuteFunctions
		| ILoadOptionsFunctions
		| IPollFunctions
		| IWebhookFunctions,
	accessType: 'alias' | 'version',
	assetPaths: string[],
	versionOrAlias: string = 'latest',
): Promise<AssetDeliveryResponse> {
	const assetApiBaseUrl = await getAssetApiBaseUrl(this);
	const marketplaceClientId = await getPublicMarketplaceClientId(this);

	const baseUrl = `${assetApiBaseUrl}/${marketplaceClientId}`;
	const urlPath: string = `/a/${versionOrAlias}/`;
	const query: IDataObject = {};

	query.assets = assetPaths.map((p) => (p.startsWith('/') ? p.slice(1) : p));

	const headers: IDataObject = {
		Accept: 'application/json',
	};

	const options: IHttpRequestOptions = {
		method: 'GET',
		url: `${baseUrl}${urlPath}`,
		qs: query,
		arrayFormat: 'comma',
		headers,
		json: true,
		returnFullResponse: true,
	};

	try {
		let fullUrl = `${baseUrl}${urlPath}`;
		if (Object.keys(query).length > 0) {
			const queryStr = Object.entries(query)
				.map(([key, value]) => {
					const val = Array.isArray(value) ? value.join(',') : String(value);
					return `${key}=${encodeURIComponent(val)}`;
				})
				.join('&');
			fullUrl += `?${queryStr}`;
		}
		this.logger.debug(`[Sharetribe] Asset request: ${fullUrl}`);
		this.logger.debug(
			`[Sharetribe] Fetching asset(s) from CDN: ${accessType}=${versionOrAlias}, path(s)=${JSON.stringify(assetPaths)}`,
		);

		const response = await this.helpers.httpRequest(options);
		const statusCode = response.statusCode as number;

		this.logger.debug(`[Sharetribe Asset] Response status code: ${statusCode}`);

		if (statusCode >= 400) {
			if (statusCode === 404) {
				throw new NodeApiError(this.getNode(), response as JsonObject, {
					message: 'Asset Not Found',
					description: `No asset found at path: ${assetPaths} (${accessType}: ${versionOrAlias})`,
					httpCode: '404',
				});
			}

			if (statusCode === 403) {
				throw new NodeApiError(this.getNode(), response as JsonObject, {
					message: 'Asset Access Forbidden',
					description:
						'Invalid client ID or the asset is not accessible. Please check your Sharetribe credentials.',
					httpCode: '403',
				});
			}

			throw new NodeApiError(this.getNode(), response as JsonObject, {
				message: 'Asset Delivery API Error',
				description: `HTTP ${statusCode}: Failed to retrieve asset from CDN`,
				httpCode: statusCode.toString(),
			});
		}

		const body = response.body as AssetDeliveryResponse;

		this.logger.debug(`[Sharetribe Asset] Asset data received`);
		this.logger.debug(`[Sharetribe Asset] Asset version: ${body.meta?.version}`);

		return body;
	} catch (error) {
		const errorResponse = error as {
			message?: string;
			code?: string;
		};

		throw new NodeApiError(this.getNode(), error as JsonObject, {
			message: 'Asset Delivery API Request Failed',
			description: errorResponse.message || 'Network error or failed to retrieve asset from CDN',
		});
	}
}

/**
 * Fetches available booking timeslots from the Marketplace API using an anonymous token.
 * No Integration API credentials are used — authentication is via a public-read anonymous
 * token obtained from {@link getAnonymousMarketplaceToken}. Retries once on 401 by clearing
 * the cached token.
 *
 * @param this - The n8n execution context
 * @param query - Query parameters including listingId, start, end, etc.
 * @returns Timeslot response with data array and pagination metadata
 */
export async function fetchTimeslotsAnonymously(
	this:
		| IHookFunctions
		| IExecuteFunctions
		| ILoadOptionsFunctions
		| IPollFunctions
		| IWebhookFunctions,
	query: IDataObject,
): Promise<TimeslotResponse> {
	const marketplaceApiBaseUrl = await getMarketplaceApiBaseUrl(this);

	let retryCount = 0;
	const maxRetries = 1;

	while (retryCount <= maxRetries) {
		const accessToken = await getAnonymousMarketplaceToken(this);
		const url = `${marketplaceApiBaseUrl}/v1/api/timeslots/query`;
		const headers: IDataObject = {
			Accept: 'application/json',
			Authorization: `Bearer ${accessToken}`,
		};

		const options: IHttpRequestOptions = {
			method: 'GET',
			url: url,
			qs: query,
			arrayFormat: 'comma',
			headers,
			json: true,
			returnFullResponse: true,
		};

		try {
			// Build full URL for logging
			let fullUrl = `${marketplaceApiBaseUrl}/v1/api/timeslots/query`;
			if (Object.keys(query).length > 0) {
				const queryStr = Object.entries(query)
					.map(([key, value]) => {
						const val = Array.isArray(value) ? value.join(',') : String(value);
						return `${key}=${val}`;
					})
					.join('&');
				fullUrl += `?${queryStr}`;
			}

			// Log request with wrapping at 120 characters
			const logPrefix = '[Sharetribe Timeslot] GET ';
			if (logPrefix.length + fullUrl.length <= 120) {
				this.logger.debug(`${logPrefix}${fullUrl}`);
			} else {
				this.logger.debug(`${logPrefix}${fullUrl.substring(0, 120 - logPrefix.length)}`);
				let remaining = fullUrl.substring(120 - logPrefix.length);
				while (remaining.length > 0) {
					this.logger.debug(`  ${remaining.substring(0, 118)}`);
					remaining = remaining.substring(118);
				}
			}

			const response = await this.helpers.httpRequest(options);
			const statusCode = response.statusCode as number;

			this.logger.debug(`[Sharetribe Timeslot] Response ${statusCode}`);

			if (statusCode >= 400) {
				if (statusCode === 401 && retryCount < maxRetries) {
					clearAnonymousMarketplaceToken(this);
					retryCount++;
					continue;
				}

				if (statusCode === 404) {
					throw new NodeApiError(this.getNode(), response as JsonObject, {
						message: 'Timeslots Not Found',
						description: `No timeslots found for listing: ${query.listingId}`,
						httpCode: '404',
					});
				}

				if (statusCode === 403 || (statusCode === 401 && retryCount >= maxRetries)) {
					throw new NodeApiError(this.getNode(), response as JsonObject, {
						message: 'Timeslot Access Forbidden',
						description:
							'The timeslots API is not accessible. This is likely because your marketplace access control is set to private, which blocks the anonymous (public-read) authentication that timeslots require.',
						httpCode: String(statusCode),
					});
				}

				throw new NodeApiError(this.getNode(), response as JsonObject, {
					message: 'Timeslot API Error',
					description: `HTTP ${statusCode}: Failed to retrieve timeslots`,
					httpCode: statusCode.toString(),
				});
			}

			const body = response.body as TimeslotResponse;
			return body;
		} catch (error) {
			const errorResponse = error as {
				message?: string;
				code?: string;
			};

			throw new NodeApiError(this.getNode(), error as JsonObject, {
				message: 'Timeslot API Request Failed',
				description: errorResponse.message || 'Network error or failed to retrieve timeslots',
			});
		}
	}

	throw new NodeOperationError(this.getNode(), 'Failed to retrieve timeslots after retry');
}

/* ─────────────────────────────────────────────────────────────────────────────
 * listSearch / loadOptions helpers
 *
 * The functions below back the public listSearch handlers in
 * `methods/listSearch.ts`. They discover, validate, and normalize Sharetribe
 * extended-data fields by reading marketplace assets and probing the
 * Marketplace API.
 * ───────────────────────────────────────────────────────────────────────── */

/**
 * Builds a human-readable description of a field's schema type for display in dropdowns.
 * Uses marketplace terminology (e.g. "Dropdown", "Checkbox", "Number").
 */
export function buildFieldDescription(
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
export async function getIndexedListingFieldsFromAsset(
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
 * Fields with `filterConfig.indexForSearch === true` are returned in `indexed`
 * and can skip binary elimination — Sharetribe Console has already declared
 * them filterable. All matching fields appear in `labels` for dropdown display.
 *
 * @param context - n8n load options context
 * @param scope - The user-field scope to filter by
 * @returns Object with `indexed` (console-flagged filterable fields), `labels`
 *   (all fields with display labels), and `descriptions` (schema type descriptions)
 */
export async function getUserFieldsFromAsset(
	context: ILoadOptionsFunctions,
	scope: 'public' | 'private' | 'protected' | 'metadata',
): Promise<{
	indexed: Map<string, string>;
	labels: Map<string, string>;
	descriptions: Map<string, string>;
}> {
	try {
		const response = await listSearchAssetCall<UserFieldsAssetResponse>(
			context,
			'users/user-fields.json',
		);
		const fields = response.data[0]?.attributes?.data?.userFields || [];
		const indexed = new Map<string, string>();
		const labels = new Map<string, string>();
		const descriptions = new Map<string, string>();
		const dataType =
			scope === 'public'
				? 'publicData'
				: scope === 'private'
					? 'privateData'
					: scope === 'protected'
						? 'protectedData'
						: 'metadata';
		for (const field of fields) {
			if (field.scope === scope) {
				const key = `${dataType}.${field.key}`;
				labels.set(key, field.label);
				const desc = buildFieldDescription(field.schemaType, field.enumOptions);
				if (desc) descriptions.set(key, desc);
				if (field.filterConfig?.indexForSearch) {
					indexed.set(key, field.label);
				}
			}
		}
		return { indexed, labels, descriptions };
	} catch (error) {
		context.logger.error(`[Sharetribe] Failed to fetch user fields asset: ${error}`);
		return { indexed: new Map(), labels: new Map(), descriptions: new Map() };
	}
}

/**
 * Reads transaction field definitions from the listing-types.json asset.
 * Transaction fields are defined per listing type (collected from the buyer
 * during checkout) and end up on `transaction.protectedData`. The asset has no
 * `indexForSearch` flag for them — searchability must still be probed against
 * actual transactions. Returns the union across all listing types, deduped by
 * `protectedData.<key>`, with display labels and schema descriptions.
 */
export async function getTransactionFieldsFromListingTypesAsset(
	context: ILoadOptionsFunctions,
): Promise<{ labels: Map<string, string>; descriptions: Map<string, string> }> {
	try {
		const response = await listSearchAssetCall<ListingTypesAssetResponse>(
			context,
			'listings/listing-types.json',
		);
		const listingTypes = response.data[0]?.attributes?.data?.listingTypes || [];
		const labels = new Map<string, string>();
		const descriptions = new Map<string, string>();
		for (const listingType of listingTypes) {
			for (const field of listingType.transactionFields || []) {
				const key = `protectedData.${field.key}`;
				if (!labels.has(key)) {
					labels.set(key, field.label);
					const desc = buildFieldDescription(field.schemaType, field.enumOptions);
					if (desc) descriptions.set(key, desc);
				}
			}
		}
		return { labels, descriptions };
	} catch (error) {
		context.logger.error(`[Sharetribe] Failed to fetch listing types asset: ${error}`);
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
export async function discoverAndValidateFields(
	context: ILoadOptionsFunctions,
	resourceType: 'listing' | 'transaction' | 'user',
	scope: 'metadata' | 'publicData' | 'privateData' | 'protectedData',
	preKnownFields?: Set<string>,
	skipValidationFields?: Set<string>,
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

			// Skip console-flagged fields — Sharetribe has already declared them filterable
			if (skipValidationFields) {
				for (const field of skipValidationFields) {
					fieldsToValidate.delete(field);
				}
			}

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
export async function validateFilterableFields(
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
export async function discoverTransactionProcessInfo(
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
export async function getNumberFieldsFromListingAsset(
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

export async function getNumberFieldsFromUserAsset(
	context: ILoadOptionsFunctions,
	scope: 'public' | 'private' | 'protected' | 'metadata',
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
			scope === 'public'
				? 'publicData'
				: scope === 'private'
					? 'privateData'
					: scope === 'protected'
						? 'protectedData'
						: 'metadata';
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
// Helper to recursively extract all field paths from an object in dot notation
export function extractFieldPaths(obj: IDataObject, prefix = ''): string[] {
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
export async function discoverUserExtendedDataFields(
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


// Discover listing extended data fields without validation (for deletion)
export async function discoverListingExtendedDataFields(
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


// Discover transaction extended data fields without validation (for deletion)
export async function discoverTransactionExtendedDataFields(
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

