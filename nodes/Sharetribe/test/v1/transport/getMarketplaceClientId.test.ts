import { NodeOperationError } from 'n8n-workflow';
import { extractClientIdFromHtml } from '../../../v1/helpers/Sharetribe.utils';
import { getPublicMarketplaceClientId } from '../../../v1/transport';
import { createMockExecuteFunction, mockSharetribeCredentials } from '../../helpers';

const VALID_CLIENT_ID = '9e4f0bee-6174-4bfe-998a-6d433e7dbcc4';

/** Raw JS object format */
function makeHtmlRaw(clientId: string): string {
	return `<html><head><script>window.__PRELOADED_STATE__ = {"tenant":{"clientId":"${clientId}"}}</script></head></html>`;
}

/** Double-encoded JSON string format (actual Sharetribe production format) */
function makeHtmlDoubleEncoded(clientId: string): string {
	const state = JSON.stringify({ tenant: { clientId } });
	const escaped = JSON.stringify(state); // wraps in quotes + escapes
	return `<html><head><script>window.__PRELOADED_STATE__ = ${escaped};</script></head></html>`;
}

describe('extractClientIdFromHtml', () => {
	it('should extract client ID from raw JS object format', () => {
		expect(extractClientIdFromHtml(makeHtmlRaw(VALID_CLIENT_ID))).toBe(VALID_CLIENT_ID);
	});

	it('should extract client ID from double-encoded JSON string format', () => {
		expect(extractClientIdFromHtml(makeHtmlDoubleEncoded(VALID_CLIENT_ID))).toBe(VALID_CLIENT_ID);
	});

	it('should return null when __PRELOADED_STATE__ is missing', () => {
		expect(extractClientIdFromHtml('<html><body>Hello</body></html>')).toBeNull();
	});

	it('should return null when JSON is malformed', () => {
		const html = '<script>window.__PRELOADED_STATE__ = {bad json!}</script>';
		expect(extractClientIdFromHtml(html)).toBeNull();
	});

	it('should return null when tenant.clientId is missing', () => {
		const html = '<script>window.__PRELOADED_STATE__ = {"tenant":{}}</script>';
		expect(extractClientIdFromHtml(html)).toBeNull();
	});

	it('should return null when clientId is not a valid UUID', () => {
		expect(extractClientIdFromHtml(makeHtmlRaw('not-a-uuid'))).toBeNull();
		expect(extractClientIdFromHtml(makeHtmlDoubleEncoded('not-a-uuid'))).toBeNull();
	});

	it('should handle whitespace and trailing semicolons', () => {
		const html = '<script>window.__PRELOADED_STATE__  =  {"tenant":{"clientId":"' + VALID_CLIENT_ID + '"}} ; </script>';
		expect(extractClientIdFromHtml(html)).toBe(VALID_CLIENT_ID);
	});

	it('should handle script tag with nonce attribute', () => {
		const state = JSON.stringify({ tenant: { clientId: VALID_CLIENT_ID } });
		const escaped = JSON.stringify(state);
		const html = `<script nonce="abc123">window.__PRELOADED_STATE__ = ${escaped};</script>`;
		expect(extractClientIdFromHtml(html)).toBe(VALID_CLIENT_ID);
	});
});

