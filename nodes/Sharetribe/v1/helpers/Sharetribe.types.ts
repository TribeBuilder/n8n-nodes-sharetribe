import type { IDataObject } from 'n8n-workflow';

/**
 * Result mode for controlling how results are returned
 */
export type ResultMode = 'returnAll' | 'limit' | 'totals' | 'manualPagination';

/**
 * Result options for controlling pagination and limits in getMany operations
 */
export interface ResultOptions {
	/** The result mode (returnAll, limit, totals, manualPagination) */
	mode: ResultMode;
	/** The maximum number of results to return (used with 'limit' mode) */
	limit?: number;
	/** Page size for manual pagination mode */
	pageSize?: number;
	/** Page number for manual pagination mode (1-indexed) */
	pageNumber?: number;
}

export type UUID = string;
export type Timestamp = string; // ISO 8601 format

export interface Money {
	amount: number;
	currency: string;
}

export interface LatLng {
	lat: number;
	lng: number;
}

export interface LatLngBounds {
	ne: LatLng;
	sw: LatLng;
}

export interface BigDecimal {
	value: string; // String representation of arbitrary precision decimal
}

export interface IdentityProvider {
	idpId: string;
	userId: string;
}

export interface ProfileImage {
	id: UUID;
	type: 'image';
	attributes: {
		variants: {
			default?: {
				name: string;
				width: number;
				height: number;
				url: string;
			};
			[key: string]:
				| {
						name: string;
						width: number;
						height: number;
						url: string;
				  }
				| undefined;
		};
	};
}

export interface AvailabilityPlan {
	type: 'availability-plan/time' | 'availability-plan/day';
	timezone: string;
}

export type UserState = 'active' | 'pendingApproval' | 'banned';

export interface UserProfile {
	firstName?: string;
	lastName?: string;
	displayName?: string;
	abbreviatedName?: string;
	bio?: string;
	metadata?: IDataObject;
	publicData?: IDataObject;
	protectedData?: IDataObject;
	privateData?: IDataObject;
}

export interface UserAttributes {
	banned: boolean;
	deleted: boolean;
	state: UserState;
	createdAt: Timestamp;
	email: string;
	emailVerified: boolean;
	pendingEmail?: string;
	stripeConnected: boolean;
	identityProviders?: IdentityProvider[];
	profile: UserProfile;
	metadata?: IDataObject;
}

export interface UserRelationships {
	marketplace?: { data: { id: UUID; type: 'marketplace' } };
	profileImage?: { data: { id: UUID; type: 'image' } | null };
	stripeAccount?: { data: { id: UUID; type: 'stripeAccount' } | null };
	effectivePermissionSet?: { data: { id: UUID; type: 'permissionSet' } };
}

export interface User {
	id: UUID;
	type: 'user';
	attributes: UserAttributes;
	relationships?: UserRelationships;
}

export interface ShowUserRequest {
	id?: UUID;
	email?: string;
	expand?: boolean;
	include?: string[];
	'fields.user'?: string;
	'fields.image'?: string;
}

export interface QueryUsersRequest {
	createdAtStart?: Timestamp;
	createdAtEnd?: Timestamp;
	sort?: string;
	page?: number;
	perPage?: number;
	include?: string[];
	'fields.user'?: string;
	[key: string]: string | string[] | number | boolean | undefined; // For meta_*, priv_*, prot_*, pub_* filters
}

export interface UpdateUserProfileRequest {
	id: UUID;
	firstName?: string;
	lastName?: string;
	displayName?: string;
	bio?: string;
	publicData?: IDataObject;
	protectedData?: IDataObject;
	privateData?: IDataObject;
	metadata?: IDataObject;
	profileImageId?: UUID;
}

export interface ApproveUserRequest {
	id: UUID;
}

export interface UpdatePermissionsRequest {
	id: UUID;
	postListings?: 'permission/allow' | 'permission/deny';
	initiateTransactions?: 'permission/allow' | 'permission/deny';
	read?: 'permission/allow' | 'permission/deny';
}

export type ListingState = 'draft' | 'pendingApproval' | 'published' | 'closed';

export interface ListingAttributes {
	title: string;
	description?: string;
	geolocation?: LatLng;
	createdAt: Timestamp;
	state: ListingState;
	price?: Money;
	availabilityPlan?: AvailabilityPlan;
	publicData?: IDataObject;
	privateData?: IDataObject;
	metadata?: IDataObject;
	deleted?: boolean;
}

export interface ListingRelationships {
	author?: { data: { id: UUID; type: 'user' } };
	marketplace?: { data: { id: UUID; type: 'marketplace' } };
	images?: { data: Array<{ id: UUID; type: 'image' }> };
	currentStock?: { data: { id: UUID; type: 'stock' } | null };
}

export interface Listing {
	id: UUID;
	type: 'listing';
	attributes: ListingAttributes;
	relationships?: ListingRelationships;
}

export interface ShowListingRequest {
	id: UUID;
	expand?: boolean;
	include?: string[];
	'fields.listing'?: string;
	'fields.user'?: string;
	'fields.image'?: string;
}

export interface QueryListingsRequest {
	authorId?: UUID;
	ids?: UUID[];
	states?: ListingState[];
	createdAtStart?: Timestamp;
	createdAtEnd?: Timestamp;
	minPrice?: string;
	maxPrice?: string;
	availabilityStart?: Timestamp;
	availabilityEnd?: Timestamp;
	minStock?: number;
	bounds?: string; // "ne_lat,ne_lng,sw_lat,sw_lng"
	origin?: string; // "lat,lng"
	sort?: string;
	page?: number;
	perPage?: number;
	include?: string[];
	'fields.listing'?: string;
	[key: string]: string | string[] | number | boolean | undefined; // For pub_*, priv_*, meta_* filters
}

export interface CreateListingRequest {
	title: string;
	description?: string;
	geolocation?: LatLng | { lat: number; lng: number };
	price?: Money | { amount: number; currency: string };
	availabilityPlan?: AvailabilityPlan;
	publicData?: IDataObject;
	privateData?: IDataObject;
	metadata?: IDataObject;
	images?: UUID[];
	authorId?: UUID;
}

export interface UpdateListingRequest {
	id: UUID;
	title?: string;
	description?: string;
	geolocation?: LatLng | { lat: number; lng: number };
	price?: Money | { amount: number; currency: string };
	availabilityPlan?: AvailabilityPlan;
	publicData?: IDataObject;
	privateData?: IDataObject;
	metadata?: IDataObject;
	images?: UUID[];
}

export interface CloseListingRequest {
	id: UUID;
}

export interface OpenListingRequest {
	id: UUID;
}

export interface ApproveListingRequest {
	id: UUID;
}

export interface TransactionAttributes {
	createdAt: Timestamp;
	processName: string;
	processVersion: number;
	lastTransition: string;
	lastTransitionedAt: Timestamp;
	payinTotal?: Money;
	payoutTotal?: Money;
	lineItems?: IDataObject[];
	protectedData?: IDataObject;
	metadata?: IDataObject;
}

export interface TransactionRelationships {
	customer?: { data: { id: UUID; type: 'user' } };
	provider?: { data: { id: UUID; type: 'user' } };
	listing?: { data: { id: UUID; type: 'listing' } };
	booking?: { data: { id: UUID; type: 'booking' } | null };
	reviews?: { data: Array<{ id: UUID; type: 'review' }> };
	messages?: { data: Array<{ id: UUID; type: 'message' }> };
}

export interface Transaction {
	id: UUID;
	type: 'transaction';
	attributes: TransactionAttributes;
	relationships?: TransactionRelationships;
}

export interface ShowTransactionRequest {
	id: UUID;
	expand?: boolean;
	include?: string[];
	'fields.transaction'?: string;
	'fields.user'?: string;
	'fields.listing'?: string;
}

export interface QueryTransactionsRequest {
	only?: 'sale' | 'order';
	lastTransitions?: string[];
	createdAtStart?: Timestamp;
	createdAtEnd?: Timestamp;
	sort?: string;
	page?: number;
	perPage?: number;
	include?: string[];
	'fields.transaction'?: string;
	[key: string]: string | string[] | number | boolean | undefined; // For meta_*, prot_* filters
}

export interface TransitionTransactionRequest {
	id: UUID;
	transition: string;
	params?: IDataObject;
}

export interface SpeculativeTransitionRequest {
	transactionId: UUID;
	transition: string;
	params?: IDataObject;
}

export interface UpdateTransactionMetadataRequest {
	id: UUID;
	metadata: IDataObject;
}

export interface StockAttributes {
	quantity: number;
}

export interface Stock {
	id: UUID;
	type: 'stock';
	attributes: StockAttributes;
}

export interface StockReservationAttributes {
	quantity: number;
	state: string;
}

export interface StockReservation {
	id: UUID;
	type: 'stockReservation';
	attributes: StockReservationAttributes;
}

export interface QueryStockRequest {
	listingId: UUID;
}

export interface AdjustStockRequest {
	listingId: UUID;
	quantity: number;
}

export interface CompareAndSetStockRequest {
	listingId: UUID;
	oldTotal: number;
	newTotal: number;
}

