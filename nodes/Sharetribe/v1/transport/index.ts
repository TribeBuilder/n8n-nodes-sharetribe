import type {
	IExecuteFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
	IPollFunctions,
	IWebhookFunctions,
	GenericValue,
	IDataObject,
	IHttpRequestMethods,
	IHttpRequestOptions,
	JsonObject,
} from 'n8n-workflow';

import { NodeApiError, NodeOperationError, sleep } from 'n8n-workflow';
import type { SharetribeApiResponseType } from '../helpers/Sharetribe.types';
import { extractClientIdFromHtml } from '../helpers/Sharetribe.utils';

type TransportContext =
	| IExecuteFunctions
	| ILoadOptionsFunctions
	| IHookFunctions
	| IPollFunctions
	| IWebhookFunctions;

interface CachedAnonymousToken {
	token: string;
	expiresAt: number;
}

interface CachedMarketplaceClientId {
	clientId: string;
	marketplaceUrl: string;
}

/**
 * Clear cached anonymous token (e.g., on 401 error)
 */
export function clearAnonymousToken(context: TransportContext): void {
	const staticData = context.getWorkflowStaticData('node');
	delete staticData.anonymousToken;
}

/**
 * Resolves the marketplace client ID from credentials or by extracting it from the marketplace URL.
 * Caches extracted client IDs in workflow static data alongside the URL they were extracted from,
 * so URL changes trigger re-extraction.
 */
export async function getMarketplaceClientId(context: TransportContext): Promise<string> {
	const credentials = await context.getCredentials('sharetribeOAuth2Api');
	const proPlan = credentials.planType === 'pro';

	if (!proPlan) {
		const clientId = credentials.marketplaceApiClientId as string;
		if (!clientId) {
			throw new NodeOperationError(
				context.getNode(),
				'Marketplace API Client ID is required. Please configure your Sharetribe credentials.',
			);
		}
		return clientId;
	}

	const marketplaceUrl = credentials.marketplaceUrl as string;
	if (!marketplaceUrl) {
		throw new NodeOperationError(
			context.getNode(),
			'Marketplace URL is required for Pro plan setup. Please configure your Sharetribe credentials.',
		);
	}

	const staticData = context.getWorkflowStaticData('node');
	const cached = staticData.marketplaceClientId as CachedMarketplaceClientId | undefined;

	if (cached && cached.marketplaceUrl === marketplaceUrl) {
		return cached.clientId;
	}

	let htmlResponse: string;
	try {
		htmlResponse = await context.helpers.httpRequest({
			method: 'GET',
			url: marketplaceUrl,
			headers: {
				'User-Agent': 'n8n-sharetribe-integration/1.0',
				Accept: 'text/html',
			},
		});
	} catch (error) {
		throw new NodeOperationError(
			context.getNode(),
			`Please check the 'Marketplace URL' in your Sharetribe credentials is correct: ${marketplaceUrl}`,
			{ description: error.message || 'Network error' },
		);
	}

	const clientId = extractClientIdFromHtml(htmlResponse);
	if (!clientId) {
		throw new NodeOperationError(
			context.getNode(),
			`Could not extract Marketplace API Client ID from ${marketplaceUrl}. Please verify the URL is correct and publicly accessible.`,
		);
	}

	staticData.marketplaceClientId = {
		clientId,
		marketplaceUrl,
	} as CachedMarketplaceClientId;

	context.logger.debug(`[Sharetribe] Extracted marketplace client ID from ${marketplaceUrl}`);

	return clientId;
}

/**
 * Get or fetch anonymous access token with caching
 * Stores token in node static data and only refreshes when expired
 */
export async function getAnonymousToken(context: TransportContext): Promise<string> {
	const staticData = context.getWorkflowStaticData('node');
	const cached = staticData.anonymousToken as CachedAnonymousToken | undefined;

	if (cached && cached.expiresAt > Date.now()) {
		return cached.token;
	}

	const credentials = await context.getCredentials('sharetribeOAuth2Api');
	const marketplaceClientId = await getMarketplaceClientId(context);
	const marketplaceApiBaseUrl = credentials.marketplaceApiBaseUrl as string;

	const tokenResponse = await context.helpers.httpRequest({
		method: 'POST',
		url: `${marketplaceApiBaseUrl}/v1/auth/token`,
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded',
			Accept: 'application/json',
		},
		body: `client_id=${marketplaceClientId}&grant_type=client_credentials&scope=public-read`,
	});

	const accessToken = tokenResponse.access_token as string;
	const expiresIn = (tokenResponse.expires_in as number) || 3600;

	if (!accessToken) {
		throw new NodeOperationError(
			context.getNode(),
			'Failed to obtain anonymous access token from Marketplace API',
		);
	}

	staticData.anonymousToken = {
		token: accessToken,
		expiresAt: Date.now() + (expiresIn - 60) * 1000,
	};

	return accessToken;
}

