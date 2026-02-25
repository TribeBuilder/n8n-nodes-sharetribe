import type {
	ICredentialsDecrypted,
	ICredentialTestFunctions,
	INodeCredentialTestResult,
	Logger,
} from 'n8n-workflow';
import { extractClientIdFromHtml } from '../helpers/Sharetribe.utils';

interface IntegrationApiResult {
	accessToken: string;
	marketplaceName: string;
	marketplaceId: string;
	environment: string;
}

class CredentialTestError extends Error {
	constructor(message: string) {
		super(message);
	}
}

/**
 * Decode JWT payload without verification (we only need to read claims, not verify signature)
 */
function decodeJwtPayload(token: string): Record<string, unknown> | null {
	try {
		const parts = token.split('.');
		if (parts.length !== 3) return null;
		const payload = Buffer.from(parts[1], 'base64url').toString('utf8');
		return JSON.parse(payload);
	} catch {
		return null;
	}
}

/**
 * Extract marketplace ID from a Sharetribe JWT access token
 */
function getMarketplaceIdFromToken(token: string): string | null {
	const payload = decodeJwtPayload(token);
	if (!payload) return null;
	return (payload['tenancy-id'] as string) || null;
}

/**
 * Validate Integration API credentials by obtaining a token and fetching marketplace info.
 * Returns the access token, marketplace name, and marketplace ID from the JWT.
 * Throws CredentialTestError on validation failure.
 */
async function validateIntegrationApi(
	helpers: ICredentialTestFunctions['helpers'],
	credentialData: Record<string, unknown>,
	baseUrl: string,
	logger: Logger,
): Promise<IntegrationApiResult> {
	logger.debug('[Sharetribe] Credential test: requesting Integration API token');

	const tokenResponse = await helpers.request({
		method: 'POST',
		url: credentialData.accessTokenUrl as string,
		form: {
			grant_type: 'client_credentials',
			client_id: credentialData.clientId,
			client_secret: credentialData.clientSecret,
			scope: credentialData.scope || 'integ',
		},
		json: true,
	});

	const accessToken = tokenResponse.access_token;
	if (!accessToken) {
		throw new CredentialTestError(
			'Failed to obtain access token. Please check your Integration API credentials.',
		);
	}

	logger.debug('[Sharetribe] Credential test: Integration API token obtained');

	const jwtPayload = decodeJwtPayload(accessToken);

	const marketplaceResponse = await helpers.request({
		method: 'GET',
		url: `${baseUrl}/v1/integration_api/marketplace/show`,
		headers: {
			Accept: 'application/json',
			Authorization: `Bearer ${accessToken}`,
		},
		json: true,
	});

	const marketplaceName = marketplaceResponse?.data?.attributes?.name;
	if (!marketplaceName) {
		throw new CredentialTestError(
			'Failed to fetch marketplace information. Please check your Integration API credentials.',
		);
	}

	const marketplaceId = getMarketplaceIdFromToken(accessToken) || '';
	const environment = (jwtPayload?.['env'] as string) || '';

	logger.debug('[Sharetribe] Credential test: Integration API validated');

	return { accessToken, marketplaceName, marketplaceId, environment };
}

/**
 * Resolve the marketplace client ID (from credentials or pro plan URL extraction),
 * then validate it by requesting an anonymous token from the auth endpoint.
 * Cross-validates that the marketplace client ID belongs to the same marketplace
 * as the Integration API credentials by comparing JWT marketplace IDs.
 * Throws CredentialTestError on validation failure.
 */