export interface ShowStockReservationRequest {
	id: UUID;
}

export interface AvailabilityExceptionAttributes {
	start: Timestamp;
	end: Timestamp;
	seats: number;
}

export interface AvailabilityException {
	id: UUID;
	type: 'availabilityException';
	attributes: AvailabilityExceptionAttributes;
}

export interface QueryAvailabilityExceptionsRequest {
	listingId: UUID;
	start?: Timestamp;
	end?: Timestamp;
}

export interface CreateAvailabilityExceptionRequest {
	listingId: UUID;
	start: Timestamp;
	end: Timestamp;
	seats: number;
}

export interface DeleteAvailabilityExceptionRequest {
	id: UUID;
}

export interface MarketplaceAttributes {
	name: string;
	[key: string]: string | number | boolean | IDataObject | undefined;
}

export interface Marketplace {
	id: UUID;
	type: 'marketplace';
	attributes: MarketplaceAttributes;
}

export interface ImageVariant {
	name: string;
	width: number;
	height: number;
	url: string;
}

export interface ImageAttributes {
	variants: {
		[key: string]: ImageVariant;
	};
}

export interface Image {
	id: UUID;
	type: 'image';
	attributes: ImageAttributes;
}

/**
 * Asset attributes returned from Asset Delivery API
 * Assets are JSON data files stored in a CDN for marketplace configuration
 */
export interface AssetAttributes {
	// The actual JSON data content of the asset
	data: IDataObject;
	// Optional metadata about the asset
	[key: string]: IDataObject | string | number | boolean | undefined;
}

/**
 * Asset resource from Asset Delivery API
 */
export interface Asset {
	id: string; // Asset path (e.g., '/general/localization.json')
	type: 'asset';
	attributes: AssetAttributes;
}

/**
 * Asset Delivery API Request Parameters
 */
export interface GetAssetRequest {
	/** Access type: 'alias' for latest/named versions, 'version' for specific version IDs */
	accessType: 'alias' | 'version';
	/** Asset path or array of paths */
	assetPath: string | string[];
	/** Version ID or alias name (default: 'latest') */
	versionOrAlias?: string;
}

/**
 * JSON:API resource object structure
 * All Sharetribe resources follow this format
 */
export interface SharetribeResource<T = IDataObject> {
	id: UUID;
	type: string;
	attributes?: T;
	relationships?: {
		[key: string]: {
			data: SharetribeResourceIdentifier | SharetribeResourceIdentifier[] | null;
		};
	};
}

/**
 * JSON:API resource identifier (used in relationships)
 */
export interface SharetribeResourceIdentifier {
	id: UUID;
	type: string;
}

/**
 * JSON:API links object for pagination
 */
export interface SharetribeLinks {
	self?: string;
	next?: string;
	prev?: string;
	first?: string;
	last?: string;
}

/**
 * JSON:API meta object with pagination information
 */
export interface SharetribeMeta {
	totalItems?: number | null;
	totalPages?: number | null;
	page?: number;
	perPage?: number;
	paginationLimit?: number | null;
	paginationUnsupported?: boolean;
	[key: string]: unknown;
}

/**
 * Base type containing common fields for all Sharetribe API responses
 */
interface SharetribeApiResponseBase {
	included?: SharetribeResource[];
	links?: SharetribeLinks;
	meta?: SharetribeMeta;
}

/**
 * Sharetribe API response for collection/query endpoints
 * Used for endpoints that return multiple resources (e.g., GET /users/query)
 */
export type SharetribeApiResponse<T = IDataObject> = SharetribeApiResponseBase & {
	data: SharetribeResource<T>[];
};

/**
 * Single resource response from Sharetribe API
 * Used for endpoints that return a single resource (e.g., GET /users/{id})
 */
export type SharetribeApiSingleResponse<T = IDataObject> = SharetribeApiResponseBase & {
	data: SharetribeResource<T>;
};

/**
 * Union type for functions that can return either single or collection responses
 */
export type SharetribeApiResponseType<T = IDataObject> =
	| SharetribeApiResponse<T>
	| SharetribeApiSingleResponse<T>;

export interface SharetribeApiListResponse<T> {
	data: T[];
	included?: Array<User | Listing | Transaction | Image | Marketplace | Stock | IDataObject>;
	meta?: {
		totalItems: number;
		totalPages: number;
		page: number;
		perPage: number;
	};
}

/**
 * Normalized user object (flattened from JSON:API structure)
 * All attributes moved to root level, relationships resolved to included data
 */
export interface NormalizedUser extends IDataObject {
	id: UUID;
	type: 'user';
	banned: boolean;
	deleted: boolean;
	state: UserState;
	createdAt: Timestamp;
	email: string;
	emailVerified: boolean;
	pendingEmail?: string;
	stripeConnected: boolean;
	identityProviders?: IdentityProvider[];
	profile: UserProfile;

	// Resolved relationships
	marketplace?: NormalizedMarketplace;
	profileImage?: NormalizedImage;
	stripeAccount?: IDataObject;
	effectivePermissionSet?: IDataObject;
}

export interface NormalizedListing extends IDataObject {
	id: UUID;
	type: 'listing';
	title: string;
	description?: string;
	geolocation?: LatLng;
	createdAt: Timestamp;
	state: ListingState;
	price?: Money;
	availabilityPlan?: AvailabilityPlan;
	publicData?: IDataObject;
	privateData?: IDataObject;
	metadata?: IDataObject;
	deleted?: boolean;
	author?: NormalizedUser;
	marketplace?: NormalizedMarketplace;
	images?: NormalizedImage[];
	currentStock?: NormalizedStock;
}

export interface NormalizedTransaction extends IDataObject {
	id: UUID;
	type: 'transaction';
	createdAt: Timestamp;
	processName: string;
	processVersion: number;
	lastTransition: string;
	lastTransitionedAt: Timestamp;
	payinTotal?: Money;
	payoutTotal?: Money;
	lineItems?: IDataObject[];
	protectedData?: IDataObject;
	metadata?: IDataObject;
	customer?: NormalizedUser;
	provider?: NormalizedUser;
	listing?: NormalizedListing;
	booking?: IDataObject;
	reviews?: IDataObject[];
	messages?: IDataObject[];
}

export interface NormalizedStock extends IDataObject {
	id: UUID;
	type: 'stock';
	quantity: number;
}

export interface NormalizedStockReservation extends IDataObject {
	id: UUID;
	type: 'stockReservation';
	quantity: number;
	state: string;
}

export interface NormalizedAvailabilityException extends IDataObject {
	id: UUID;
	type: 'availabilityException';
	start: Timestamp;
	end: Timestamp;
	seats: number;
	listing?: NormalizedListing;
}

export interface NormalizedMarketplace extends IDataObject {
	id: UUID;
	type: 'marketplace';
	name: string;
	url?: string;
	currency?: string;
	timezone?: string;
	distanceUnit?: string;
	[key: string]: string | number | boolean | IDataObject | undefined;
}

export interface NormalizedImage extends IDataObject {
	id: UUID;
	type: 'image';
	variants: {
		[key: string]: ImageVariant;
	};
}

/**
 * Union type for any normalized Sharetribe resource
 */
export type NormalizedSharetribeResource =
	| NormalizedUser
	| NormalizedListing
	| NormalizedTransaction
	| NormalizedStock
	| NormalizedStockReservation
	| NormalizedAvailabilityException
	| NormalizedMarketplace
	| NormalizedImage;

export type ApiErrorStatus = 400 | 401 | 402 | 403 | 404 | 409 | 413 | 429 | 500;

export type Error400Code =
	| 'unsupported-content-type'
	| 'bad-request'
	| 'validation-disallowed-key'
	| 'validation-invalid-value'
	| 'validation-invalid-params'
	| 'validation-missing-key';

export type Error401Code = 'auth-invalid-access-token' | 'auth-missing-access-token';

export type Error402Code = 'transaction-payment-failed';

export type Error403Code = 'forbidden';

export type Error404Code = 'not-found';

export type Error409Code =
	| 'conflict'
	| 'image-invalid'
	| 'image-invalid-content'
	| 'email-taken'
	| 'email-already-verified'
	| 'email-unverified'
	| 'email-not-found'
	| 'listing-not-found'
	| 'listing-invalid-state'
	| 'stripe-account-not-found'
	| 'stripe-missing-api-key'
	| 'stripe-invalid-payment-intent-status'
	| 'stripe-customer-not-found'
	| 'stripe-multiple-payment-methods-not-supported'
	| 'stripe-payment-method-type-not-supported'
	| 'user-missing-stripe-account'
	| 'user-is-banned'
	| 'user-not-found'
	| 'transaction-locked'
	| 'transaction-not-found'
	| 'transaction-listing-not-found'
	| 'transaction-booking-state-not-pending'
	| 'transaction-booking-state-not-accepted'
	| 'transaction-invalid-transition'
	| 'transaction-invalid-action-sequence'
	| 'transaction-missing-listing-price'
	| 'transaction-missing-stripe-account'
	| 'transaction-same-author-and-customer'
	| 'transaction-stripe-account-disabled-charges'
	| 'transaction-stripe-account-disabled-payouts'
	| 'transaction-charge-zero-payin'
	| 'transaction-charge-zero-payout'
	| 'transaction-zero-payin'
	| 'transaction-unknown-alias'
	| 'transaction-provider-banned-or-deleted'
	| 'transaction-customer-banned-or-deleted';