/**
 * Token bucket rate limiter implementing Sharetribe API rate limits:
 * - Query endpoints: 1 req/sec (60/min)
 * - Command endpoints: 1 req/2sec (30/min)
 * - Listing creation: 100 req/min (always enforced)
 * - Max 10 concurrent requests
 */
class SharetribeRateLimiter {
	private static instance: SharetribeRateLimiter;
	private queryTokens: number = 100; // Start with full bucket
	private commandTokens: number = 100; // Start with full bucket
	private listingCreateTokens: number = 100; // Always rate limited
	private lastQueryRefill: number = Date.now();
	private lastCommandRefill: number = Date.now();
	private lastListingCreateRefill: number = Date.now();
	private activeCalls: number = 0;
	private readonly maxConcurrency: number = 10;

	static getInstance(): SharetribeRateLimiter {
		if (!SharetribeRateLimiter.instance) {
			SharetribeRateLimiter.instance = new SharetribeRateLimiter();
		}
		return SharetribeRateLimiter.instance;
	}

	private refillTokens(): void {
		const now = Date.now();

		const queryElapsed = (now - this.lastQueryRefill) / 1000;
		this.queryTokens = Math.min(100, this.queryTokens + queryElapsed);
		this.lastQueryRefill = now;

		const commandElapsed = (now - this.lastCommandRefill) / 1000;
		this.commandTokens = Math.min(100, this.commandTokens + commandElapsed / 2);
		this.lastCommandRefill = now;

		const listingElapsed = (now - this.lastListingCreateRefill) / 60000;
		this.listingCreateTokens = Math.min(100, this.listingCreateTokens + listingElapsed * 95);
		this.lastListingCreateRefill = now;
	}

	private isQueryEndpoint(method: string): boolean {
		return method === 'GET';
	}

	private isListingCreateEndpoint(endpoint: string): boolean {
		return endpoint === 'listings' || endpoint.endsWith('listings/create');
	}

	/**
	 * Waits for refill if bucket is empty. Wait times based on refill rates:
	 * - query: 1s, command: 2s, listingCreate: 0.63s
	 */
	private async waitForToken(tokens: number, bucketName: string): Promise<void> {
		if (tokens >= 1) {
			return;
		}

		let waitTime: number;
		if (bucketName === 'query') {
			waitTime = 1000;
		} else if (bucketName === 'command') {
			waitTime = 2000;
		} else {
			waitTime = 630;
		}

		await sleep(waitTime);
	}

	private async waitForConcurrencySlot(): Promise<void> {
		while (this.activeCalls >= this.maxConcurrency) {
			await sleep(100);
		}
	}

	async acquireToken(
		method: string,
		endpoint: string,
		enableDevTestRateLimit: boolean,
	): Promise<() => void> {
		await this.waitForConcurrencySlot();
		this.activeCalls++;

		this.refillTokens();

		if (this.isListingCreateEndpoint(endpoint)) {
			await this.waitForToken(this.listingCreateTokens, 'listingCreate');
			this.listingCreateTokens -= 1;
		} else if (enableDevTestRateLimit) {
			if (this.isQueryEndpoint(method)) {
				await this.waitForToken(this.queryTokens, 'query');
				this.queryTokens -= 1;
			} else {
				await this.waitForToken(this.commandTokens, 'command');
				this.commandTokens -= 1;
			}
		}

		return () => {
			this.activeCalls--;
		};
	}
}

/**
 * Sharetribe API error structure
 */
interface SharetribeApiError {
	id: string;
	status: number;
	code: string;
	title: string;
	details?: string;
	source?: {
		path: string[];
		type: 'body' | 'query';
	};
}

/**
 * Extract resource type and ID from endpoint and body for better error messages
 */
