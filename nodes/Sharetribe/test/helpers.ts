/* eslint-disable @n8n/community-nodes/no-restricted-imports */
import type {
	IDataObject,
	IExecuteFunctions,
	IGetNodeParameterOptions,
	INode,
	ICredentialDataDecryptedObject,
	IHttpRequestOptions,
	IHttpRequestMethods,
} from 'n8n-workflow';
import { mockDeep } from 'jest-mock-extended';
import get from 'lodash/get';

/**
 * Mock Sharetribe node for testing
 */
export const mockSharetribeNode: INode = {
	id: 'test-node-id',
	name: 'Sharetribe Test Node',
	typeVersion: 1,
	type: 'n8n-nodes-sharetribe.sharetribe',
	position: [0, 0],
	parameters: {},
};

/**
 * Mock Sharetribe OAuth2 credentials
 */
export const mockSharetribeCredentials: ICredentialDataDecryptedObject = {
	clientId: 'test-client-id',
	clientSecret: 'test-client-secret',
	accessToken: 'test-access-token',
	marketplaceId: 'test-marketplace',
	marketplaceApiClientId: 'test-marketplace-client-id',
	assetApiBaseUrl: 'https://asset-delivery.sharetribe.com',
	domain: 'sharetribe.com',
};

/**
 * Creates a mock IExecuteFunctions with commonly used methods for Sharetribe node testing
 *
 * @param nodeParameters - Node parameter values to return from getNodeParameter
 * @param credentials - Optional credentials to return from getCredentials
 * @returns Mock IExecuteFunctions
 */
export function createMockExecuteFunction(
	nodeParameters: IDataObject,
	credentials: ICredentialDataDecryptedObject = mockSharetribeCredentials,
): IExecuteFunctions {
	const mockExecuteFunction = mockDeep<IExecuteFunctions>();

	// Auto-flatten options.outputFields to root level so getNodeParameter('userFields') etc. works
	const outputFields = (nodeParameters.options as IDataObject)?.outputFields as IDataObject | undefined;
	if (outputFields) {
		for (const [key, value] of Object.entries(outputFields)) {
			if (!(key in nodeParameters)) {
				nodeParameters[key] = value;
			}
		}
	}

	// Mock getInputData
	mockExecuteFunction.getInputData.mockReturnValue([{ json: {} }]);

	// Mock getNodeParameter with support for extractValue option and resource locators
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	(mockExecuteFunction.getNodeParameter as any).mockImplementation(
		(
			parameterName: string,
			_itemIndex: number,
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			fallbackValue?: any,
			options?: IGetNodeParameterOptions,
		) => {
			const parameter = options?.extractValue ? `${parameterName}.value` : parameterName;
			const value = get(nodeParameters, parameter, fallbackValue);

			// Auto-extract value from resource locator objects
			if (value && typeof value === 'object' && '__rl' in value && 'value' in value) {
				return value.value;
			}

			return value;
		},
	);

	// Mock getNode
	mockExecuteFunction.getNode.mockReturnValue(mockSharetribeNode);

	// Mock getCredentials
	mockExecuteFunction.getCredentials.mockResolvedValue(credentials);

	// Mock continueOnFail
	mockExecuteFunction.continueOnFail.mockReturnValue(false);

	// Mock logger
	mockExecuteFunction.logger = {
		debug: jest.fn(),
		info: jest.fn(),
		warn: jest.fn(),
		error: jest.fn(),
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
	} as any;

	// Mock helpers
	mockExecuteFunction.helpers = {
		constructExecutionMetaData: jest.fn((data, options) => {
			return data.map((item: IDataObject) => ({
				json: item,
				pairedItem: options?.itemData?.item ?? 0,
			}));
		}),
		httpRequest: jest.fn(),
		httpRequestWithAuthentication: jest.fn(),
		requestOAuth2: jest.fn(),
		returnJsonArray: jest.fn((data) => (Array.isArray(data) ? data : [data])),
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
	} as any;

	return mockExecuteFunction;
}

/**
 * Creates mock request options for HTTP mocking with nock
 *
 * @param method - HTTP method
 * @param endpoint - API endpoint path
 * @returns Mock IHttpRequestOptions
 */
export function createMockRequestOptions(
	method: IHttpRequestMethods,
	endpoint: string,
): Partial<IHttpRequestOptions> {
	return {
		method,
		url: `https://flex-api.sharetribe.com/v1${endpoint}`,
		headers: {
			'Content-Type': 'application/json',
			Authorization: 'Bearer test-access-token',
		},
		json: true,
	};
}

/**
 * Helper to create a mock Sharetribe API response
 *
 * @param data - Array of resource data objects
 * @param included - Optional included relationships
 * @param meta - Optional metadata (pagination, etc.)
 * @returns Sharetribe API response format
 */
export function createSharetribeApiResponse(
	data: IDataObject[],
	included: IDataObject[] = [],
	meta: IDataObject = {},
): IDataObject {
	return {
		data,
		included,
		meta,
	};
}

/**
 * Creates a mock user resource
 */