export type Error413Code = 'request-larger-than-content-length' | 'request-upload-over-limit';

export type Error429Code = 'too-many-requests';

export type ApiErrorCode =
	| Error400Code
	| Error401Code
	| Error402Code
	| Error403Code
	| Error404Code
	| Error409Code
	| Error413Code
	| Error429Code;

/**
 * Sharetribe API error object structure
 * Based on JSON:API error specification
 */
export interface SharetribeApiError {
	id: string; // Unique ID for each instance of an error
	status: ApiErrorStatus; // HTTP status code
	code: ApiErrorCode; // Specific error code
	title: string; // Human-readable error title
	details?: string; // Optional detailed explanation
	source?: {
		path: string[]; // Path to the parameter causing the error (e.g., ['body', 'price', 'amount'])
		type: 'body' | 'query'; // Indicates body or query parameter
	};
	meta?: {
		stripeMessage?: string; // Stripe error message (for payment errors)
		stripeCode?: string; // Stripe error code (for payment errors)
		[key: string]: unknown;
	};
}

/**
 * Sharetribe API error response structure
 */
export interface SharetribeApiErrorResponse {
	errors: SharetribeApiError[];
}

// API RESOURCES
// Used in execute files for actual Sharetribe API requests
// Maps directly to Sharetribe API resource types in endpoints and query parameters
// Example: API_RESOURCES.USER → 'user' → used in fields.user, include params
// DO NOT use in description files - use UI_RESOURCES instead

export const API_RESOURCES = {
	USER: 'user',
	LISTING: 'listing',
	TRANSACTION: 'transaction',
	MARKETPLACE: 'marketplace',
	STOCK_ADJUSTMENT: 'stockAdjustment',
	IMAGE: 'image',
	AVAILABILITY_EXCEPTIONS: 'availabilityExceptions',
	EVENT: 'event',
	TIMESLOT: 'timeslot',
} as const;

export type ApiResource = (typeof API_RESOURCES)[keyof typeof API_RESOURCES];

// API OPERATIONS
// Actual Sharetribe API operation names used in execute files
// Maps to Sharetribe API endpoints (SHOW for single resource, QUERY for multiple)
// DO NOT use in description files - use UI_OPERATIONS instead

export const API_OPERATIONS = {
	ADJUST: 'adjust',
	APPROVE: 'approve',
	CLOSE: 'close',
	COMPARE_AND_SET: 'compareAndSet',
	CREATE: 'create',
	DELETE: 'delete',
	GET_RESERVATION: 'getReservation',
	OPEN: 'open',
	QUERY: 'query',
	SHOW: 'show',
	TRANSITION: 'transition',
	UPDATE: 'update',
	UPDATE_METADATA: 'updateMetadata',
	UPDATE_PERMISSIONS: 'updatePermissions',
	UPDATE_PROFILE: 'updateProfile',
	UPLOAD: 'upload',
};

export type ApiOperation = (typeof API_OPERATIONS)[keyof typeof API_OPERATIONS];

// UI RESOURCE NAMES - same as API apart from stock which is grouped in UI
// Use in description files for displayOptions.show conditions
// Example: 'resource': [UI_RESOURCES.LISTING]

export const UI_RESOURCES = {
	USER: 'user',
	LISTING: 'listing',
	TRANSACTION: 'transaction',
	MARKETPLACE: 'marketplace',
	STOCK: 'stock',
	STOCK_RESERVATION: 'stockReservation',
	IMAGE: 'image',
	AVAILABILITY_EXCEPTIONS: 'availabilityExceptions',
	ASSET: 'asset',
	EVENT: 'event',
	TIMESLOT: 'timeslot',
} as const;

export type UiResource = (typeof UI_RESOURCES)[keyof typeof UI_RESOURCES];

// UI OPERATION NAMES
// Use in description files for displayOptions.show conditions
// Example: 'operation': [UI_OPERATIONS.GET]
// UI operations map to API operations: GET → SHOW, GET_MANY → QUERY

export const UI_OPERATIONS = {
	ADJUST: 'adjust',
	APPROVE: 'approve',
	APPROVE_USER: 'approveUser',
	CLOSE: 'close',
	CREATE: 'create',
	DELETE: 'delete',
	FORCE_SET: 'forceSet',
	GET: 'get',
	GET_MANY: 'getMany',
	GET_RESERVATION: 'getReservation',
	GET_TIMESLOTS: 'getTimeslots',
	OPEN: 'open',
	SAFELY_SET: 'safelySet',
	TRANSITION: 'transition',
	UPDATE: 'update',
	UPDATE_METADATA: 'updateMetadata',
	UPDATE_PERMISSIONS: 'updatePermissions',
	UPDATE_PROFILE: 'updateProfile',
	UPDATE_STOCK_QUANTITY: 'updateStockQuantity',
	UPLOAD: 'upload',
} as const;

export type UiOperation = (typeof UI_OPERATIONS)[keyof typeof UI_OPERATIONS];

// API ENDPOINTS

export const ENDPOINTS = {
	USERS_GET: 'users/show',
	USERS_QUERY: 'users/query',
	USERS_UPDATE: 'users/update',
	USERS_UPDATE_PROFILE: 'users/update_profile',
	USERS_APPROVE: 'users/approve',
	USERS_UPDATE_PERMISSIONS: 'users/update_permissions',
	LISTINGS_GET: 'listings/show',
	LISTINGS_QUERY: 'listings/query',
	LISTINGS_CREATE: 'listings/create',
	LISTINGS_UPDATE: 'listings/update',
	LISTINGS_APPROVE: 'listings/approve',
	LISTINGS_OPEN: 'listings/open',
	LISTINGS_CLOSE: 'listings/close',
	TRANSACTIONS_GET: 'transactions/show',
	TRANSACTIONS_QUERY: 'transactions/query',
	TRANSACTIONS_TRANSITION: 'transactions/transition',
	TRANSACTIONS_SPECULATIVE_TRANSITION: 'transactions/transition_speculative',
	TRANSACTIONS_UPDATE_METADATA: 'transactions/update_metadata',
	MARKETPLACE_GET: 'marketplace/show',
	IMAGES_UPLOAD: 'images/upload',
	AVAILABILITY_EXCEPTIONS_QUERY: 'availability_exceptions/query',
	AVAILABILITY_EXCEPTIONS_CREATE: 'availability_exceptions/create',
	AVAILABILITY_EXCEPTIONS_DELETE: 'availability_exceptions/delete',
	STOCK_ADJUSTMENTS_QUERY: 'stock_adjustments/query',
	STOCK_ADJUSTMENTS_CREATE: 'stock_adjustments/create',
	STOCK_RESERVATIONS_GET: 'stock_reservations/show',
	STOCK_COMPARE_AND_SET: 'stock/compare_and_set',
	EVENTS_QUERY: 'events/query',
} as const;

export type Endpoints = (typeof ENDPOINTS)[keyof typeof ENDPOINTS];

export const EXTENDED_DATA_TYPES = {
	METADATA: 'metadata',
	PUBLIC_DATA: 'publicData',
	PRIVATE_DATA: 'privateData',
	PROTECTED_DATA: 'protectedData',
} as const;

export type ExtendedDataType = (typeof EXTENDED_DATA_TYPES)[keyof typeof EXTENDED_DATA_TYPES];

// Array of all extended data types for iteration
export const EXTENDED_DATA_TYPES_ARRAY = Object.values(EXTENDED_DATA_TYPES);

// EXTENDED DATA PREFIXES (for query parameters)

export const EXTENDED_DATA_PREFIXES = {
	[EXTENDED_DATA_TYPES.METADATA]: 'meta',
	[EXTENDED_DATA_TYPES.PUBLIC_DATA]: 'pub',
	[EXTENDED_DATA_TYPES.PRIVATE_DATA]: 'priv',
	[EXTENDED_DATA_TYPES.PROTECTED_DATA]: 'prot',
} as const;

// API QUERY PARAMETER NAMES

export const QUERY_PARAMS = {
	// Sparse fields parameters
	FIELDS_USER: 'fields.user',
	FIELDS_LISTING: 'fields.listing',
	FIELDS_TRANSACTION: 'fields.transaction',
	FIELDS_STOCK_ADJUSTMENT: 'fields.stockAdjustment',

	// Relationship parameters
	INCLUDE: 'include',
	EXPAND: 'expand',

	// Pagination parameters
	PAGE: 'page',
	PER_PAGE: 'perPage',

	// Sorting parameters
	SORT: 'sort',
	ORDER: 'order',

	// Common filter parameters
	ID: 'id',
} as const;

// JSON:API RESPONSE STRUCTURE KEYS

export const API_RESPONSE_KEYS = {
	ID: 'id',
	TYPE: 'type',
	DATA: 'data',
	ATTRIBUTES: 'attributes',
	RELATIONSHIPS: 'relationships',
	INCLUDED: 'included',
	META: 'meta',
	TOTAL_ITEMS: 'totalItems',
	TOTAL_PAGES: 'totalPages',
} as const;