function extractResourceInfo(
	endpoint: string,
	body?: IDataObject,
	query?: IDataObject,
): { resourceType: string; resourceId?: string } {
	const endpointMappings: Record<string, string> = {
		'users/show': 'user',
		'users/update_profile': 'user',
		'users/update_permissions': 'user',
		'listings/show': 'listing',
		'listings/query': 'listing',
		'listings/create': 'listing',
		'listings/update': 'listing',
		'listings/close': 'listing',
		'listings/open': 'listing',
		'listings/approve': 'listing',
		'transactions/show': 'transaction',
		'transactions/query': 'transaction',
		'transactions/transition': 'transaction',
		'transactions/speculativeTransition': 'transaction',
		'transactions/update_metadata': 'transaction',
		'availability_exceptions/query': 'availability exception',
		'availability_exceptions/delete': 'availability exception',
		'stock/compare_and_set': 'stock',
		'stock/query': 'stock',
		'images/upload': 'image',
		'marketplace/show': 'marketplace',
		'events/query': 'event',
	};

	let resourceType = 'resource';
	for (const [pattern, type] of Object.entries(endpointMappings)) {
		if (endpoint.includes(pattern)) {
			resourceType = type;
			break;
		}
	}

	let resourceId = query?.id as string | undefined;
	if (!resourceId && body) {
		resourceId = body.id as string | undefined;
	}

	return { resourceType, resourceId };
}

/**
 * Friendly error messages for Sharetribe API error codes.
 * Used to replace terse API messages with actionable descriptions.
 */
const FRIENDLY_ERROR_MESSAGES: Record<string, string> = {
	// 400 - Bad Request
	'unsupported-content-type': 'The request content type is not supported. Expected application/json.',
	'bad-request': 'The request was malformed. Please check your input parameters.',
	'validation-disallowed-key': 'The request contains a parameter that is not allowed.',
	'validation-invalid-value': 'One or more parameter values are invalid.',
	'validation-invalid-params': 'The request parameters are invalid.',
	'validation-missing-key': 'A required parameter is missing from the request.',

	// 401 - Authentication
	'auth-invalid-access-token': 'The access token is invalid or expired. Please re-authenticate your Sharetribe credentials.',
	'auth-missing-access-token': 'No access token was provided. Please check your Sharetribe credentials.',

	// 402 - Payment
	'transaction-payment-failed': 'The payment failed. Please check the buyer\'s payment method and try again.',

	// 403 - Forbidden
	'forbidden': 'You do not have permission to perform this action. Check your Integration API credentials and scopes.',

	// 404 - Not Found
	'not-found': 'The requested resource was not found.',

	// 409 - Conflict / Business Logic
	'conflict': 'The request conflicts with the current state of the resource.',
	'image-invalid': 'The uploaded image is invalid. Please check the file format and size.',
	'image-invalid-content': 'The image content is not valid. Supported formats: JPEG, PNG.',
	'email-taken': 'This email address is already in use by another account.',
	'email-already-verified': 'This email address has already been verified.',
	'email-unverified': 'The email address has not been verified yet.',
	'email-not-found': 'No account was found with this email address.',
	'listing-not-found': 'The listing was not found. It may have been deleted.',
	'listing-invalid-state': 'The listing is not in a valid state for this operation (e.g. trying to close an already closed listing).',
	'stripe-account-not-found': 'No Stripe account was found for this user. The provider needs to set up Stripe payments.',
	'stripe-missing-api-key': 'The Stripe API key is not configured. Please check your Sharetribe Console payment settings.',
	'stripe-invalid-payment-intent-status': 'The Stripe payment intent is not in a valid status for this operation.',
	'stripe-customer-not-found': 'No Stripe customer was found. The buyer needs a valid payment method.',
	'stripe-multiple-payment-methods-not-supported': 'Multiple Stripe payment methods are not supported for this transaction.',
	'stripe-payment-method-type-not-supported': 'The Stripe payment method type is not supported.',
	'user-missing-stripe-account': 'The user does not have a Stripe account connected.',
	'user-is-banned': 'This user has been banned and cannot perform this action.',
	'user-not-found': 'The user was not found. They may have been deleted.',
	'transaction-locked': 'The transaction is currently locked by another operation. Please try again.',
	'transaction-not-found': 'The transaction was not found. It may have been deleted.',
	'transaction-listing-not-found': 'The listing associated with this transaction was not found.',
	'transaction-booking-state-not-pending': 'The booking is not in a pending state. It may have already been accepted or declined.',
	'transaction-booking-state-not-accepted': 'The booking has not been accepted yet.',
	'transaction-invalid-transition': 'This transition is not valid for the current transaction state. Check the transaction process in your Sharetribe Console to see which transitions are available.',
	'transaction-invalid-action-sequence': 'The actions in this transition cannot be performed in this order. Check your transaction process configuration.',
	'transaction-missing-listing-price': 'The listing does not have a price set, which is required for this transaction.',
	'transaction-missing-stripe-account': 'The provider does not have a Stripe account connected, which is required to receive payments.',
	'transaction-same-author-and-customer': 'The listing author and customer cannot be the same user.',
	'transaction-stripe-account-disabled-charges': 'The provider\'s Stripe account has charges disabled.',
	'transaction-stripe-account-disabled-payouts': 'The provider\'s Stripe account has payouts disabled.',
	'transaction-charge-zero-payin': 'The transaction cannot be charged because the pay-in amount is zero.',
	'transaction-charge-zero-payout': 'The transaction cannot be charged because the payout amount is zero.',
	'transaction-zero-payin': 'The pay-in amount for this transaction is zero.',
	'transaction-unknown-alias': 'The transaction process alias is not recognized. Check your Sharetribe Console transaction process configuration.',
	'transaction-provider-banned-or-deleted': 'The provider has been banned or deleted and cannot participate in transactions.',
	'transaction-customer-banned-or-deleted': 'The customer has been banned or deleted and cannot participate in transactions.',

	// 413 - Payload Too Large
	'request-larger-than-content-length': 'The request body is larger than the declared content length.',
	'request-upload-over-limit': 'The uploaded file exceeds the maximum allowed size.',

	// 429 - Rate Limit
	'too-many-requests': 'Rate limit exceeded after multiple retries. Please try again later.',

	// Stock-specific
	'old-total-mismatch': 'The stock quantity has changed since it was last read. Fetch the current stock and retry.',
};

