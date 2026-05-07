import type {
	IExecuteFunctions,
	IDataObject,
	IHttpRequestMethods,
	INodeExecutionData,
	ILoadOptionsFunctions,
} from 'n8n-workflow';
import type { Endpoints, ResultOptions } from './Sharetribe.types';
import { apiRequest } from '../transport';
import { flattenSharetribeResponse, resolveAssetReferences, fetchPublicAssets } from './Sharetribe.utils';
import { RESULT_MODES, DEFAULT_QUERY_LIMIT } from './Sharetribe.types';

/**
 * Central handler for listSearch.ts to get resource fields for resource locators
 */
/**
 * Helper for raw API calls from listSearch/loadOptions contexts
 * Returns typed response without normalization
 */
export async function listSearchApiCall<T = IDataObject>(
	context: ILoadOptionsFunctions | IExecuteFunctions,
	endpoint: string,
	qs?: IDataObject,
): Promise<T> {
	return (await apiRequest.call(context, 'GET', endpoint, {}, qs || {})) as T;
}

/**
 * Helper for asset requests from listSearch/loadOptions contexts
 * Returns typed response for asset data
 */
export async function listSearchAssetCall<T = IDataObject>(
	context: ILoadOptionsFunctions | IExecuteFunctions,
	assetAlias: string,
): Promise<T> {
	return (await fetchPublicAssets.call(context, 'alias', [assetAlias])) as T;
}

export class Sharetribe {
	constructor(private executeFunctions: IExecuteFunctions) {}

	/**
	 * Simplified query method for GET requests
	 * Cleaner signature specifically for query operations
	 */
	async query(
		endpoint: Endpoints,
		qs: IDataObject,
		resultOptions: ResultOptions,
	): Promise<{ data: INodeExecutionData[]; meta?: IDataObject }> {
		return this.request({ method: 'GET', endpoint, qs, resultOptions });
	}

	/**
	 * Makes HTTP requests to the Sharetribe API with pagination and JSON:API normalization
	 * This is the main orchestration method that prepares requests, uses transport, and normalizes responses
	 */
	async request(options: {
		method: IHttpRequestMethods;
		endpoint: Endpoints;
		body?: IDataObject;
		qs?: IDataObject;
		resultOptions?: ResultOptions;
	}): Promise<{ data: INodeExecutionData[]; meta?: IDataObject }> {
		const {
			method,
			endpoint,
			body,
			qs = {},
			resultOptions = { limit: DEFAULT_QUERY_LIMIT, mode: RESULT_MODES.LIMIT },
		} = options;

		this.executeFunctions.logger.debug(`Making ${method} request to ${endpoint}`);
		if (body && Object.keys(body).length > 0) {
			this.executeFunctions.logger.debug(`Request body: ${JSON.stringify(body, null, 2)}`);
		}
		if (qs && Object.keys(qs).length > 0) {
			this.executeFunctions.logger.debug(`Query parameters: ${JSON.stringify(qs, null, 2)}`);
		}

		let finalQs = qs;
		if (resultOptions.mode === RESULT_MODES.MANUAL_PAGINATION) {
			const pageSize = resultOptions.pageSize || 100;
			const pageNumber = resultOptions.pageNumber || 1;
			this.executeFunctions.logger.debug(
				`Manual pagination: pageSize=${pageSize}, pageNumber=${pageNumber}`,
			);
			finalQs = { ...qs, perPage: pageSize, page: pageNumber };
		}
		// For POST requests, include related resources in responses (JSON:API expand parameter)
		// Add this AFTER pagination logic to ensure it's not overridden
		if (method === 'POST') {
			finalQs.expand = true;
		}

		if (resultOptions) {
			if (resultOptions.mode === RESULT_MODES.MANUAL_PAGINATION) {
				const response = await apiRequest.call(
					this.executeFunctions,
					method,
					endpoint,
					body || {},
					finalQs,
				);
				const normalizedData = flattenSharetribeResponse(response);
				return {
					data: this.executeFunctions.helpers.returnJsonArray(normalizedData),
					meta: response?.meta as IDataObject | undefined,
				};
			}

			if (resultOptions.mode === RESULT_MODES.TOTALS) {
				const totalQs =
					method === 'POST'
						? { ...qs, perPage: 100, page: 1, expand: true }
						: { ...qs, perPage: 100, page: 1 };
				const response = await apiRequest.call(
					this.executeFunctions,
					method,
					endpoint,
					body || {},
					totalQs,
				);
				const totalsData = {
					totalItems: response?.meta?.totalItems || 0,
					totalPages: response?.meta?.totalPages || 0,
					page: response?.meta?.page || 1,
					perPage: response?.meta?.perPage || 1,
					paginationLimit: response?.meta?.paginationLimit,
				};
				return { data: this.executeFunctions.helpers.returnJsonArray([totalsData]) };
			}

			const limit = resultOptions.limit as number;

			// RETURN_ALL mode - paginate through all results
			if (resultOptions.mode === RESULT_MODES.RETURN_ALL || (limit && limit > 100)) {
				let page = 1;
				let hasMore = true;
				const allData: IDataObject[] = [];
				let firstMeta: IDataObject | undefined;

				while (hasMore) {
					const paginatedQs =
						method === 'POST'
							? { ...qs, perPage: 100, page, expand: true }
							: { ...qs, perPage: 100, page };
					const response = await apiRequest.call(
						this.executeFunctions,
						method,
						endpoint,
						body || {},
						paginatedQs,
					);
					const normalized = flattenSharetribeResponse(response);
					allData.push(...normalized);

					if (page === 1 && response?.meta) {
						firstMeta = response.meta as IDataObject;
					}

					const totalPages = response?.meta?.totalPages || 1;
					hasMore = page < totalPages;
					page++;
				}

				return { data: this.executeFunctions.helpers.returnJsonArray(allData), meta: firstMeta };
			}

			const limitedQs =
				method === 'POST'
					? { ...qs, perPage: limit || 50, page: 1, expand: true }
					: { ...qs, perPage: limit || 50, page: 1 };
			const response = await apiRequest.call(
				this.executeFunctions,
				method,
				endpoint,
				body || {},
				limitedQs,
			);
			const normalizedData = flattenSharetribeResponse(response);
			return {
				data: this.executeFunctions.helpers.returnJsonArray(normalizedData),
				meta: response?.meta as IDataObject | undefined,
			};
		}

		const response = await apiRequest.call(
			this.executeFunctions,
			method,
			endpoint,
			body || {},
			qs || {},
		);
		const normalizedData = flattenSharetribeResponse(response);
		return {
			data: this.executeFunctions.helpers.returnJsonArray(normalizedData),
			meta: response?.meta as IDataObject | undefined,
		};
	}