// RESULT MODES

export const RESULT_MODES = {
	RETURN_ALL: 'returnAll',
	LIMIT: 'limit',
	MANUAL_PAGINATION: 'manualPagination',
	TOTALS: 'totals',
} as const;

// DEFAULT PAGINATION LIMITS

/**
 * Default limit for query operations when not returning all results
 */
export const DEFAULT_QUERY_LIMIT = 50;

// OUTPUT MODES

/**
 * Output modes for controlling response formatting
 */
export const OUTPUT_MODES = {
	SIMPLIFIED: 'simplified',
	SELECTED_FIELDS: 'selectedFields',
} as const;

export type OutputMode = (typeof OUTPUT_MODES)[keyof typeof OUTPUT_MODES];

// CONDITION TYPES (for filtering)

export const CONDITION_TYPES = {
	EQUALS: 'eq',
	GREATER_THAN_OR_EQUAL: 'gteq',
	LESS_THAN: 'lt',
	RANGE: 'range',
	INCLUDES_ALL: 'includesAll',
	INCLUDES_ANY: 'includesAny',
	IS_ONE_OF: 'isOneOf',
} as const;

export type ConditionType = (typeof CONDITION_TYPES)[keyof typeof CONDITION_TYPES];

// FILTER TYPES (common across resources)

export const FILTER_TYPES = {
	CREATED_AT_START: 'createdAtStart',
	CREATED_AT_END: 'createdAtEnd',
	METADATA: 'metadata',
	PUBLIC_DATA: 'publicData',
	PRIVATE_DATA: 'privateData',
	PROTECTED_DATA: 'protectedData',
} as const;

export type FilterType = (typeof FILTER_TYPES)[keyof typeof FILTER_TYPES];

// COMMON FILTER OPTIONS (for filter type dropdowns)

export const COMMON_FILTER_OPTIONS = {
	CREATED_BEFORE: {
		name: 'Created Before',
		value: FILTER_TYPES.CREATED_AT_END,
		description: 'Filter by creation date before a specific date and time',
	},
	CREATED_ON_OR_AFTER: {
		name: 'Created On or After',
		value: FILTER_TYPES.CREATED_AT_START,
		description: 'Filter by creation date on or after a specific date and time',
	},
	METADATA: {
		name: 'Metadata Field',
		value: FILTER_TYPES.METADATA,
		description: 'Filter by custom metadata field values',
	},
	PUBLIC_DATA: {
		name: 'Public Data Field',
		value: FILTER_TYPES.PUBLIC_DATA,
		description: 'Filter by public data field values',
	},
	PRIVATE_DATA: {
		name: 'Private Data Field',
		value: FILTER_TYPES.PRIVATE_DATA,
		description: 'Filter by private data field values',
	},
	PROTECTED_DATA: {
		name: 'Protected Data Field',
		value: FILTER_TYPES.PROTECTED_DATA,
		description: 'Filter by protected data field values',
	},
} as const;

/**
 * Common filter options as array for UI dropdowns
 */
export const COMMON_FILTER_OPTIONS_ARRAY = [
	COMMON_FILTER_OPTIONS.CREATED_ON_OR_AFTER,
	COMMON_FILTER_OPTIONS.CREATED_BEFORE,
	COMMON_FILTER_OPTIONS.METADATA,
	COMMON_FILTER_OPTIONS.PRIVATE_DATA,
	COMMON_FILTER_OPTIONS.PROTECTED_DATA,
	COMMON_FILTER_OPTIONS.PUBLIC_DATA,
] as const;

// TRANSACTION-SPECIFIC FILTER OPTIONS

export const TRANSACTION_FILTER_OPTIONS = {
	BOOKING_END: {
		name: 'Booking End',
		value: 'bookingEnd',
		description: 'Filter by booking end date with range options',
	},
	BOOKING_START: {
		name: 'Booking Start',
		value: 'bookingStart',
		description: 'Filter by booking start date with range options',
	},
	BOOKING_STATES: {
		name: 'Booking States',
		value: 'bookingStates',
		description: 'Filter by booking states (accepted, pending, etc.)',
	},
	CUSTOMER_ID: {
		name: 'Customer ID',
		value: 'customerId',
		description: 'Filter by specific customer/buyer ID',
	},
	HAS_BOOKING: {
		name: 'Has Booking',
		value: 'hasBooking',
		description: 'Filter transactions that have or do not have bookings',
	},
	HAS_MESSAGE: {
		name: 'Has Message',
		value: 'hasMessage',
		description: 'Filter transactions that have or do not have messages',
	},
	HAS_PAYIN: {
		name: 'Has Payin',
		value: 'hasPayin',
		description: 'Filter transactions that have or do not have payins',
	},
	HAS_STOCK_RESERVATION: {
		name: 'Has Stock Reservation',
		value: 'hasStockReservation',
		description: 'Filter transactions that have or do not have stock reservations',
	},
	LAST_TRANSITION: {
		name: 'Last Transition',
		value: 'lastTransition',
		description: "Filter by transaction's last transition",
	},
	LISTING_ID: {
		name: 'Listing ID',
		value: 'listingId',
		description: 'Filter by specific listing ID',
	},
	PROCESS_NAMES: {
		name: 'Process Names',
		value: 'processNames',
		description: 'Filter by transaction process names',
	},
	PROVIDER_ID: {
		name: 'Provider ID',
		value: 'providerId',
		description: 'Filter by specific provider/seller ID',
	},
	STATES: {
		name: 'States',
		value: 'states',
		description: 'Filter by transaction states (confirmed, paid, etc.)',
	},
} as const;

/**
 * Transaction filter options as array for UI dropdowns
 * Combines transaction-specific and common filter options in a logical order
 */
export const TRANSACTION_FILTER_OPTIONS_ARRAY = [
	TRANSACTION_FILTER_OPTIONS.BOOKING_END,
	TRANSACTION_FILTER_OPTIONS.BOOKING_START,
	TRANSACTION_FILTER_OPTIONS.BOOKING_STATES,
	COMMON_FILTER_OPTIONS.CREATED_ON_OR_AFTER,
	COMMON_FILTER_OPTIONS.CREATED_BEFORE,
	TRANSACTION_FILTER_OPTIONS.CUSTOMER_ID,
	TRANSACTION_FILTER_OPTIONS.HAS_BOOKING,
	TRANSACTION_FILTER_OPTIONS.HAS_MESSAGE,
	TRANSACTION_FILTER_OPTIONS.HAS_PAYIN,
	TRANSACTION_FILTER_OPTIONS.HAS_STOCK_RESERVATION,
	TRANSACTION_FILTER_OPTIONS.LAST_TRANSITION,
	TRANSACTION_FILTER_OPTIONS.LISTING_ID,
	COMMON_FILTER_OPTIONS.METADATA,
	COMMON_FILTER_OPTIONS.PRIVATE_DATA,
	TRANSACTION_FILTER_OPTIONS.PROCESS_NAMES,
	COMMON_FILTER_OPTIONS.PROTECTED_DATA,
	TRANSACTION_FILTER_OPTIONS.PROVIDER_ID,
	COMMON_FILTER_OPTIONS.PUBLIC_DATA,
	TRANSACTION_FILTER_OPTIONS.STATES,
] as const;

// SORT DIRECTIONS

export const SORT_DIRECTIONS = {
	ASCENDING: 'ASC',
	DESCENDING: 'DESC',
} as const;

export type SortDirection = (typeof SORT_DIRECTIONS)[keyof typeof SORT_DIRECTIONS];

// COMMON SORT FIELDS (for sort field dropdowns)

export const COMMON_SORT_FIELDS = {
	CREATED_AT: {
		name: 'Created At',
		value: 'createdAt',
		description: 'Sort by creation date',
	},
	METADATA: {
		name: 'Metadata Field',
		value: 'metadata',
		description: 'Sort by custom metadata field',
	},
	PUBLIC_DATA: {
		name: 'Public Data Field',
		value: 'publicData',
		description: 'Sort by public data field',
	},
	PRIVATE_DATA: {
		name: 'Private Data Field',
		value: 'privateData',
		description: 'Sort by private data field',
	},
	PROTECTED_DATA: {
		name: 'Protected Data Field',
		value: 'protectedData',
		description: 'Sort by protected data field',
	},
} as const;

/**
 * Common sort fields as array for UI dropdowns
 */
export const COMMON_SORT_FIELDS_ARRAY = [
	COMMON_SORT_FIELDS.CREATED_AT,
	COMMON_SORT_FIELDS.METADATA,
	COMMON_SORT_FIELDS.PUBLIC_DATA,
	COMMON_SORT_FIELDS.PRIVATE_DATA,
	COMMON_SORT_FIELDS.PROTECTED_DATA,
] as const;

/**
 * Transaction sort fields as array for UI dropdowns
 * Combines transaction-specific and common sort fields
 */