describe('getPublicMarketplaceClientId', () => {
	let staticData: Record<string, unknown>;

	beforeEach(() => {
		staticData = {};
	});

	function createContext(credentialOverrides: Record<string, unknown> = {}) {
		const credentials = {
			...mockSharetribeCredentials,
			planType: 'extend',
			marketplaceUrl: '',
			...credentialOverrides,
		};
		const ctx = createMockExecuteFunction({}, credentials);
		(ctx.getWorkflowStaticData as jest.Mock).mockReturnValue(staticData);
		return ctx;
	}

	describe('non-pro plan (direct client ID)', () => {
		it('should return marketplaceApiClientId from credentials', async () => {
			const ctx = createContext({
				planType: 'extend',
				marketplaceApiClientId: VALID_CLIENT_ID,
			});

			const result = await getPublicMarketplaceClientId(ctx);
			expect(result).toBe(VALID_CLIENT_ID);
		});

		it('should throw NodeOperationError when marketplaceApiClientId is empty', async () => {
			const ctx = createContext({
				planType: 'extend',
				marketplaceApiClientId: '',
			});

			await expect(getPublicMarketplaceClientId(ctx)).rejects.toThrow(NodeOperationError);
			await expect(getPublicMarketplaceClientId(ctx)).rejects.toThrow(
				'Marketplace API Client ID is required',
			);
		});
	});

	describe('pro plan (extract from URL)', () => {
		it('should throw NodeOperationError when marketplaceUrl is empty', async () => {
			const ctx = createContext({
				planType: 'pro',
				marketplaceUrl: '',
			});

			await expect(getPublicMarketplaceClientId(ctx)).rejects.toThrow(NodeOperationError);
			await expect(getPublicMarketplaceClientId(ctx)).rejects.toThrow(
				'Marketplace URL is required',
			);
		});

		it('should fetch HTML and extract client ID', async () => {
			const marketplaceUrl = 'https://my-marketplace.mysharetribe.com';
			const ctx = createContext({
				planType: 'pro',
				marketplaceUrl,
			});

			(ctx.helpers.httpRequest as jest.Mock).mockResolvedValue(makeHtmlDoubleEncoded(VALID_CLIENT_ID));

			const result = await getPublicMarketplaceClientId(ctx);
			expect(result).toBe(VALID_CLIENT_ID);

			expect(ctx.helpers.httpRequest).toHaveBeenCalledWith(
				expect.objectContaining({
					method: 'GET',
					url: marketplaceUrl,
				}),
			);
		});

		it('should cache the extracted client ID with the URL', async () => {
			const marketplaceUrl = 'https://my-marketplace.mysharetribe.com';
			const ctx = createContext({
				planType: 'pro',
				marketplaceUrl,
			});

			(ctx.helpers.httpRequest as jest.Mock).mockResolvedValue(makeHtmlDoubleEncoded(VALID_CLIENT_ID));

			await getPublicMarketplaceClientId(ctx);

			expect(staticData.marketplaceClientId).toEqual({
				clientId: VALID_CLIENT_ID,
				marketplaceUrl,
			});
		});

		it('should return cached client ID when URL matches', async () => {
			const marketplaceUrl = 'https://my-marketplace.mysharetribe.com';
			staticData.marketplaceClientId = {
				clientId: VALID_CLIENT_ID,
				marketplaceUrl,
			};

			const ctx = createContext({
				planType: 'pro',
				marketplaceUrl,
			});

			const result = await getPublicMarketplaceClientId(ctx);
			expect(result).toBe(VALID_CLIENT_ID);
			expect(ctx.helpers.httpRequest).not.toHaveBeenCalled();
		});

		it('should re-extract when marketplace URL changes', async () => {
			const oldUrl = 'https://old-marketplace.mysharetribe.com';
			const newUrl = 'https://new-marketplace.mysharetribe.com';
			const newClientId = '550e8400-e29b-41d4-a716-446655440000';

			staticData.marketplaceClientId = {
				clientId: VALID_CLIENT_ID,
				marketplaceUrl: oldUrl,
			};

			const ctx = createContext({
				planType: 'pro',
				marketplaceUrl: newUrl,
			});

			(ctx.helpers.httpRequest as jest.Mock).mockResolvedValue(makeHtmlDoubleEncoded(newClientId));

			const result = await getPublicMarketplaceClientId(ctx);
			expect(result).toBe(newClientId);
			expect(ctx.helpers.httpRequest).toHaveBeenCalled();
			expect(staticData.marketplaceClientId).toEqual({
				clientId: newClientId,
				marketplaceUrl: newUrl,
			});
		});

		it('should throw NodeOperationError when HTML fetch fails', async () => {
			const ctx = createContext({
				planType: 'pro',
				marketplaceUrl: 'https://bad-url.example.com',
			});

			(ctx.helpers.httpRequest as jest.Mock).mockRejectedValue(new Error('Network error'));

			await expect(getPublicMarketplaceClientId(ctx)).rejects.toThrow(NodeOperationError);
			await expect(getPublicMarketplaceClientId(ctx)).rejects.toThrow("Please check the 'Marketplace URL'");
		});

		it('should throw NodeOperationError when client ID cannot be extracted', async () => {
			const ctx = createContext({
				planType: 'pro',
				marketplaceUrl: 'https://my-marketplace.mysharetribe.com',
			});

			(ctx.helpers.httpRequest as jest.Mock).mockResolvedValue('<html><body>No state here</body></html>');

			await expect(getPublicMarketplaceClientId(ctx)).rejects.toThrow(NodeOperationError);
			await expect(getPublicMarketplaceClientId(ctx)).rejects.toThrow(
				'Could not extract Marketplace API Client ID',
			);
		});
	});
});
