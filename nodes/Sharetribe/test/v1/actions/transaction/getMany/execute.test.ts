import * as executeModule from '../../../../../v1/actions/transaction/getMany/execute';
import * as SharetribeHelpers from '../../../../../v1/helpers/Sharetribe';
import {
	createMockExecuteFunction,
	mockSharetribeRequest,
	assertNoDuplicateKeys,
	assertHasFields,
	assertHasInclude,
} from '../../../../helpers';

describe('transaction/getMany', () => {
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
		expect(call.endpoint).toBe('transactions/query');
		expect(call.qs).toBeDefined();
	});

	it('should include customer relationship when requested', async () => {
		const mockExecuteFunction = createMockExecuteFunction({
			returnAll: false,
			limit: 50,
			simplify: false,
			options: {
				outputFields: {
					transactionFields: ['lastTransition', 'customer'],
					userFields: ['profile.displayName'],
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
		assertHasInclude(call.qs, ['customer']);
		assertHasFields(call.qs, 'user', ['profile.displayName']);
	});

	it('should include multiple user relationships when requested', async () => {
		const mockExecuteFunction = createMockExecuteFunction({
			returnAll: false,
			limit: 50,
			simplify: false,
			options: {
				outputFields: {
					transactionFields: ['lastTransition', 'customer', 'provider'],
					userFields: ['profile.displayName', 'email'],
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
		assertHasInclude(call.qs, ['customer', 'provider']);
		assertHasFields(call.qs, 'user', ['profile.displayName', 'email']);
	});

	it('should include listing relationship when requested', async () => {
		const mockExecuteFunction = createMockExecuteFunction({
			returnAll: false,
			limit: 50,
			simplify: false,
			options: {
				outputFields: {
					transactionFields: ['lastTransition', 'listing'],
					listingFields: ['title', 'state'],
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
		assertHasInclude(call.qs, ['listing']);
		assertHasFields(call.qs, 'listing', ['title', 'state']);
	});

	it('should add sparse fields for transaction when specified', async () => {
		const mockExecuteFunction = createMockExecuteFunction({
			returnAll: false,
			limit: 50,
			simplify: false,
			options: {
				outputFields: {
					transactionFields: ['lastTransition', 'lastTransitionedAt', 'createdAt'],
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
		assertHasFields(call.qs, 'transaction', ['lastTransition', 'lastTransitionedAt', 'createdAt']);
	});

	it('should add filter by customer ID', async () => {
		const mockExecuteFunction = createMockExecuteFunction({
			returnAll: false,
			limit: 50,
			simplify: true,
			options: {},
			filterOptions: {
				customerId: '550e8400-e29b-41d6-a716-446655440000',
			},
			sort: {},
		});

		sharetribeMock.mockQuery.mockResolvedValue({
			data: [{ json: { id: 'test' } }],
		});

		await executeModule.execute.call(mockExecuteFunction);

		const call = sharetribeMock.getLastQueryCall();
		expect(call.qs['customerId']).toBe('550e8400-e29b-41d6-a716-446655440000');
	});

	it('should add filter by provider ID', async () => {
		const mockExecuteFunction = createMockExecuteFunction({
			returnAll: false,
			limit: 50,
			simplify: true,
			options: {},
			filterOptions: {
				providerId: '550e8400-e29b-41d6-a716-446655440001',
			},
			sort: {},
		});

		sharetribeMock.mockQuery.mockResolvedValue({
			data: [{ json: { id: 'test' } }],
		});

		await executeModule.execute.call(mockExecuteFunction);

		const call = sharetribeMock.getLastQueryCall();
		expect(call.qs['providerId']).toBe('550e8400-e29b-41d6-a716-446655440001');
	});

	it('should add filter by listing ID', async () => {
		const mockExecuteFunction = createMockExecuteFunction({
			returnAll: false,
			limit: 50,
			simplify: true,
			options: {},
			filterOptions: {
				listingId: '550e8400-e29b-41d6-a716-446655440002',
			},
			sort: {},
		});

		sharetribeMock.mockQuery.mockResolvedValue({
			data: [{ json: { id: 'test' } }],
		});

		await executeModule.execute.call(mockExecuteFunction);

		const call = sharetribeMock.getLastQueryCall();
		expect(call.qs['listingId']).toBe('550e8400-e29b-41d6-a716-446655440002');
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

	it('should add sorting by lastTransitionedAt ascending', async () => {
		const mockExecuteFunction = createMockExecuteFunction({
			returnAll: false,
			limit: 50,
			simplify: true,
			options: {},
			filterOptions: {},
			sort: {
				sort: [{ field: 'lastTransitionedAt', direction: 'ASC' }],
			},
		});

		sharetribeMock.mockQuery.mockResolvedValue({
			data: [{ json: { id: 'test' } }],
		});

		await executeModule.execute.call(mockExecuteFunction);

		const call = sharetribeMock.getLastQueryCall();
		expect(call.qs['sort']).toEqual(['-lastTransitionedAt']);
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
					transactionFields: ['lastTransition', 'customer', 'provider', 'listing'],
					userFields: ['profile.displayName'],
					listingFields: ['title'],
				},
			},
			filterOptions: {
				customerId: '550e8400-e29b-41d6-a716-446655440000',
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
					transactionFields: [
						'lastTransition',
						'lastTransitionedAt',
						'createdAt',
						'customer',
						'provider',
						'listing',
					],
					userFields: ['profile.displayName', 'email'],
					listingFields: ['title', 'state', 'price'],
				},
			},
			filterOptions: {
				customerId: '550e8400-e29b-41d6-a716-446655440000',
				listingId: '550e8400-e29b-41d6-a716-446655440001',
			},
			sort: {
				sort: [{ field: 'lastTransitionedAt', direction: 'DESC' }],
			},
		});

		sharetribeMock.mockQuery.mockResolvedValue({
			data: [{ json: { id: 'test' } }],
		});

		await executeModule.execute.call(mockExecuteFunction);

		const call = sharetribeMock.getLastQueryCall();

		// Check endpoint
		expect(call.endpoint).toBe('transactions/query');

		// Check filters
		expect(call.qs['customerId']).toBe('550e8400-e29b-41d6-a716-446655440000');
		expect(call.qs['listingId']).toBe('550e8400-e29b-41d6-a716-446655440001');

		// Check sorting
		expect(call.qs['sort']).toEqual(['lastTransitionedAt']);

		// Check fields
		assertHasFields(call.qs, 'transaction', ['lastTransition', 'lastTransitionedAt', 'createdAt']);
		assertHasFields(call.qs, 'user', ['profile.displayName', 'email']);
		assertHasFields(call.qs, 'listing', ['title', 'state', 'price']);

		// Check relationships
		assertHasInclude(call.qs, ['customer', 'provider', 'listing']);

		// Check no duplicate keys
		assertNoDuplicateKeys(call.qs);

		// Check pagination
		expect(call.resultOptions.mode).toBe('limit');
		expect(call.resultOptions.limit).toBe(100);
	});

	it('should add filter by lastTransitions', async () => {
		const mockExecuteFunction = createMockExecuteFunction({
			returnAll: false,
			limit: 50,
			simplify: true,
			options: {},
			filterOptions: {
				lastTransitions: { mode: 'name', value: 'transition/accept' },
			},
			sort: {},
		});

		sharetribeMock.mockQuery.mockResolvedValue({
			data: [{ json: { id: 'test' } }],
		});

		await executeModule.execute.call(mockExecuteFunction);

		const call = sharetribeMock.getLastQueryCall();
		expect(call.qs['lastTransitions']).toBe('transition/accept');
	});

	it('should add filter by states', async () => {
		const mockExecuteFunction = createMockExecuteFunction({
			returnAll: false,
			limit: 50,
			simplify: true,
			options: {},
			filterOptions: {
				states: { mode: 'name', value: 'state/accepted' },
			},
			sort: {},
		});

		sharetribeMock.mockQuery.mockResolvedValue({
			data: [{ json: { id: 'test' } }],
		});

		await executeModule.execute.call(mockExecuteFunction);

		const call = sharetribeMock.getLastQueryCall();
		expect(call.qs['states']).toBe('state/accepted');
	});

	it('should add filter by processNames', async () => {
		const mockExecuteFunction = createMockExecuteFunction({
			returnAll: false,
			limit: 50,
			simplify: true,
			options: {},
			filterOptions: {
				processNames: { mode: 'name', value: 'default-booking' },
			},
			sort: {},
		});

		sharetribeMock.mockQuery.mockResolvedValue({
			data: [{ json: { id: 'test' } }],
		});

		await executeModule.execute.call(mockExecuteFunction);

		const call = sharetribeMock.getLastQueryCall();
		expect(call.qs['processNames']).toBe('default-booking');
	});

	it('should add filter by createdAtStart', async () => {
		const mockExecuteFunction = createMockExecuteFunction({
			returnAll: false,
			limit: 50,
			simplify: true,
			options: {},
			filterOptions: {
				createdAtStart: '2024-01-01T00:00:00.000Z',
			},
			sort: {},
		});

		sharetribeMock.mockQuery.mockResolvedValue({
			data: [{ json: { id: 'test' } }],
		});

		await executeModule.execute.call(mockExecuteFunction);

		const call = sharetribeMock.getLastQueryCall();
		expect(call.qs['createdAtStart']).toBeDefined();
	});

	it('should add filter by createdAtEnd', async () => {
		const mockExecuteFunction = createMockExecuteFunction({
			returnAll: false,
			limit: 50,
			simplify: true,
			options: {},
			filterOptions: {
				createdAtEnd: '2024-12-31T23:59:59.999Z',
			},
			sort: {},
		});

		sharetribeMock.mockQuery.mockResolvedValue({
			data: [{ json: { id: 'test' } }],
		});

		await executeModule.execute.call(mockExecuteFunction);

		const call = sharetribeMock.getLastQueryCall();
		expect(call.qs['createdAtEnd']).toBeDefined();
	});

	it('should add boolean filter hasBooking', async () => {
		const mockExecuteFunction = createMockExecuteFunction({
			returnAll: false,
			limit: 50,
			simplify: true,
			options: {},
			filterOptions: {
				hasBooking: true,
			},
			sort: {},
		});

		sharetribeMock.mockQuery.mockResolvedValue({
			data: [{ json: { id: 'test' } }],
		});

		await executeModule.execute.call(mockExecuteFunction);

		const call = sharetribeMock.getLastQueryCall();
		expect(call.qs['hasBooking']).toBe('true');
	});

	it('should add metadata filter', async () => {
		const mockExecuteFunction = createMockExecuteFunction({
			returnAll: false,
			limit: 50,
			simplify: true,
			options: {},
			filterOptions: {
				metadata: {
					metadataFilter: {
						metadataAttributeName: { mode: 'name', value: 'priority' },
						condition_type: 'eq',
						extendedDataValue: 'high',
					},
				},
			},
			sort: {},
		});

		sharetribeMock.mockQuery.mockResolvedValue({
			data: [{ json: { id: 'test' } }],
		});

		await executeModule.execute.call(mockExecuteFunction);

		const call = sharetribeMock.getLastQueryCall();
		expect(call.qs['meta_priority']).toBe('high');
	});

	it('should add protectedData filter', async () => {
		const mockExecuteFunction = createMockExecuteFunction({
			returnAll: false,
			limit: 50,
			simplify: true,
			options: {},
			filterOptions: {
				protectedData: {
					protectedDataFilter: {
						protectedDataAttributeName: { mode: 'name', value: 'internalId' },
						condition_type: 'eq',
						extendedDataValue: '12345',
					},
				},
			},
			sort: {},
		});

		sharetribeMock.mockQuery.mockResolvedValue({
			data: [{ json: { id: 'test' } }],
		});

		await executeModule.execute.call(mockExecuteFunction);

		const call = sharetribeMock.getLastQueryCall();
		expect(call.qs['prot_internalId']).toBe('12345');
	});

	it('should map user metadata to profile.metadata', async () => {
		const mockExecuteFunction = createMockExecuteFunction({
			returnAll: false,
			limit: 50,
			simplify: false,
			options: {
				outputFields: {
					transactionFields: ['lastTransition', 'provider'],
					userFields: ['profile.lastName', 'metadata'],
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
		expect(call.qs['fields.user']).toContain('profile.metadata');
		expect(call.qs['fields.user']).not.toContain('metadata');
	});
});