export const TRANSACTION_SORT_FIELDS_ARRAY = [
	{ ...COMMON_SORT_FIELDS.CREATED_AT, description: 'Sort by transaction creation time' },
	{
		name: 'Last Transition At',
		value: 'lastTransitionAt',
		description: 'Sort by last transition time',
	},
	{ ...COMMON_SORT_FIELDS.METADATA, description: 'Sort by a top level metadata field' },
	{
		...COMMON_SORT_FIELDS.PROTECTED_DATA,
		description: 'Sort by a top level protected data field',
	},
] as const;

/**
 * Sort direction options as array for UI dropdowns
 */
export const SORT_DIRECTION_OPTIONS_ARRAY = [
	{
		name: 'ASC',
		value: SORT_DIRECTIONS.ASCENDING,
		description: 'Sort in descending order',
	},
	{
		name: 'DESC',
		value: SORT_DIRECTIONS.DESCENDING,
		description: 'Sort in ascending order',
	},
] as const;

// ATTRIBUTE KEYS (for each resource type)

/**
 * User attribute keys that are valid for sparse fields
 */
export const USER_ATTRIBUTE_KEYS = [
	'email',
	'emailVerified',
	'pendingEmail',
	'stripeConnected',
	'createdAt',
	'profile',
	'userType',
	'publicData',
	'protectedData',
	'privateData',
	'metadata',
	'permissions',
] as const;

/**
 * Listing attribute keys that are valid for sparse fields
 * Per API doc: title, description, geolocation, createdAt, price, availabilityPlan,
 * publicData, privateData, metadata, state, deleted
 */
export const LISTING_ATTRIBUTE_KEYS = [
	'title',
	'description',
	'geolocation',
	'createdAt',
	'state',
	'deleted',
	'listingType',
	'availabilityPlan',
	'timezone',
	'price',
	'publicData',
	'privateData',
	'metadata',
] as const;

/**
 * Transaction attribute keys that are valid for sparse fields
 */
export const TRANSACTION_ATTRIBUTE_KEYS = [
	'createdAt',
	'processName',
	'processVersion',
	'lastTransition',
	'lastTransitionedAt',
	'state',
	'transitions',
	'payinTotal',
	'payoutTotal',
	'lineItems',
	'protectedData',
	'metadata',
] as const;

// USER FIELD MAPPINGS (UI name → API path)

/**
 * Maps user attribute UI names to their API field paths.
 * Some fields are nested under 'profile' in the API.
 */
export const USER_ATTRIBUTE_FIELD_MAP: Record<string, string> = {
	firstName: 'profile.firstName',
	lastName: 'profile.lastName',
	displayName: 'profile.displayName',
	abbreviatedName: 'profile.abbreviatedName',
	bio: 'profile.bio',
	publicData: 'profile.publicData',
	protectedData: 'profile.protectedData',
	privateData: 'profile.privateData',
	email: 'email',
	emailVerified: 'emailVerified',
	createdAt: 'createdAt',
	state: 'state',
	profileImage: 'profileImage',
	metadata: 'profile.metadata',
	pendingEmail: 'pendingEmail',
	stripeConnected: 'stripeConnected',
	stripeAccount: 'stripeAccount',
	identityProviders: 'identityProviders',
	deleted: 'deleted',
	effectivePermissionSet: 'effectivePermissionSet',
	permissions: 'permissions',
	userType: 'profile.publicData.userType',
};

// RELATIONSHIP KEYS (for include parameters)

export const USER_RELATIONSHIPS = {
	MARKETPLACE: 'marketplace',
	PROFILE_IMAGE: 'profileImage',
	STRIPE_ACCOUNT: 'stripeAccount',
	EFFECTIVE_PERMISSION_SET: 'effectivePermissionSet',
} as const;

// Array of all user relationship values for filtering
export const USER_RELATIONSHIP_VALUES: string[] = Object.values(USER_RELATIONSHIPS);

export const LISTING_RELATIONSHIPS = {
	AUTHOR: 'author',
	IMAGES: 'images',
	MARKETPLACE: 'marketplace',
	CURRENT_STOCK: 'currentStock',
} as const;

export const TRANSACTION_RELATIONSHIPS = {
	CUSTOMER: 'customer',
	PROVIDER: 'provider',
	LISTING: 'listing',
	BOOKING: 'booking',
	REVIEWS: 'reviews',
	MESSAGES: 'messages',
	MARKETPLACE: 'marketplace',
} as const;

export const STOCK_RELATIONSHIPS = {
	LISTING: 'listing',
	LISTING_AUTHOR: 'listing.author',
	LISTING_CURRENT_STOCK: 'currentStock',
	TRANSACTION: 'transaction',
	TRANSACTION_CUSTOMER: 'customer',
	TRANSACTION_PROVIDER: 'provider',
	STOCK_RESERVATION: 'stockReservation',
	STOCK_RESERVATION_TRANSACTION: 'stockReservation.transaction',
	STOCK_ADJUSTMENTS: 'stockAdjustments',
} as const;

export const AVAILABILITY_EXCEPTION_RELATIONSHIPS = {
	LISTING: 'listing',
} as const;

export const EVENT_RELATIONSHIPS = {
	RESOURCE: 'resource',
	MARKETPLACE: 'marketplace',
} as const;

/**
 * Union type of all valid relationship paths across all resources
 * Used in includeOptions parameters to specify which related resources to fetch
 */
export type RelationshipPath =
	| (typeof USER_RELATIONSHIPS)[keyof typeof USER_RELATIONSHIPS]
	| (typeof LISTING_RELATIONSHIPS)[keyof typeof LISTING_RELATIONSHIPS]
	| (typeof TRANSACTION_RELATIONSHIPS)[keyof typeof TRANSACTION_RELATIONSHIPS]
	| (typeof STOCK_RELATIONSHIPS)[keyof typeof STOCK_RELATIONSHIPS]
	| (typeof EVENT_RELATIONSHIPS)[keyof typeof EVENT_RELATIONSHIPS];

// FILTER TYPES (for query operations)

export const LISTING_FILTER_TYPES = {
	AUTHOR_ID: 'authorId',
	AVAILABILITY: 'availability',
	CATEGORY: 'category',
	CREATED_AT_END: 'createdAtEnd',
	CREATED_AT_START: 'createdAtStart',
	IDS: 'ids',
	KEYWORDS: 'keywords',
	LISTING_TYPE: 'listingType',
	ORIGIN: 'origin',
	BOUNDS: 'bounds',
	METADATA: 'metadata',
	PRICE: 'price',
	PRIVATE_DATA: 'privateData',
	PUBLIC_DATA: 'publicData',
	STATES: 'states',
	STOCK: 'stock',
} as const;

export const TRANSACTION_FILTER_TYPES = {
	BOOKING_END: 'bookingEnd',
	BOOKING_START: 'bookingStart',
	BOOKING_STATES: 'bookingStates',
	CREATED_AT_END: 'createdAtEnd',
	CREATED_AT_START: 'createdAtStart',
	CUSTOMER_ID: 'customerId',
	HAS_BOOKING: 'hasBooking',
	HAS_MESSAGE: 'hasMessage',
	HAS_PAYIN: 'hasPayin',
	HAS_STOCK_RESERVATION: 'hasStockReservation',
	IDS: 'ids',
	LAST_TRANSITION: 'lastTransition',
	LISTING_ID: 'listingId',
	METADATA: 'metadata',
	PRIVATE_DATA: 'privateData',
	PROTECTED_DATA: 'protectedData',
	PROCESS_NAMES: 'processNames',
	PROVIDER_ID: 'providerId',
	PUBLIC_DATA: 'publicData',
	STATES: 'states',
	STOCK_RESERVATION_STATES: 'stockReservationStates',
} as const;

export const USER_FILTER_TYPES = {
	CREATED_AT_END: 'createdAtEnd',
	CREATED_AT_START: 'createdAtStart',
	EMAIL: 'email',
	IDS: 'ids',
	METADATA: 'metadata',
	PRIVATE_DATA: 'privateData',
	PROTECTED_DATA: 'protectedData',
	PUBLIC_DATA: 'publicData',
	STATE: 'state',
} as const;

// FILTER TYPE METADATA CONFIGURATION

/**
 * Metadata about filter type behavior and constraints
 */
export interface FilterTypeMetadata {
	/** Whether this filter can be used multiple times (default: true) */
	repeatable?: boolean;
	/** Filter types that cannot be used together with this filter */
	mutuallyExclusive?: string[];
}

/**
 * Centralized configuration for listing filter type behavior
 * Defines repeatability and mutual exclusivity constraints
 */