	/**
	 * Makes raw HTTP requests to the Sharetribe API using transport layer with rate limiting
	 * Use this for direct API access without n8n's JSON:API normalization
	 */
	async apiRequest(
		method: IHttpRequestMethods,
		endpoint: string,
		body: IDataObject = {},
		query: IDataObject = {},
	): Promise<IDataObject> {
		return (await apiRequest.call(
			this.executeFunctions,
			method,
			endpoint,
			body,
			query,
		)) as unknown as IDataObject;
	}

	/**
	 * Fetches asset(s) from the Asset Delivery API (CDN)
	 * Assets are JSON configuration files
	 * Uses JSON:API normalization to flatten attributes and resolve _ref objects
	 */
	async fetchPublicAssets(
		accessType: 'alias' | 'version',
		assetPaths: string[],
		versionOrAlias: string = 'latest',
	): Promise<{ data: INodeExecutionData[]; meta?: IDataObject }> {
		const response = await fetchPublicAssets.call(
			this.executeFunctions,
			accessType,
			assetPaths,
			versionOrAlias,
		);

		const included = (response.included as IDataObject[]) || [];
		const normalizedAssets = flattenSharetribeResponse(response as unknown as IDataObject);
		const resolvedAssets = normalizedAssets.map(
			(asset) => resolveAssetReferences(asset, included) as IDataObject,
		);

		const returnData: INodeExecutionData[] = resolvedAssets.map((asset, index) => ({
			json: {
				...asset,
				_meta: {
					version: response.meta.version,
					accessType,
					versionOrAlias,
				},
			},
			pairedItem: { item: index },
		}));

		return {
			data: returnData,
			meta: response.meta as IDataObject,
		};
	}
}