async function validateMarketplaceClientId(
	helpers: ICredentialTestFunctions['helpers'],
	credentialData: Record<string, unknown>,
	integrationResult: IntegrationApiResult,
	logger: Logger,
): Promise<string> {
	const integrationMarketplaceId = integrationResult.marketplaceId;
	const proPlan = credentialData.planType === 'pro';
	const accessTokenUrl = credentialData.accessTokenUrl as string;
	let clientId: string | undefined;

	if (proPlan) {
		const marketplaceUrl = credentialData.marketplaceUrl as string | undefined;
		if (!marketplaceUrl) {
			throw new CredentialTestError(
				'Marketplace URL is required for Pro plan setup. Please provide your marketplace URL.',
			);
		}

		logger.debug('[Sharetribe] Credential test: extracting client ID from marketplace URL');

		let htmlResponse: string;
		try {
			htmlResponse = await helpers.request({
				method: 'GET',
				url: marketplaceUrl,
				headers: {
					'User-Agent': 'n8n-sharetribe-integration/1.0',
					Accept: 'text/html',
				},
			});
		} catch (error) {
			throw new CredentialTestError(
				`Failed to fetch marketplace URL: ${error.message || 'Network error'}`,
			);
		}

		clientId = extractClientIdFromHtml(htmlResponse) || undefined;
		if (!clientId) {
			throw new CredentialTestError(
				'Could not extract Marketplace API Client ID from the marketplace URL. Please verify the URL is correct and publicly accessible.',
			);
		}

		logger.debug('[Sharetribe] Credential test: client ID extracted from URL');
	} else {
		clientId = (credentialData.marketplaceApiClientId as string) || undefined;
		if (!clientId) {
			throw new CredentialTestError(
				'Marketplace API Client ID is required. Please provide your Marketplace API Client ID, or select Pro plan to extract it from your marketplace URL.',
			);
		}
	}

	// Validate the client ID by requesting an anonymous token
	logger.debug('[Sharetribe] Credential test: validating Marketplace API Client ID');
	let anonTokenResponse: { access_token?: string };
	try {
		anonTokenResponse = await helpers.request({
			method: 'POST',
			url: accessTokenUrl,
			form: {
				grant_type: 'client_credentials',
				client_id: clientId,
				scope: 'public-read',
			},
			json: true,
		});
	} catch {
		throw new CredentialTestError(
			`Marketplace API Client ID is not valid. The auth endpoint rejected it. Please check your ${proPlan ? 'marketplace URL' : 'Marketplace API Client ID'}.`,
		);
	}

	if (!anonTokenResponse.access_token) {
		throw new CredentialTestError(
			`Marketplace API Client ID did not return an access token. Please check your ${proPlan ? 'marketplace URL' : 'Marketplace API Client ID'}.`,
		);
	}

	logger.debug('[Sharetribe] Credential test: Marketplace API Client ID validated');

	// Cross-validate: ensure both APIs point to the same marketplace
	if (integrationMarketplaceId) {
		const anonMarketplaceId = getMarketplaceIdFromToken(anonTokenResponse.access_token);
		if (anonMarketplaceId && anonMarketplaceId !== integrationMarketplaceId) {
			const anonPayload = decodeJwtPayload(anonTokenResponse.access_token);
			const anonIdent = (anonPayload?.['ident'] as string) || 'unknown';
			throw new CredentialTestError(
				`Marketplace mismatch: Integration API credentials are for "${integrationResult.marketplaceName}" but the ${proPlan ? 'marketplace URL' : 'Marketplace API Client ID'} resolved to "${anonIdent}". Please ensure both are configured for the same marketplace.`,
			);
		}
	}

	logger.debug('[Sharetribe] Credential test: marketplace cross-validation passed');
	return clientId;
}

/**
 * Credential test for Sharetribe Trigger node.
 * Validates Integration API access and Marketplace API Client ID.
 */
export async function sharetribeTriggerCredentialTest(
	this: ICredentialTestFunctions,
	credential: ICredentialsDecrypted,
): Promise<INodeCredentialTestResult> {
	const credentialData = credential.data!;
	const baseUrl = credentialData.baseUrl as string;

	try {
		const integrationResult = await validateIntegrationApi(
			this.helpers,
			credentialData,
			baseUrl,
			this.logger,
		);

		const clientId = await validateMarketplaceClientId(
			this.helpers,
			credentialData,
			integrationResult,
			this.logger,
		);

		// Store environment from JWT for auto rate limiting detection
		credentialData.environment = integrationResult.environment;

		return {
			status: 'OK',
			message: `Connected to "${integrationResult.marketplaceName}" marketplace (${integrationResult.environment || 'unknown'}). Marketplace Client ID: ${clientId}`,
		};
	} catch (error) {
		return {
			status: 'Error',
			message: error instanceof CredentialTestError
				? error.message
				: `Authentication failed: ${error.message || 'Unknown error'}`,
		};
	}
}

/**
 * Credential test for Sharetribe node.
 * Validates Integration API access and Marketplace API Client ID.
 */
export async function sharetribeApiCredentialTest(
	this: ICredentialTestFunctions,
	credential: ICredentialsDecrypted,
): Promise<INodeCredentialTestResult> {
	const credentialData = credential.data!;
	const baseUrl = credentialData.baseUrl as string;

	try {
		const integrationResult = await validateIntegrationApi(
			this.helpers,
			credentialData,
			baseUrl,
			this.logger,
		);

		const clientId = await validateMarketplaceClientId(
			this.helpers,
			credentialData,
			integrationResult,
			this.logger,
		);

		// Store environment from JWT for auto rate limiting detection
		credentialData.environment = integrationResult.environment;

		return {
			status: 'OK',
			message: `Connected to "${integrationResult.marketplaceName}" marketplace (${integrationResult.environment || 'unknown'}). Marketplace Client ID: ${clientId}`,
		};
	} catch (error) {
		return {
			status: 'Error',
			message: error instanceof CredentialTestError
				? error.message
				: `Authentication failed: ${error.message || 'Unknown error'}`,
		};
	}
}