export function createMockUser(overrides: Partial<IDataObject> = {}): IDataObject {
	return {
		id: 'test-user-id',
		type: 'user',
		attributes: {
			email: 'test@example.com',
			profile: {
				firstName: 'Test',
				lastName: 'User',
				displayName: 'Test User',
			},
			createdAt: '2024-01-01T00:00:00.000Z',
			...overrides,
		},
	};
}

/**
 * Creates a mock listing resource
 */
export function createMockListing(overrides: Partial<IDataObject> = {}): IDataObject {
	return {
		id: 'test-listing-id',
		type: 'listing',
		attributes: {
			title: 'Test Listing',
			description: 'Test description',
			state: 'published',
			price: {
				amount: 10000,
				currency: 'USD',
			},
			createdAt: '2024-01-01T00:00:00.000Z',
			...overrides,
		},
	};
}

/**
 * Creates a mock transaction resource
 */
export function createMockTransaction(overrides: Partial<IDataObject> = {}): IDataObject {
	return {
		id: 'test-transaction-id',
		type: 'transaction',
		attributes: {
			lastTransition: 'transition/request-payment',
			lastTransitionedAt: '2024-01-01T00:00:00.000Z',
			createdAt: '2024-01-01T00:00:00.000Z',
			...overrides,
		},
	};
}

/**
 * Creates a mock stock resource
 */
export function createMockStock(overrides: Partial<IDataObject> = {}): IDataObject {
	return {
		id: 'test-stock-id',
		type: 'stock',
		attributes: {
			quantity: 10,
			...overrides,
		},
	};
}

/**
 * Creates a mock availability exception resource
 */
export function createMockAvailabilityException(
	overrides: Partial<IDataObject> = {},
): IDataObject {
	return {
		id: 'test-exception-id',
		type: 'availabilityException',
		attributes: {
			start: '2024-01-01T00:00:00.000Z',
			end: '2024-01-02T00:00:00.000Z',
			seats: 0,
			...overrides,
		},
	};
}

/**
 * Creates a mock marketplace resource
 */
export function createMockMarketplace(overrides: Partial<IDataObject> = {}): IDataObject {
	return {
		id: 'test-marketplace-id',
		type: 'marketplace',
		attributes: {
			name: 'Test Marketplace',
			...overrides,
		},
	};
}

/**
 * Creates a mock image resource
 */
export function createMockImage(overrides: Partial<IDataObject> = {}): IDataObject {
	return {
		id: 'test-image-id',
		type: 'image',
		attributes: {
			variants: {},
			...overrides,
		},
	};
}

/**
 * Creates a mock asset resource
 */
export function createMockAsset(overrides: Partial<IDataObject> = {}): IDataObject {
	return {
		listingFields: {},
		listingTypes: [],
		...overrides,
	};
}

/**
 * Helper to create and mock the Sharetribe class with request/query verification
 * Returns both the mocked request/query functions and helpers to get the last call's arguments
 */
export function mockSharetribeRequest() {
	const mockRequest = jest.fn();
	const mockQuery = jest.fn();
	const SharetribeMock = jest.fn().mockImplementation(() => ({
		request: mockRequest,
		query: mockQuery,
	}));

	return {
		SharetribeMock,
		mockRequest,
		mockQuery,
		getLastRequestOptions: () => {
			const calls = mockRequest.mock.calls;
			if (calls.length === 0) {
				throw new Error('No request calls made');
			}
			return calls[calls.length - 1][0]; // Returns the options object
		},
		getLastQueryCall: () => {
			const calls = mockQuery.mock.calls;
			if (calls.length === 0) {
				throw new Error('No query calls made');
			}
			// query(endpoint, qs, resultOptions)
			return {
				endpoint: calls[calls.length - 1][0],
				qs: calls[calls.length - 1][1],
				resultOptions: calls[calls.length - 1][2],
			};
		},
	};
}

/**
 * Asserts that query string has no duplicate keys
 */
export function assertNoDuplicateKeys(qs: IDataObject): void {
	const keys = Object.keys(qs);
	const uniqueKeys = new Set(keys);
	expect(keys.length).toBe(uniqueKeys.size);
}

/**
 * Asserts that query string contains expected fields parameter
 * Checks both bracket notation (fields[resource]) and dot notation (fields.resource)
 */
export function assertHasFields(qs: IDataObject, resource: string, expectedFields: string[]): void {
	const bracketKey = `fields[${resource}]`;
	const dotKey = `fields.${resource}`;

	// Check which key exists in the query string
	const fieldsValue = qs[bracketKey] || qs[dotKey];
	expect(fieldsValue).toBeDefined();

	const actualFields = Array.isArray(fieldsValue) ? fieldsValue : (fieldsValue as string).split(',');

	expectedFields.forEach((field) => {
		expect(actualFields).toContain(field);
	});
}

/**
 * Asserts that query string contains expected include parameter
 */
export function assertHasInclude(qs: IDataObject, expectedIncludes: string[]): void {
	expect(qs).toHaveProperty('include');
	const actualIncludes = Array.isArray(qs.include)
		? qs.include
		: (qs.include as string).split(',');
	expectedIncludes.forEach((include) => {
		expect(actualIncludes).toContain(include);
	});
}