/**
 * Handle and format Sharetribe API errors with exponential backoff for 429s
 */
export function handleSharetribeError(
	this:
		| IHookFunctions
		| IExecuteFunctions
		| ILoadOptionsFunctions
		| IPollFunctions
		| IWebhookFunctions,
	error: JsonObject,
	endpoint: string,
	body?: IDataObject,
	query?: IDataObject,
	credentialName?: string,
): never {
	const errorResponse = error as {
		response?: {
			status?: number;
			data?: {
				errors?: SharetribeApiError[];
			};
		};
		httpCode?: string;
		context?: {
			data?: {
				errors?: SharetribeApiError[];
			};
		};
		status?: number;
		message?: string;
		isRetryable?: boolean;
	};

	const statusCode =
		errorResponse.response?.status ||
		errorResponse.status ||
		(errorResponse.httpCode ? parseInt(errorResponse.httpCode) : undefined);

	const apiErrors = errorResponse.response?.data?.errors || errorResponse.context?.data?.errors;

	if (apiErrors && Array.isArray(apiErrors) && apiErrors.length > 0) {
		const primaryError = apiErrors[0];

		let errorMessage: string;

		if (primaryError.code === 'old-total-mismatch') {
			const oldTotal = body?.oldTotal;
			if (oldTotal === null || oldTotal === undefined) {
				errorMessage = `The listing already has stock defined. Fetch the current stock quantity and retry the operation.`;
			} else {
				errorMessage = `The current stock quantity did not match (expected ${oldTotal}). Fetch the current stock quantity and retry the operation.`;
			}
		} else if (primaryError.status === 404 || statusCode === 404) {
			const { resourceType, resourceId } = extractResourceInfo(endpoint, body, query);
			const onCredential = credentialName ? ` on "${credentialName}"` : '';
			if (resourceId) {
				errorMessage = `No ${resourceType} with ID ${resourceId} was found${onCredential}`;
			} else {
				errorMessage = `${resourceType.charAt(0).toUpperCase() + resourceType.slice(1)} not found${onCredential}`;
			}
		} else {
			errorMessage =
				FRIENDLY_ERROR_MESSAGES[primaryError.code] ||
				primaryError.details ||
				primaryError.title ||
				'API request failed';
		}

		let errorDescription = '';

		const errorInfo: string[] = [];
		if (primaryError.code) {
			errorInfo.push(`Code: ${primaryError.code}`);
		}
		if (primaryError.status) {
			errorInfo.push(`Status: ${primaryError.status}`);
		}
		if (primaryError.id) {
			errorInfo.push(`Error ID: ${primaryError.id}`);
		}

		if (errorInfo.length > 0) {
			errorDescription += `${errorInfo.join(' | ')}<br><br>`;
		}

		if (primaryError.source?.path) {
			const paramPath = primaryError.source.path.join('.');
			errorDescription += `Parameter: ${paramPath} (${primaryError.source.type})<br><br>`;
		}

		if (apiErrors.length > 1) {
			errorDescription += `Additional errors:`;
			for (let i = 1; i < apiErrors.length; i++) {
				const additionalError = apiErrors[i];
				if (additionalError) {
					errorDescription += `<br>• ${additionalError.title}`;
					if (additionalError.source?.path) {
						errorDescription += ` (${additionalError.source.path.join('.')})`;
					}
				}
			}
			errorDescription += `<br><br>`;
		}

		throw new NodeApiError(this.getNode(), error as JsonObject, {
			message: errorMessage,
			description: errorDescription,
			httpCode: statusCode?.toString() || 'unknown',
		});
	}

	if (statusCode) {
		const errorMessage = errorResponse.message || 'Unknown error';
		let message = 'Sharetribe API Error';
		let description = `API Error (${statusCode}): ${errorMessage}`;

		const { resourceType, resourceId } = extractResourceInfo(endpoint, body, query);

		switch (statusCode) {
			case 401:
				description = 'Authentication failed. Please check your API credentials.';
				break;
			case 403:
				description = 'Access forbidden. Insufficient permissions.';
				break;
			case 404: {
				const onCredential = credentialName ? ` on "${credentialName}"` : '';
				if (resourceId) {
					message = `No ${resourceType} with ID ${resourceId} was found${onCredential}`;
				} else {
					message = `${resourceType.charAt(0).toUpperCase() + resourceType.slice(1)} not found${onCredential}`;
				}
				description = '';
				break;
			}
			case 429:
				description = 'Rate limit exceeded after multiple retries. Please try again later.';
				break;
			case 500:
				description = 'Internal server error. Please try again later.';
				break;
			case 502:
			case 503:
			case 504:
				description = 'Service unavailable. Please try again later.';
				break;
		}

		throw new NodeApiError(this.getNode(), error as JsonObject, {
			message,
			description,
			httpCode: statusCode.toString(),
		});
	}

	throw new NodeOperationError(
		this.getNode(),
		`Unexpected error in Sharetribe API call to ${endpoint}: ${errorResponse.message || 'Unknown error'}`,
	);
}