export const LISTING_FILTER_METADATA: Record<string, FilterTypeMetadata> = {
	[LISTING_FILTER_TYPES.KEYWORDS]: {
		repeatable: false,
		mutuallyExclusive: [LISTING_FILTER_TYPES.ORIGIN, LISTING_FILTER_TYPES.BOUNDS],
	},
	[LISTING_FILTER_TYPES.ORIGIN]: {
		repeatable: false,
		mutuallyExclusive: [LISTING_FILTER_TYPES.KEYWORDS],
	},
	[LISTING_FILTER_TYPES.BOUNDS]: {
		repeatable: false,
	},
	[LISTING_FILTER_TYPES.IDS]: {
		repeatable: false,
	},
	[LISTING_FILTER_TYPES.AUTHOR_ID]: {
		repeatable: false,
	},
	[LISTING_FILTER_TYPES.AVAILABILITY]: {
		repeatable: false,
	},
	[LISTING_FILTER_TYPES.CATEGORY]: {
		repeatable: true,
	},
	[LISTING_FILTER_TYPES.CREATED_AT_END]: {
		repeatable: false,
	},
	[LISTING_FILTER_TYPES.CREATED_AT_START]: {
		repeatable: false,
	},
	[LISTING_FILTER_TYPES.LISTING_TYPE]: {
		repeatable: true,
	},
	[LISTING_FILTER_TYPES.PRICE]: {
		repeatable: false,
	},
	[LISTING_FILTER_TYPES.STATES]: {
		repeatable: false,
	},
	[LISTING_FILTER_TYPES.STOCK]: {
		repeatable: false,
	},
	// Extended data filters can be repeated with different attribute names
	[LISTING_FILTER_TYPES.METADATA]: {
		repeatable: true,
	},
	[LISTING_FILTER_TYPES.PRIVATE_DATA]: {
		repeatable: true,
	},
	[LISTING_FILTER_TYPES.PUBLIC_DATA]: {
		repeatable: true,
	},
};

/**
 * Centralized configuration for transaction filter type behavior
 */
export const TRANSACTION_FILTER_METADATA: Record<string, FilterTypeMetadata> = {
	[TRANSACTION_FILTER_TYPES.BOOKING_END]: {
		repeatable: false,
	},
	[TRANSACTION_FILTER_TYPES.BOOKING_START]: {
		repeatable: false,
	},
	[TRANSACTION_FILTER_TYPES.BOOKING_STATES]: {
		repeatable: false,
	},
	[TRANSACTION_FILTER_TYPES.CREATED_AT_END]: {
		repeatable: false,
	},
	[TRANSACTION_FILTER_TYPES.CREATED_AT_START]: {
		repeatable: false,
	},
	[TRANSACTION_FILTER_TYPES.CUSTOMER_ID]: {
		repeatable: false,
	},
	[TRANSACTION_FILTER_TYPES.HAS_BOOKING]: {
		repeatable: false,
	},
	[TRANSACTION_FILTER_TYPES.HAS_MESSAGE]: {
		repeatable: false,
	},
	[TRANSACTION_FILTER_TYPES.HAS_PAYIN]: {
		repeatable: false,
	},
	[TRANSACTION_FILTER_TYPES.HAS_STOCK_RESERVATION]: {
		repeatable: false,
	},
	[TRANSACTION_FILTER_TYPES.IDS]: {
		repeatable: false,
	},
	[TRANSACTION_FILTER_TYPES.LAST_TRANSITION]: {
		repeatable: true,
	},
	[TRANSACTION_FILTER_TYPES.LISTING_ID]: {
		repeatable: false,
	},
	[TRANSACTION_FILTER_TYPES.PROCESS_NAMES]: {
		repeatable: true,
	},
	[TRANSACTION_FILTER_TYPES.PROVIDER_ID]: {
		repeatable: false,
	},
	[TRANSACTION_FILTER_TYPES.STATES]: {
		repeatable: true,
	},
	[TRANSACTION_FILTER_TYPES.STOCK_RESERVATION_STATES]: {
		repeatable: false,
	},
	// Extended data filters can be repeated with different attribute names
	[TRANSACTION_FILTER_TYPES.METADATA]: {
		repeatable: true,
	},
	[TRANSACTION_FILTER_TYPES.PRIVATE_DATA]: {
		repeatable: true,
	},
	[TRANSACTION_FILTER_TYPES.PROTECTED_DATA]: {
		repeatable: true,
	},
	[TRANSACTION_FILTER_TYPES.PUBLIC_DATA]: {
		repeatable: true,
	},
};

/**
 * Centralized configuration for user filter type behavior
 */
export const USER_FILTER_METADATA: Record<string, FilterTypeMetadata> = {
	[USER_FILTER_TYPES.CREATED_AT_END]: {
		repeatable: false,
	},
	[USER_FILTER_TYPES.CREATED_AT_START]: {
		repeatable: false,
	},
	[USER_FILTER_TYPES.EMAIL]: {
		repeatable: false,
	},
	[USER_FILTER_TYPES.IDS]: {
		repeatable: false,
	},
	[USER_FILTER_TYPES.STATE]: {
		repeatable: false,
	},
	// Extended data filters can be repeated with different attribute names
	[USER_FILTER_TYPES.METADATA]: {
		repeatable: true,
	},
	[USER_FILTER_TYPES.PRIVATE_DATA]: {
		repeatable: true,
	},
	[USER_FILTER_TYPES.PROTECTED_DATA]: {
		repeatable: true,
	},
	[USER_FILTER_TYPES.PUBLIC_DATA]: {
		repeatable: true,
	},
};

// SORT FIELD TYPES

export const LISTING_SORT_FIELDS = {
	CREATED_AT: 'createdAt',
	METADATA: 'metadata',
	PRICE: 'price',
	PRIVATE_DATA: 'privateData',
	PUBLIC_DATA: 'publicData',
} as const;

export const TRANSACTION_SORT_FIELDS = {
	CREATED_AT: 'createdAt',
	LAST_TRANSITIONED_AT: 'lastTransitionedAt',
	METADATA: 'metadata',
	PROTECTED_DATA: 'protectedData',
} as const;

export const USER_SORT_FIELDS = {
	CREATED_AT: 'createdAt',
	METADATA: 'metadata',
	PRIVATE_DATA: 'privateData',
	PROTECTED_DATA: 'protectedData',
	PUBLIC_DATA: 'publicData',
} as const;

// NODE PARAMETER NAMES (n8n UI parameters)
// Following n8n style guide: use direct strings in displayOptions.show
// Example: resource: [UI_RESOURCES.LISTING]

// HTTP HEADERS

export const HEADERS = {
	CONTENT_TYPE_JSON: 'application/json; charset=utf-8',
	CONTENT_TYPE_MULTIPART: 'multipart/form-data',
} as const;

// PROFILE NESTED FIELDS

/**
 * User fields that are nested under the 'profile' object in the API
 */
export const PROFILE_NESTED_FIELDS = [
	'firstName',
	'lastName',
	'displayName',
	'abbreviatedName',
	'bio',
	'publicData',
	'protectedData',
	'privateData',
] as const;

// WEBHOOK EVENT TYPES

/**
 * Event types for Sharetribe webhooks/triggers
 * Used in trigger node to allow users to subscribe to specific events
 */
export const SHARETRIBE_EVENT_TYPES: Record<string, { name: string; value: string }[]> = {
	listing: [
		{ name: 'All Listing Events', value: 'listing' },
		{ name: 'Listing Created', value: 'listing/created' },
		{ name: 'Listing Updated', value: 'listing/updated' },
		{ name: 'Listing Deleted', value: 'listing/deleted' },
	],
	user: [
		{ name: 'All User Events', value: 'user' },
		{ name: 'User Created', value: 'user/created' },
		{ name: 'User Updated', value: 'user/updated' },
		{ name: 'User Deleted', value: 'user/deleted' },
	],
	availabilityException: [
		{ name: 'All Availability Exception Events', value: 'availabilityException' },
		{ name: 'Availability Exception Created', value: 'availabilityException/created' },
		{ name: 'Availability Exception Updated', value: 'availabilityException/updated' },
		{ name: 'Availability Exception Deleted', value: 'availabilityException/deleted' },
	],
	message: [
		{ name: 'All Message Events', value: 'message' },
		{ name: 'Message Created', value: 'message/created' },
		{ name: 'Message Updated', value: 'message/updated' },
		{ name: 'Message Deleted', value: 'message/deleted' },
	],
	transaction: [
		{ name: 'All Transaction Events', value: 'transaction' },
		{ name: 'Transaction Initiated', value: 'transaction/initiated' },
		{ name: 'Transaction Transitioned', value: 'transaction/transitioned' },
		{ name: 'Transaction Updated', value: 'transaction/updated' },
		{ name: 'Transaction Deleted', value: 'transaction/deleted' },
	],
	booking: [
		{ name: 'All Booking Events', value: 'booking' },
		{ name: 'Booking Created', value: 'booking/created' },
		{ name: 'Booking Updated', value: 'booking/updated' },
		{ name: 'Booking Deleted', value: 'booking/deleted' },
	],
	review: [
		{ name: 'All Review Events', value: 'review' },
		{ name: 'Review Created', value: 'review/created' },
		{ name: 'Review Updated', value: 'review/updated' },
		{ name: 'Review Deleted', value: 'review/deleted' },
	],
	stockAdjustment: [
		{ name: 'All Stock Adjustment Events', value: 'stockAdjustment' },
		{ name: 'Stock Adjustment Created', value: 'stockAdjustment/created' },
		{ name: 'Stock Adjustment Updated', value: 'stockAdjustment/updated' },
		{ name: 'Stock Adjustment Deleted', value: 'stockAdjustment/deleted' },
	],
	stockReservation: [
		{ name: 'All Stock Reservation Events', value: 'stockReservation' },
		{ name: 'Stock Reservation Created', value: 'stockReservation/created' },
		{ name: 'Stock Reservation Updated', value: 'stockReservation/updated' },
		{ name: 'Stock Reservation Deleted', value: 'stockReservation/deleted' },
	],
	all: [
		{ name: 'All Events', value: '' },
		{ name: 'Availability Exception Created', value: 'availabilityException/created' },
		{ name: 'Availability Exception Deleted', value: 'availabilityException/deleted' },
		{ name: 'Availability Exception Updated', value: 'availabilityException/updated' },
		{ name: 'Booking Created', value: 'booking/created' },
		{ name: 'Booking Deleted', value: 'booking/deleted' },
		{ name: 'Booking Updated', value: 'booking/updated' },
		{ name: 'Listing Created', value: 'listing/created' },
		{ name: 'Listing Deleted', value: 'listing/deleted' },
		{ name: 'Listing Updated', value: 'listing/updated' },
		{ name: 'Message Created', value: 'message/created' },
		{ name: 'Message Deleted', value: 'message/deleted' },
		{ name: 'Message Updated', value: 'message/updated' },
		{ name: 'Review Created', value: 'review/created' },
		{ name: 'Review Deleted', value: 'review/deleted' },
		{ name: 'Review Updated', value: 'review/updated' },
		{ name: 'Stock Adjustment Created', value: 'stockAdjustment/created' },
		{ name: 'Stock Adjustment Deleted', value: 'stockAdjustment/deleted' },
		{ name: 'Stock Adjustment Updated', value: 'stockAdjustment/updated' },
		{ name: 'Stock Reservation Created', value: 'stockReservation/created' },
		{ name: 'Stock Reservation Deleted', value: 'stockReservation/deleted' },
		{ name: 'Stock Reservation Updated', value: 'stockReservation/updated' },
		{ name: 'Transaction Deleted', value: 'transaction/deleted' },
		{ name: 'Transaction Initiated', value: 'transaction/initiated' },
		{ name: 'Transaction Transitioned', value: 'transaction/transitioned' },
		{ name: 'Transaction Updated', value: 'transaction/updated' },
		{ name: 'User Created', value: 'user/created' },
		{ name: 'User Deleted', value: 'user/deleted' },
		{ name: 'User Updated', value: 'user/updated' },
	],
};

