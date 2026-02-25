import * as executeModule from '../../../../../v1/actions/listing/getMany/execute';
import * as SharetribeHelpers from '../../../../../v1/helpers/Sharetribe';
import { createMockExecuteFunction, mockSharetribeRequest, assertNoDuplicateKeys, assertHasFields, assertHasInclude } from '../../../../helpers';

describe('listing/getMany', () => {
	let sharetribeMock: ReturnType<typeof mockSharetribeRequest>;

	beforeEach(() => {
		sharetribeMock = mockSharetribeRequest();
		jest.spyOn(SharetribeHelpers, 'Sharetribe').mockImplementation(sharetribeMock.SharetribeMock);
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	it('should call correct endpoint with query params', async () => {
		const mockExecuteFunction = createMockExecuteFunction({
			returnAll: false,
			limit: 50,
			simplify: true,
			options: {},
			filterOptions: {},
			sort: {},
		});

		sharetribeMock.mockQuery.mockResolvedValue({
			data: [{ json: { id: 'test' } }],
		});

		await executeModule.execute.call(mockExecuteFunction);

		const call = sharetribeMock.getLastQueryCall();
		expect(call.endpoint).toBe('listings/query');
		expect(call.qs).toBeDefined();
	});

	it('should include author relationship when requested', async () => {
		const mockExecuteFunction = createMockExecuteFunction({
			returnAll: false,
			limit: 50,
			simplify: false,
			options: {
				outputFields: {
					listingFields: ['title', 'description', 'author'],
					authorFields: ['profile.displayName'],
				},
			},
			filterOptions: {},
			sort: {},
		});

		sharetribeMock.mockQuery.mockResolvedValue({
			data: [{ json: { id: 'test' } }],
		});

		await executeModule.execute.call(mockExecuteFunction);

		const call = sharetribeMock.getLastQueryCall();
		expect(call.qs).toBeDefined();
		assertHasInclude(call.qs, ['author']);
		assertHasFields(call.qs, 'user', ['profile.displayName']);
	});

	it('should include multiple relationships when requested', async () => {
		const mockExecuteFunction = createMockExecuteFunction({
			returnAll: false,
			limit: 50,
			simplify: false,
			options: {
				outputFields: {
					listingFields: ['title', 'author', 'images'],
					authorFields: ['profile.displayName'],
				},
			},
			filterOptions: {},
			sort: {},
		});

		sharetribeMock.mockQuery.mockResolvedValue({
			data: [{ json: { id: 'test' } }],
		});

		await executeModule.execute.call(mockExecuteFunction);

		const call = sharetribeMock.getLastQueryCall();
		assertHasInclude(call.qs, ['author', 'images']);
		assertHasFields(call.qs, 'user', ['profile.displayName']);
	});

	it('should add sparse fields for listing when specified', async () => {
		const mockExecuteFunction = createMockExecuteFunction({
			returnAll: false,
			limit: 50,
			simplify: false,
			options: {
				outputFields: {
					listingFields: ['title', 'description', 'price'],
				},
			},
			filterOptions: {},
			sort: {},
		});

		sharetribeMock.mockQuery.mockResolvedValue({
			data: [{ json: { id: 'test' } }],
		});

		await executeModule.execute.call(mockExecuteFunction);

		const call = sharetribeMock.getLastQueryCall();
		assertHasFields(call.qs, 'listing', ['title', 'description', 'price']);
	});

	it('should add filter by state', async () => {
		const mockExecuteFunction = createMockExecuteFunction({
			returnAll: false,
			limit: 50,
			simplify: true,
			options: {},
			filterOptions: {
				states: ['published', 'closed'],
			},
			sort: {},
		});

		sharetribeMock.mockQuery.mockResolvedValue({
			data: [{ json: { id: 'test' } }],
		});

		await executeModule.execute.call(mockExecuteFunction);

		const call = sharetribeMock.getLastQueryCall();
		expect(call.qs['states']).toBeDefined();
		expect(call.qs['states']).toContain('published');
		expect(call.qs['states']).toContain('closed');
	});

	it('should add filter by author ID', async () => {
		const mockExecuteFunction = createMockExecuteFunction({
			returnAll: false,
			limit: 50,
			simplify: true,
			options: {},
			filterOptions: {
				authorId: '550e8400-e29b-41d6-a716-446655440000',
			},
			sort: {},
		});

		sharetribeMock.mockQuery.mockResolvedValue({
			data: [{ json: { id: 'test' } }],
		});

		await executeModule.execute.call(mockExecuteFunction);

		const call = sharetribeMock.getLastQueryCall();
		expect(call.qs['authorId']).toBe('550e8400-e29b-41d6-a716-446655440000');
	});

	it('should add sorting by createdAt descending', async () => {
		const mockExecuteFunction = createMockExecuteFunction({
			returnAll: false,
			limit: 50,
			simplify: true,
			options: {},
			filterOptions: {},
			sort: {
				sort: [{ field: 'createdAt', direction: 'DESC' }],
			},
		});

		sharetribeMock.mockQuery.mockResolvedValue({
			data: [{ json: { id: 'test' } }],
		});

		await executeModule.execute.call(mockExecuteFunction);

		const call = sharetribeMock.getLastQueryCall();
		expect(call.qs['sort']).toEqual(['createdAt']);
	});

	it('should add sorting by price ascending', async () => {
		const mockExecuteFunction = createMockExecuteFunction({
			returnAll: false,
			limit: 50,
			simplify: true,
			options: {},
			filterOptions: {},
			sort: {
				sort: [{ field: 'price', direction: 'ASC' }],
			},
		});

		sharetribeMock.mockQuery.mockResolvedValue({
			data: [{ json: { id: 'test' } }],
		});

		await executeModule.execute.call(mockExecuteFunction);

		const call = sharetribeMock.getLastQueryCall();
		expect(call.qs['sort']).toEqual(['-price']);
	});

	it('should handle returnAll pagination', async () => {
		const mockExecuteFunction = createMockExecuteFunction({
			returnAll: true,
			simplify: true,
			options: {},
			filterOptions: {},
			sort: {},
		});

		sharetribeMock.mockQuery.mockResolvedValue({
			data: [{ json: { id: 'test' } }],
		});

		await executeModule.execute.call(mockExecuteFunction);

		const call = sharetribeMock.getLastQueryCall();
		expect(call.resultOptions).toBeDefined();
		expect(call.resultOptions.mode).toBe('returnAll');
	});

	it('should handle limited pagination', async () => {
		const mockExecuteFunction = createMockExecuteFunction({
			returnAll: false,
			limit: 25,
			simplify: true,
			options: {},
			filterOptions: {},
			sort: {},
		});

		sharetribeMock.mockQuery.mockResolvedValue({
			data: [{ json: { id: 'test' } }],
		});

		await executeModule.execute.call(mockExecuteFunction);

		const call = sharetribeMock.getLastQueryCall();
		expect(call.resultOptions).toBeDefined();
		expect(call.resultOptions.mode).toBe('limit');
		expect(call.resultOptions.limit).toBe(25);
	});

	it('should not have duplicate keys in query string', async () => {
		const mockExecuteFunction = createMockExecuteFunction({
			returnAll: false,
			limit: 50,
			simplify: false,
			options: {
				outputFields: {
					listingFields: ['title', 'description', 'author', 'images'],
					userFields: ['profile.displayName'],
					imageFields: ['variants.square-small.url'],
				},
			},
			filterOptions: {
				states: ['published'],
				authorId: '550e8400-e29b-41d6-a716-446655440000',
			},
			sort: {
				sort: [{ field: 'createdAt', direction: 'DESC' }],
			},
		});

		sharetribeMock.mockQuery.mockResolvedValue({
			data: [{ json: { id: 'test' } }],
		});

		await executeModule.execute.call(mockExecuteFunction);

		const call = sharetribeMock.getLastQueryCall();
		assertNoDuplicateKeys(call.qs);
	});

	it('should combine filters, sorting, fields, and relationships', async () => {
		const mockExecuteFunction = createMockExecuteFunction({
			returnAll: false,
			limit: 100,
			simplify: false,
			options: {
				outputFields: {
					listingFields: ['title', 'description', 'price', 'state', 'author', 'images'],
					authorFields: ['profile.displayName', 'profile.abbreviatedName'],
				},
			},
			filterOptions: {
				states: ['published', 'closed'],
				authorId: '550e8400-e29b-41d6-a716-446655440000',
			},
			sort: {
				sort: [{ field: 'price', direction: 'ASC' }],
			},
		});

		sharetribeMock.mockQuery.mockResolvedValue({
			data: [{ json: { id: 'test' } }],
		});

		await executeModule.execute.call(mockExecuteFunction);

		const call = sharetribeMock.getLastQueryCall();

		// Check endpoint
		expect(call.endpoint).toBe('listings/query');

		// Check filters
		expect(call.qs['states']).toContain('published');
		expect(call.qs['states']).toContain('closed');
		expect(call.qs['authorId']).toBe('550e8400-e29b-41d6-a716-446655440000');

		// Check sorting
		expect(call.qs['sort']).toEqual(['-price']);

		// Check fields
		assertHasFields(call.qs, 'listing', ['title', 'description', 'price', 'state']);
		assertHasFields(call.qs, 'user', ['profile.displayName', 'profile.abbreviatedName']);

		// Check relationships
		assertHasInclude(call.qs, ['author', 'images']);

		// Check no duplicate keys
		assertNoDuplicateKeys(call.qs);

		// Check pagination
		expect(call.resultOptions.mode).toBe('limit');
		expect(call.resultOptions.limit).toBe(100);
	});
});