/**
 * Make an API request to Sharetribe with rate limiting and exponential backoff
 *
 * @returns JSON:API formatted response from Sharetribe with typed structure
 */
export async function apiRequest<T extends IDataObject = IDataObject>(
	this:
		| IHookFunctions
		| IExecuteFunctions
		| ILoadOptionsFunctions
		| IPollFunctions
		| IWebhookFunctions,
	method: IHttpRequestMethods,
	endpoint: string,
	body: IDataObject | GenericValue | GenericValue[] = {},
	query: IDataObject = {},
	maxRetries: number = 3,
	retryAttempt: number = 0,
): Promise<SharetribeApiResponseType<T>> {
	const credentials = await this.getCredentials('sharetribeOAuth2Api');
	const baseUrl = credentials.baseUrl as string;
	const enableDevTestRateLimit = (credentials.environment as string) !== 'prod';

	const rateLimiter = SharetribeRateLimiter.getInstance();
	const cleanup = await rateLimiter.acquireToken(method, endpoint, enableDevTestRateLimit);

	const options: IHttpRequestOptions = {
		method,
		body,
		qs: query,
		url: `${baseUrl}/v1/integration_api/${endpoint}`,
		headers: {
			'content-type': 'application/json; charset=utf-8',
		},
		arrayFormat: 'comma',
	};

	try {
		// Log full query string just before request hits the wire
		let fullUrl = `${baseUrl}/v1/integration_api/${endpoint}`;
		if (Object.keys(query).length > 0) {
			const queryStr = Object.entries(query)
				.map(([key, value]) => {
					const val = Array.isArray(value) ? value.join(',') : String(value);
					return `${key}=${val}`;
				})
				.join('&');
			fullUrl += `?${queryStr}`;
		}

		// Wrap at 120 characters
		const logPrefix = `[Sharetribe API] ${method} `;
		const url = fullUrl;
		if (logPrefix.length + url.length <= 120) {
			this.logger.debug(`${logPrefix}${url}`);
		} else {
			this.logger.debug(`${logPrefix}${url.substring(0, 120 - logPrefix.length)}`);
			let remaining = url.substring(120 - logPrefix.length);
			while (remaining.length > 0) {
				this.logger.debug(`  ${remaining.substring(0, 118)}`);
				remaining = remaining.substring(118);
			}
		}

		const result = await this.helpers.httpRequestWithAuthentication.call(
			this,
			'sharetribeOAuth2Api',
			options,
		);
		cleanup();
		return result;
	} catch (error) {
		cleanup();

		const statusCode = error.response?.status;
		const isRetryable = statusCode === 429 || statusCode === 502 || statusCode === 503 || statusCode === 504;
		if (isRetryable && retryAttempt < maxRetries) {
			const backoffDelay = Math.min(1000 * Math.pow(2, retryAttempt), 30000);
			await sleep(backoffDelay);

			return (await apiRequest.call(
				this,
				method,
				endpoint,
				body,
				query,
				maxRetries,
				retryAttempt + 1,
			)) as SharetribeApiResponseType<T>;
		}

		const nodeCredentials = this.getNode().credentials;
		const credentialRef = nodeCredentials?.sharetribeOAuth2Api;
		const credentialName =
			typeof credentialRef === 'object' && credentialRef !== null
				? (credentialRef as { name?: string }).name
				: undefined;

		return handleSharetribeError.call(
			this as
				| IHookFunctions
				| IExecuteFunctions
				| ILoadOptionsFunctions
				| IPollFunctions
				| IWebhookFunctions,
			error,
			endpoint,
			body as IDataObject | undefined,
			query,
			credentialName,
		) as never;
	}
}