// API BASE PATH

export const API_BASE_PATH = 'v1/integration_api';

export const BookingStates: string[] = ['cancelled', 'accepted', 'declined', 'pending', 'proposed'];

export enum CurrencyCode {
	AUD = 'AUD',
	BGN = 'BGN',
	CAD = 'CAD',
	CHF = 'CHF',
	CNY = 'CNY',
	CZK = 'CZK',
	DKK = 'DKK',
	EUR = 'EUR',
	GBP = 'GBP',
	HKD = 'HKD',
	INR = 'INR',
	JPY = 'JPY',
	MXN = 'MXN',
	NOK = 'NOK',
	NZD = 'NZD',
	PLN = 'PLN',
	RON = 'RON',
	SEK = 'SEK',
	SGD = 'SGD',
	USD = 'USD',
}

export const CURRENCY_SUBUNIT_DIVISORS: Record<CurrencyCode, number> = {
	[CurrencyCode.AUD]: 100,
	[CurrencyCode.BGN]: 100,
	[CurrencyCode.CAD]: 100,
	[CurrencyCode.CHF]: 100,
	[CurrencyCode.CNY]: 100,
	[CurrencyCode.CZK]: 100,
	[CurrencyCode.DKK]: 100,
	[CurrencyCode.EUR]: 100,
	[CurrencyCode.GBP]: 100,
	[CurrencyCode.HKD]: 100,
	[CurrencyCode.INR]: 100,
	[CurrencyCode.JPY]: 1,
	[CurrencyCode.MXN]: 100,
	[CurrencyCode.NOK]: 100,
	[CurrencyCode.NZD]: 100,
	[CurrencyCode.PLN]: 100,
	[CurrencyCode.RON]: 100,
	[CurrencyCode.SEK]: 100,
	[CurrencyCode.SGD]: 100,
	[CurrencyCode.USD]: 100,
};

// CACHE AND DISCOVERY CONFIGURATION

/**
 * Cache TTL (Time To Live) in seconds
 * Default: 5 minutes
 * When cache expires, incremental fetch is performed to learn from new transactions
 */
export const CACHE_TTL_SECONDS = 300;

/**
 * Number of resources to fetch for initial discovery
 * These limits apply when first populating the cache
 */
export const DISCOVERY_INITIAL_LIMITS = {
	TRANSACTIONS: 10,
	USERS: 10,
	LISTINGS: 10,
} as const;

/**
 * Number of resources to fetch on incremental refresh
 * These limits apply when cache expires and we fetch new data
 */
export const DISCOVERY_INCREMENTAL_LIMITS = {
	TRANSACTIONS: 10,
	USERS: 10,
	LISTINGS: 10,
} as const;

/**
 * Predefined publicData fields that have their own dedicated filters
 * These fields should be excluded from generic publicData dropdown since they're handled separately
 */
export const PREDEFINED_PUBLIC_DATA_FIELDS: string[] = [
	'publicData.categoryLevel1',
	'publicData.categoryLevel2',
	'publicData.categoryLevel3',
	'publicData.listingType',
];

// RELATIONSHIP OPTIONS

/**
 * User relationship field options
 */
export const USER_RELATIONSHIP_OPTIONS = [
	{ name: 'Abbreviated Name', value: 'abbreviatedName', description: "User's name initials" },
	{ name: 'Bio', value: 'bio', description: "User's biographical text" },
	{ name: 'Created At', value: 'createdAt', description: 'Date and time the user signed up' },
	{ name: 'Deleted', value: 'deleted', description: 'Flag indicating if the user is deleted' },
	{ name: 'Display Name', value: 'displayName', description: "User's chosen display name" },
	{ name: 'Email', value: 'email', description: "User's email address" },
	{
		name: 'Email Verified',
		value: 'emailVerified',
		description: 'Flag indicating if email is verified',
	},
	{ name: 'First Name', value: 'firstName', description: "User's first name" },
	{
		name: 'Identity Providers',
		value: 'identityProviders',
		description: 'Associated identity provider accounts',
	},
	{ name: 'Last Name', value: 'lastName', description: "User's last name" },
	{ name: 'Marketplace', value: 'marketplace', description: 'The marketplace of the user' },
	{ name: 'Metadata', value: 'metadata', description: 'Public metadata' },
	{ name: 'Pending Email', value: 'pendingEmail', description: 'Pending email change' },
	{
		name: 'Effective Permission Set',
		value: 'effectivePermissionSet',
		description: "User's final permissions, determined after considering all factors",
	},
	{
		name: 'Permissions',
		value: 'permissions',
		description:
			"User's provisional permissions, which may be modified by other factors such as global settings",
	},
	{ name: 'Private Data', value: 'privateData', description: 'Private extended data' },
	{ name: 'Profile Image', value: 'profileImage', description: "User's profile image" },
	{ name: 'Protected Data', value: 'protectedData', description: 'Protected extended data' },
	{ name: 'Public Data', value: 'publicData', description: 'Public extended data' },
	{ name: 'State', value: 'state', description: "User's state" },
	{ name: 'Stripe Account', value: 'stripeAccount', description: "User's Stripe Account" },
	{
		name: 'Stripe Connected',
		value: 'stripeConnected',
		description: 'Flag indicating Stripe account creation',
	},
	{
		name: 'User Type',
		value: 'userType',
		description: 'User type (from <code>publicData.userType</code>)',
	},
];

/**
 * Listing relationship field options
 */
export const LISTING_RELATIONSHIP_OPTIONS = [
	{ name: 'Author', value: 'author', description: 'Listing author' },
	{
		name: 'Availability Plan',
		value: 'availabilityPlan',
		description: 'Listing availability plan with type and timezone',
	},
	{
		name: 'Categories',
		value: 'categories',
		description: 'Categories for the listing - all levels',
	},
	{ name: 'Created At', value: 'createdAt', description: 'Date and time the listing was created' },
	{
		name: 'Current Stock',
		value: 'currentStock',
		description: "The listing's currently available stock",
	},
	{ name: 'Description', value: 'description', description: 'Listing description' },
	{ name: 'Geolocation', value: 'geolocation', description: 'Listing location coordinates' },
	{ name: 'Images', value: 'images', description: 'Listing images' },
	{ name: 'Marketplace', value: 'marketplace', description: 'The marketplace of the listing' },
	{ name: 'Metadata', value: 'metadata', description: 'Listing metadata' },
	{ name: 'Price', value: 'price', description: 'Listing price' },
	{ name: 'Private Data', value: 'privateData', description: 'Private extended data' },
	{ name: 'Public Data', value: 'publicData', description: 'Public extended data' },
	{ name: 'State', value: 'state', description: 'Listing state' },
	{ name: 'Timezone', value: 'timezone', description: 'Availability plan timezone' },
	{ name: 'Title', value: 'title', description: 'Listing title' },
	{
		name: 'Type',
		value: 'listingType',
		description: 'Listing type (from <code>publicData.listingType</code>)',
	},
];

