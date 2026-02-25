import * as executeModule from '../../../../../v1/actions/user/getMany/execute';
import * as SharetribeHelpers from '../../../../../v1/helpers/Sharetribe';
import {
	createMockExecuteFunction,
	mockSharetribeRequest,
	assertNoDuplicateKeys,
	assertHasFields,
	assertHasInclude,
} from '../../../../helpers';

describe('user/getMany', () => {
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
		expect(call.endpoint).toBe('users/query');
		expect(call.qs).toBeDefined();
	});

	it('should include profileImage relationship when requested', async () => {
		const mockExecuteFunction = createMockExecuteFunction({
			returnAll: false,
			limit: 50,
			simplify: false,
			options: {
				outputFields: {
					userFields: ['email', 'profileImage'],
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
		assertHasInclude(call.qs, ['profileImage']);
	});

	it('should add sparse fields for user when specified', async () => {
		const mockExecuteFunction = createMockExecuteFunction({
			returnAll: false,
			limit: 50,
			simplify: false,
			options: {
				outputFields: {
					userFields: ['email'],
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
		assertHasFields(call.qs, 'user', ['email']);
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

	it('should add sorting by email ascending', async () => {
		const mockExecuteFunction = createMockExecuteFunction({
			returnAll: false,
			limit: 50,
			simplify: true,
			options: {},
			filterOptions: {},
			sort: {
				sort: [{ field: 'email', direction: 'ASC' }],
			},
		});

		sharetribeMock.mockQuery.mockResolvedValue({
			data: [{ json: { id: 'test' } }],
		});

		await executeModule.execute.call(mockExecuteFunction);

		const call = sharetribeMock.getLastQueryCall();
		expect(call.qs['sort']).toEqual(['-email']);
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
					userFields: ['email', 'profileImage'],
				},
			},
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
		assertNoDuplicateKeys(call.qs);
	});

	it('should combine sorting, fields, and relationships', async () => {
		const mockExecuteFunction = createMockExecuteFunction({
			returnAll: false,
			limit: 100,
			simplify: false,
			options: {
				outputFields: {
					userFields: ['email', 'profileImage'],
				},
			},
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

		// Check endpoint
		expect(call.endpoint).toBe('users/query');

		// Check sorting
		expect(call.qs['sort']).toEqual(['createdAt']);

		// Check fields
		assertHasFields(call.qs, 'user', ['email']);

		// Check relationships
		assertHasInclude(call.qs, ['profileImage']);

		// Check no duplicate keys
		assertNoDuplicateKeys(call.qs);

		// Check pagination
		expect(call.resultOptions.mode).toBe('limit');
		expect(call.resultOptions.limit).toBe(100);
	});
});