/**
 * Asset Delivery API response structure
 */
export interface AssetDeliveryResponse {
	data: IDataObject | IDataObject[];
	included?: Array<{
		id: string;
		type: string;
		attributes: IDataObject;
	}>;
	meta: {
		version?: string;
	};
}

/**
 * Make a request to the Sharetribe Asset Delivery API (CDN)
 *
 * The Asset Delivery API is separate from the Integration API and serves assets from a CDN.
 * Key differences:
 * - Base URL: https://cdn.st-api.com/v1/assets/pub/[CLIENT_ID]/
 * - Authentication via client ID in URL path (not OAuth headers)
 *
 * @param accessType - 'alias' for latest/named versions, 'version' for specific version IDs
 * @param assetPaths - Array of asset paths (currently supports single asset per request)
 * @param versionOrAlias - Version ID or alias name (default: 'latest')
 * @returns Asset delivery response with data, included resources, and version metadata
 */
export async function assetRequest(
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
	const credentials = await this.getCredentials('sharetribeOAuth2Api');
	const marketplaceClientId = await getMarketplaceClientId(this);
	const assetApiBaseUrl = credentials.assetApiBaseUrl as string;

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
 * Timeslot API response structure
 */
export interface TimeslotResponse {
	data: IDataObject[];
	meta: {
		page: number;
		perPage: number;
		totalItems: number;
		totalPages: number;
	};
}

/**
 * Make a request to the Sharetribe Marketplace API for timeslots
 *
 * The Marketplace API is separate from the Integration API and requires client ID authentication.
 * Key differences:
 * - Base URL: https://flex-api.sharetribe.com/v1/api/[CLIENT_ID]/
 * - Authentication via client ID in URL path (not OAuth headers)
 * - Returns available booking timeslots for listings
 *
 * @param query - Query parameters including listingId, start, end, etc.
 * @returns Timeslot response with data array and pagination metadata
 */
export async function timeslotRequest(
	this:
		| IHookFunctions
		| IExecuteFunctions
		| ILoadOptionsFunctions
		| IPollFunctions
		| IWebhookFunctions,
	query: IDataObject,
): Promise<TimeslotResponse> {
	const credentials = await this.getCredentials('sharetribeOAuth2Api');
	const marketplaceApiBaseUrl = credentials.marketplaceApiBaseUrl as string;

	let retryCount = 0;
	const maxRetries = 1;

	while (retryCount <= maxRetries) {
		const accessToken = await getAnonymousToken(this);
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
					clearAnonymousToken(this);
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