/**
 * Transaction relationship field options
 */
export const TRANSACTION_RELATIONSHIP_OPTIONS = [
	{ name: 'Booking', value: 'booking', description: 'Transaction booking details' },
	{
		name: 'Created At',
		value: 'createdAt',
		description: 'Date and time the transaction was created',
	},
	{ name: 'Customer', value: 'customer', description: 'Transaction customer' },
	{ name: 'Last Transition', value: 'lastTransition', description: 'Last state transition' },
	{
		name: 'Last Transitioned At',
		value: 'lastTransitionedAt',
		description: 'Time of last transition',
	},
	{ name: 'Line Items', value: 'lineItems', description: 'Transaction line items' },
	{ name: 'Listing', value: 'listing', description: 'Associated listing' },
	{ name: 'Marketplace', value: 'marketplace', description: 'Marketplace information' },
	{ name: 'Messages', value: 'messages', description: 'Transaction messages' },
	{ name: 'Metadata', value: 'metadata', description: 'Transaction metadata' },
	{ name: 'Payin Total', value: 'payinTotal', description: 'Amount paid by the customer' },
	{ name: 'Payout Total', value: 'payoutTotal', description: 'Amount paid to the provider' },
	{ name: 'Process Name', value: 'processName', description: 'Transaction process name' },
	{ name: 'Process Version', value: 'processVersion', description: 'Transaction process version' },
	{ name: 'Protected Data', value: 'protectedData', description: "Transaction's protected data" },
	{ name: 'Provider', value: 'provider', description: 'Transaction provider' },
	{ name: 'Reviews', value: 'reviews', description: 'Transaction reviews' },
	{
		name: 'State',
		value: 'state',
		description: 'Transaction state, determined by last transition',
	},
	{ name: 'Transitions', value: 'transitions', description: "Transaction's transition history" },
];

/**
 * Availability exception relationship field options
 */
export const AVAILABILITY_EXCEPTION_RELATIONSHIP_OPTIONS = [
	{ name: 'End', value: 'end', description: 'Exception end date/time' },
	{ name: 'Listing', value: 'listing', description: 'Associated listing' },
	{ name: 'Seats', value: 'seats', description: 'Number of seats affected' },
	{ name: 'Start', value: 'start', description: 'Exception start date/time' },
];

/**
 * Stock adjustment relationship field options
 */
export const STOCK_RELATIONSHIP_OPTIONS = [
	{ name: 'Adjustment Time', value: 'at', description: 'When the adjustment takes effect' },
	{ name: 'Listing', value: 'listing', description: 'Associated listing' },
	{ name: 'Quantity', value: 'quantity', description: 'Adjustment quantity' },
	{
		name: 'Stock Reservation',
		value: 'stockReservation',
		description: 'Related stock reservation',
	},
];

export const EVENT_RELATIONSHIP_OPTIONS = [
	{ name: 'Created At', value: 'createdAt', description: 'When the event was created' },
	{ name: 'Event Type', value: 'eventType', description: 'Type of event' },
	{ name: 'Marketplace', value: 'marketplace', description: 'Associated marketplace' },
	{ name: 'Resource', value: 'resource', description: 'The resource this event relates to' },
	{ name: 'Resource ID', value: 'resourceId', description: 'ID of the related resource' },
	{ name: 'Resource Type', value: 'resourceType', description: 'Type of the related resource' },
	{ name: 'Sequence ID', value: 'sequenceId', description: 'Event sequence identifier' },
];

/**
 * Resource-specific relationship mapping
 * Maps each UI resource to its available relationship paths
 */
export const RESOURCE_RELATIONSHIPS: Record<UiResource, string[]> = {
	[UI_RESOURCES.USER]: ['marketplace', 'profileImage', 'stripeAccount', 'effectivePermissionSet'],
	[UI_RESOURCES.LISTING]: ['marketplace', 'author', 'images', 'currentStock'],
	[UI_RESOURCES.TRANSACTION]: ['customer', 'provider', 'listing', 'booking', 'reviews', 'messages'],
	[UI_RESOURCES.MARKETPLACE]: [],
	[UI_RESOURCES.STOCK]: ['listing', 'stockReservation'],
	[UI_RESOURCES.STOCK_RESERVATION]: [],
	[UI_RESOURCES.IMAGE]: [],
	[UI_RESOURCES.AVAILABILITY_EXCEPTIONS]: ['listing'],
	[UI_RESOURCES.ASSET]: [],
	[UI_RESOURCES.EVENT]: ['resource', 'marketplace'],
	[UI_RESOURCES.TIMESLOT]: [],
};

/**
 * Default field selections per resource
 * These are the fields shown in "Simplified" output mode
 */
export const RESOURCE_DEFAULTS: Record<string, readonly string[]> = {
	user: [
		'createdAt',
		'deleted',
		'email',
		'emailVerified',
		'firstName',
		'lastName',
		'state',
		'userType', // Flattened from publicData.userType
	],
	listing: [
		'createdAt',
		'listingType', // Flattened from publicData.listingType
		'price',
		'state',
		'title',
	],
	transaction: [
		'booking',
		'createdAt',
		'customer',
		'lastTransition',
		'lastTransitionedAt',
		'payinTotal',
		'payoutTotal',
		'processName',
		'state',
	],
	availabilityException: ['start', 'end', 'seats'],
	stock: ['at', 'quantity'],
	asset: ['path', 'data', 'version'],
	event: [
		'sequenceId',
		'eventType',
		'resourceType',
		'resourceId',
		'createdAt',
		'marketplace',
		'resource',
	],
};

/**
 * Category structure for listing categories
 */
export interface Category {
	id: string;
	name: string;
	subcategories?: Category[];
}

/**
 * Category data response structure
 */
export interface CategoryData {
	data: {
		categories: Category[];
	};
}

/**
 * Listing types asset response from Sharetribe Asset Delivery API
 */
export interface ListingTypesAssetResponse {
	data: Array<{
		id: string;
		type: 'jsonAsset';
		attributes: {
			assetPath: string;
			data: {
				listingTypes: Array<{
					id: string;
					label: string;
					unitType: string;
					transactionProcess: {
						name: string;
						alias: string;
					};
					defaultListingFields: IDataObject;
				}>;
			};
		};
	}>;
	meta: {
		version: string;
	};
}

/**
 * Listing categories asset response from Sharetribe Asset Delivery API
 */
export interface ListingCategoriesAssetResponse {
	data: Array<{
		id: string;
		type: 'jsonAsset';
		attributes: {
			assetPath: string;
			data: {
				categories: Category[];
			};
		};
	}>;
	meta: {
		version: string;
	};
}

/**
 * Listing fields asset response from Sharetribe Asset Delivery API
 * Contains field definitions with filter indexing configuration
 */
export interface ListingFieldsAssetResponse {
	data: Array<{
		id: string;
		type: 'jsonAsset';
		attributes: {
			assetPath: string;
			data: {
				listingFields: Array<{
					key: string;
					scope: 'public' | 'private' | 'metadata';
					schemaType: string;
					label: string;
					filterConfig: {
						indexForSearch: boolean;
						group?: string;
						showFilter?: boolean;
					};
					enumOptions?: Array<{ option: string; label: string }>;
					listingTypeConfig?: {
						limitToListingTypeIds: boolean;
						listingTypeIds: string[];
					};
				}>;
			};
		};
	}>;
	meta: {
		version: string;
	};
}

/**
 * User fields asset response from Sharetribe Asset Delivery API
 * Contains user field definitions (no filter indexing info)
 */
export interface UserFieldsAssetResponse {
	data: Array<{
		id: string;
		type: 'jsonAsset';
		attributes: {
			assetPath: string;
			data: {
				userFields: Array<{
					key: string;
					scope: 'public' | 'private' | 'protected';
					schemaType: string;
					label: string;
					enumOptions?: Array<{ option: string; label: string }>;
					saveConfig?: {
						displayInSignUp?: boolean;
						required?: boolean;
					};
					userTypeConfig?: {
						limitToUserTypeIds: boolean;
						userTypeIds: string[];
					};
				}>;
			};
		};
	}>;
	meta: {
		version: string;
	};
}

/**
 * User types asset response from Sharetribe Asset Delivery API
 */
export interface UserTypesAssetResponse {
	data: Array<{
		id: string;
		type: 'jsonAsset';
		attributes: {
			assetPath: string;
			data: {
				userTypes: Array<{
					id: string;
					label: string;
					roles?: {
						provider?: boolean;
						customer?: boolean;
					};
					defaultUserFields?: Record<string, boolean>;
				}>;
			};
		};
	}>;
	meta: {
		version: string;
	};
}

/**
 * Result of fetching an image from an external URL via {@link fetchExternalImageFromUrl}.
 */
export interface FetchedImage {
	/** The raw image data */
	buffer: Buffer;
	/** Filename extracted from Content-Disposition header, or 'image' as default */
	fileName: string;
	/** MIME type from Content-Type header, or 'application/octet-stream' as default */
	contentType: string;
}