export {
	SharetribeQueryBuilder,
	buildResultOptions,
	buildQueryContext,
	validateValidUuid,
	validateValidEmail,
	addUserAttributesToQueryString,
	getExtendedDataPrefix,
	buildSparseFieldsList,
	sparseAttributesFromNodeParameter,
	sparseListingAttributesFromNodeParameter,
	sparseTransactionAttributesFromNodeParameter,
	flattenSharetribeResponse,
	resolveAssetReferences,
	validateStartEndTimes,
	validatePositiveInteger,
	validateInteger,
	validateStockAdjustmentQuantity,
	validateAvailabilityExceptionTimeRange,
	validateListingAvailabilityFilterRange,
	publicDataField,
	protectedDataField,
	privateDataField,
	metadataField,
	applyFilterToResults,
	toSortedOptions,
	fieldsToOptions,
	fieldsToOptionsWithLabels,
	findCategoryById,
	getCategoryIdFromFilterOptions,
	categoriesToOptions,
	getCategoriesAtLevel,
	createStockDateRangeFields,
	createStockListingIdField,
	createStockResultModeFields,
	queryWithAvailabilityChunking,
} from './Sharetribe.utils';

export { FieldsetBuilder } from './builders/FieldsetBuilder';
export { PollingQueryBuilder } from './builders/PollingQueryBuilder';
export { ExtendedDataManager } from './ExtendedDataManager';
export { apiRequest } from '../transport';

/**
 * Compatibility wrapper for tests
 */
export async function executeSharetribeRequest(
	context: IExecuteFunctions,
	method: IHttpRequestMethods,
	endpoint: Endpoints,
	body?: IDataObject,
	qs?: IDataObject,
	resultOptions: ResultOptions = { limit: 0, mode: 'limit' },
): Promise<{ data: INodeExecutionData[]; meta?: IDataObject }> {
	const sharetribe = new Sharetribe(context);
	return await sharetribe.request({ method, endpoint, body, qs, resultOptions });
}

export {
	API_RESOURCES,
	ENDPOINTS,
	QUERY_PARAMS,
	EXTENDED_DATA_TYPES,
	UI_RESOURCES,
	UI_OPERATIONS,
	RESULT_MODES,
	OUTPUT_MODES,
	DEFAULT_QUERY_LIMIT,
	USER_ATTRIBUTE_FIELD_MAP,
	USER_RELATIONSHIP_OPTIONS,
	LISTING_RELATIONSHIP_OPTIONS,
	TRANSACTION_RELATIONSHIP_OPTIONS,
	AVAILABILITY_EXCEPTION_RELATIONSHIP_OPTIONS,
	STOCK_RELATIONSHIP_OPTIONS,
	EVENT_RELATIONSHIP_OPTIONS,
	RESOURCE_RELATIONSHIPS,
	RESOURCE_DEFAULTS,
	USER_RELATIONSHIPS,
	USER_RELATIONSHIP_VALUES,
	LISTING_RELATIONSHIPS,
	TRANSACTION_RELATIONSHIPS,
	AVAILABILITY_EXCEPTION_RELATIONSHIPS,
	STOCK_RELATIONSHIPS,
	EVENT_RELATIONSHIPS,
	COMMON_SORT_FIELDS_ARRAY,
	TRANSACTION_SORT_FIELDS_ARRAY,
	SORT_DIRECTION_OPTIONS_ARRAY,
	PREDEFINED_PUBLIC_DATA_FIELDS,
	CurrencyCode,
} from './Sharetribe.types';

export type {
	UiResource,
	UiOperation,
	ExtendedDataType,
	RelationshipPath,
	ResultMode,
	ResultOptions,
	OutputMode,
	SharetribeApiResponseType,
	SharetribeApiResponse,
	SharetribeApiSingleResponse,
	SharetribeResource,
	SharetribeMeta,
	SharetribeLinks,
	User,
	Listing,
	Transaction,
	Stock,
	AvailabilityException,
	Marketplace,
	Image,
	Category,
	ListingTypesAssetResponse,
	ListingCategoriesAssetResponse,
	ListingFieldsAssetResponse,
	UserFieldsAssetResponse,
	UserTypesAssetResponse,
} from './Sharetribe.types';

export {
	normalizeGeolocation,
	normalizeOrigin,
	normalizeBounds,
	normalizePrice,
	normalizeImages,
	addStringField,
	addExtendedDataFields,
	removeEmptyFields,
	parseJsonFields,
	parseAssignmentValue,
	parseFixedCollectionValues,
	isValidUUID,
	convertToUtcIso8601,
	getResourceLocatorValue,
	formatSortParameter,
	extractResourceMapperFields,
	generateExecutionSummary,
	buildOutputConfig,
	multipleInputItemsHint,
	fetchExternalImageFromUrl,
	fetchSitemapAnonymously,
	fetchPublicAssets,
	fetchTimeslotsAnonymously,
} from './Sharetribe.utils';

export * from './sharedDescriptions';
