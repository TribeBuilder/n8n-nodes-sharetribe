import * as listingGetManyExecute from '../../../v1/actions/listing/getMany/execute';
import * as transactionGetManyExecute from '../../../v1/actions/transaction/getMany/execute';
import * as userGetManyExecute from '../../../v1/actions/user/getMany/execute';
import * as SharetribeHelpers from '../../../v1/helpers/Sharetribe';
import {
	createMockExecuteFunction,
	mockSharetribeRequest,
	assertNoDuplicateKeys,
	assertHasFields,
	assertHasInclude,
} from '../../helpers';

describe('Query Builder Integration Tests', () => {
	let sharetribeMock: ReturnType<typeof mockSharetribeRequest>;

	beforeEach(() => {
		sharetribeMock = mockSharetribeRequest();
		jest.spyOn(SharetribeHelpers, 'Sharetribe').mockImplementation(sharetribeMock.SharetribeMock);
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	describe('listing/getMany - Complex Real-World Queries', () => {
		it('should handle marketplace listing search with all features', async () => {
			// Real-world scenario: Get published listings by specific author with full details
			const mockExecuteFunction = createMockExecuteFunction({
				returnAll: false,
				limit: 20,
				simplify: false,
				options: {
					outputFields: {
						listingFields: [
							'title',
							'description',
							'price',
							'state',
							'createdAt',
							'publicData',
							'geolocation',
							'author',
							'images',
						],
						authorFields: ['displayName', 'email', 'bio', 'profileImage'],
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

			await listingGetManyExecute.execute.call(mockExecuteFunction);

			const call = sharetribeMock.getLastQueryCall();

			// Verify endpoint
			expect(call.endpoint).toBe('listings/query');

			// Verify filters
			expect(call.qs['states']).toContain('published');
			expect(call.qs['authorId']).toBe('550e8400-e29b-41d6-a716-446655440000');

			// Verify sorting
			expect(call.qs['sort']).toEqual(['createdAt']);

			// Verify sparse fields
			assertHasFields(call.qs, 'listing', [
				'title',
				'description',
				'price',
				'state',
				'createdAt',
				'publicData',
				'geolocation',
			]);
			assertHasFields(call.qs, 'user', ['profile.displayName', 'email', 'profile.bio']);

			// Verify relationships
			assertHasInclude(call.qs, ['author', 'images', 'author.profileImage']);

			// Verify no duplicate keys
			assertNoDuplicateKeys(call.qs);

			// Verify pagination
			expect(call.resultOptions.mode).toBe('limit');
			expect(call.resultOptions.limit).toBe(20);
		});

		it('should handle price-sorted product search', async () => {
			// Real-world scenario: Get all published listings sorted by price ascending
			const mockExecuteFunction = createMockExecuteFunction({
				returnAll: true,
				simplify: false,
				options: {
					outputFields: {
						listingFields: ['title', 'price', 'state', 'images'],
					},
				},
				filterOptions: {
					states: ['published'],
				},
				sort: {
					sort: [{ field: 'price', direction: 'ASC' }],
				},
			});

			sharetribeMock.mockQuery.mockResolvedValue({
				data: [{ json: { id: 'test' } }],
			});

			await listingGetManyExecute.execute.call(mockExecuteFunction);

			const call = sharetribeMock.getLastQueryCall();

			expect(call.qs['states']).toContain('published');
			expect(call.qs['sort']).toEqual(['-price']);
			assertHasFields(call.qs, 'listing', ['title', 'price', 'state']);
			assertHasInclude(call.qs, ['images']);
			expect(call.resultOptions.mode).toBe('returnAll');
		});

		it('should handle minimal simplified query', async () => {
			// Real-world scenario: Simple listing fetch with default fields
			const mockExecuteFunction = createMockExecuteFunction({
				returnAll: false,
				limit: 10,
				simplify: true,
				options: {},
				filterOptions: {},
				sort: {},
			});

			sharetribeMock.mockQuery.mockResolvedValue({
				data: [{ json: { id: 'test' } }],
			});

			await listingGetManyExecute.execute.call(mockExecuteFunction);

			const call = sharetribeMock.getLastQueryCall();

			expect(call.endpoint).toBe('listings/query');
			expect(call.qs).toBeDefined();
			expect(call.resultOptions.mode).toBe('limit');
			expect(call.resultOptions.limit).toBe(10);
		});
	});

	describe('transaction/getMany - Complex Real-World Queries', () => {
		it('should handle transaction history with full participant details', async () => {
			// Real-world scenario: Get all transactions for a customer with full details
			const mockExecuteFunction = createMockExecuteFunction({
				returnAll: true,
				simplify: false,
				options: {
					outputFields: {
						transactionFields: [
							'lastTransition',
							'lastTransitionedAt',
							'createdAt',
							'payinTotal',
							'payoutTotal',
							'lineItems',
							'protectedData',
							'customer',
							'provider',
							'listing',
						],
						userFields: ['displayName', 'email', 'profileImage'],
						listingFields: ['title', 'price', 'images'],
					},
				},
				filterOptions: {
					customerId: '550e8400-e29b-41d6-a716-446655440000',
				},
				sort: {
					sort: [{ field: 'lastTransitionedAt', direction: 'DESC' }],
				},
			});

			sharetribeMock.mockQuery.mockResolvedValue({
				data: [{ json: { id: 'test' } }],
			});

			await transactionGetManyExecute.execute.call(mockExecuteFunction);

			const call = sharetribeMock.getLastQueryCall();

			// Verify endpoint
			expect(call.endpoint).toBe('transactions/query');

			// Verify filters
			expect(call.qs['customerId']).toBe('550e8400-e29b-41d6-a716-446655440000');

			// Verify sorting
			expect(call.qs['sort']).toEqual(['lastTransitionedAt']);

			// Verify sparse fields
			assertHasFields(call.qs, 'transaction', [
				'lastTransition',
				'lastTransitionedAt',
				'createdAt',
				'payinTotal',
				'payoutTotal',
				'lineItems',
				'protectedData',
			]);
			assertHasFields(call.qs, 'user', ['profile.displayName', 'email']);
			assertHasFields(call.qs, 'listing', ['title', 'price']);

			// Verify relationships
			assertHasInclude(call.qs, [
				'customer',
				'provider',
				'listing',
				'customer.profileImage',
				'provider.profileImage',
				'listing.images',
			]);

			// Verify no duplicate keys
			assertNoDuplicateKeys(call.qs);

			// Verify pagination
			expect(call.resultOptions.mode).toBe('returnAll');
		});

		it('should handle provider transaction search with listing details', async () => {
			// Real-world scenario: Get provider's transactions for a specific listing
			const mockExecuteFunction = createMockExecuteFunction({
				returnAll: false,
				limit: 50,
				simplify: false,
				options: {
					outputFields: {
						transactionFields: ['lastTransition', 'createdAt', 'customer', 'listing'],
						userFields: ['displayName', 'email'],
						listingFields: ['title'],
					},
				},
				filterOptions: {
					providerId: '550e8400-e29b-41d6-a716-446655440001',
					listingId: '550e8400-e29b-41d6-a716-446655440002',
				},
				sort: {
					sort: [{ field: 'createdAt', direction: 'DESC' }],
				},
			});

			sharetribeMock.mockQuery.mockResolvedValue({
				data: [{ json: { id: 'test' } }],
			});

			await transactionGetManyExecute.execute.call(mockExecuteFunction);

			const call = sharetribeMock.getLastQueryCall();

			expect(call.qs['providerId']).toBe('550e8400-e29b-41d6-a716-446655440001');
			expect(call.qs['listingId']).toBe('550e8400-e29b-41d6-a716-446655440002');
			expect(call.qs['sort']).toEqual(['createdAt']);
			assertHasFields(call.qs, 'transaction', ['lastTransition', 'createdAt']);
			assertHasFields(call.qs, 'user', ['profile.displayName', 'email']);
			assertHasFields(call.qs, 'listing', ['title']);
			assertHasInclude(call.qs, ['customer', 'listing']);
			assertNoDuplicateKeys(call.qs);
		});

		it('should handle multiple filters and relationships', async () => {
			// Real-world scenario: Complex transaction search with multiple filters
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
							'payinTotal',
							'customer',
							'provider',
							'listing',
						],
						userFields: ['displayName'],
						listingFields: ['title', 'price'],
					},
				},
				filterOptions: {
					customerId: '550e8400-e29b-41d6-a716-446655440000',
					listingId: '550e8400-e29b-41d6-a716-446655440002',
				},
				sort: {
					sort: [{ field: 'lastTransitionedAt', direction: 'DESC' }],
				},
			});

			sharetribeMock.mockQuery.mockResolvedValue({
				data: [{ json: { id: 'test' } }],
			});

			await transactionGetManyExecute.execute.call(mockExecuteFunction);

			const call = sharetribeMock.getLastQueryCall();

			expect(call.qs['customerId']).toBe('550e8400-e29b-41d6-a716-446655440000');
			expect(call.qs['listingId']).toBe('550e8400-e29b-41d6-a716-446655440002');
			assertNoDuplicateKeys(call.qs);
		});
	});

	describe('user/getMany - Complex Real-World Queries', () => {
		it('should handle user directory with profile images', async () => {
			// Real-world scenario: Get all users with profile images
			const mockExecuteFunction = createMockExecuteFunction({
				returnAll: true,
				simplify: false,
				options: {
					outputFields: {
						userFields: [
							'displayName',
							'firstName',
							'lastName',
							'email',
							'bio',
							'createdAt',
							'profileImage',
						],
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

			await userGetManyExecute.execute.call(mockExecuteFunction);

			const call = sharetribeMock.getLastQueryCall();

			expect(call.endpoint).toBe('users/query');
			assertHasFields(call.qs, 'user', [
				'profile.displayName',
				'profile.firstName',
				'profile.lastName',
				'email',
				'profile.bio',
				'createdAt',
			]);
			assertHasInclude(call.qs, ['profileImage']);
			expect(call.qs['sort']).toEqual(['createdAt']);
			assertNoDuplicateKeys(call.qs);
			expect(call.resultOptions.mode).toBe('returnAll');
		});

		it('should handle user search with minimal fields', async () => {
			// Real-world scenario: Simple user lookup with email only
			const mockExecuteFunction = createMockExecuteFunction({
				returnAll: false,
				limit: 25,
				simplify: false,
				options: {
					outputFields: {
						userFields: ['email', 'displayName'],
					},
				},
				filterOptions: {},
				sort: {
					sort: [{ field: 'email', direction: 'ASC' }],
				},
			});

			sharetribeMock.mockQuery.mockResolvedValue({
				data: [{ json: { id: 'test' } }],
			});

			await userGetManyExecute.execute.call(mockExecuteFunction);

			const call = sharetribeMock.getLastQueryCall();

			assertHasFields(call.qs, 'user', ['email', 'profile.displayName']);
			expect(call.qs['sort']).toEqual(['-email']);
			expect(call.resultOptions.limit).toBe(25);
		});

		it('should handle user query with extended data fields', async () => {
			// Real-world scenario: Get users with custom extended data
			const mockExecuteFunction = createMockExecuteFunction({
				returnAll: false,
				limit: 50,
				simplify: false,
				options: {
					outputFields: {
						userFields: [
							'displayName',
							'email',
							'publicData',
							'protectedData',
							'metadata',
							'createdAt',
						],
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

			await userGetManyExecute.execute.call(mockExecuteFunction);

			const call = sharetribeMock.getLastQueryCall();

			assertHasFields(call.qs, 'user', [
				'profile.displayName',
				'email',
				'profile.publicData',
				'profile.protectedData',
				'profile.metadata',
				'createdAt',
			]);
			assertNoDuplicateKeys(call.qs);
		});
	});

	describe('Edge Cases and Boundary Conditions', () => {
		it('should handle empty field arrays correctly', async () => {
			const mockExecuteFunction = createMockExecuteFunction({
				returnAll: false,
				limit: 10,
				simplify: false,
				options: {
					outputFields: {
						listingFields: [],
					},
				},
				filterOptions: {},
				sort: {},
			});

			sharetribeMock.mockQuery.mockResolvedValue({
				data: [{ json: { id: 'test' } }],
			});

			await listingGetManyExecute.execute.call(mockExecuteFunction);

			const call = sharetribeMock.getLastQueryCall();
			expect(call.endpoint).toBe('listings/query');
		});

		it('should handle very large limit values', async () => {
			const mockExecuteFunction = createMockExecuteFunction({
				returnAll: false,
				limit: 500,
				simplify: true,
				options: {},
				filterOptions: {},
				sort: {},
			});

			sharetribeMock.mockQuery.mockResolvedValue({
				data: [{ json: { id: 'test' } }],
			});

			await listingGetManyExecute.execute.call(mockExecuteFunction);

			const call = sharetribeMock.getLastQueryCall();
			expect(call.resultOptions.limit).toBe(500);
		});

		it('should handle multiple state filters for listings', async () => {
			const mockExecuteFunction = createMockExecuteFunction({
				returnAll: false,
				limit: 10,
				simplify: true,
				options: {},
				filterOptions: {
					states: ['published', 'closed', 'draft'],
				},
				sort: {},
			});

			sharetribeMock.mockQuery.mockResolvedValue({
				data: [{ json: { id: 'test' } }],
			});

			await listingGetManyExecute.execute.call(mockExecuteFunction);

			const call = sharetribeMock.getLastQueryCall();
			expect(call.qs['states']).toContain('published');
			expect(call.qs['states']).toContain('closed');
			expect(call.qs['states']).toContain('draft');
		});

		it('should handle relationship-only queries (no direct attributes)', async () => {
			const mockExecuteFunction = createMockExecuteFunction({
				returnAll: false,
				limit: 10,
				simplify: false,
				options: {
					outputFields: {
						listingFields: ['author', 'images'],
						authorFields: ['displayName'],
					},
				},
				filterOptions: {},
				sort: {},
			});

			sharetribeMock.mockQuery.mockResolvedValue({
				data: [{ json: { id: 'test' } }],
			});

			await listingGetManyExecute.execute.call(mockExecuteFunction);

			const call = sharetribeMock.getLastQueryCall();
			assertHasInclude(call.qs, ['author', 'images']);
			assertHasFields(call.qs, 'user', ['profile.displayName']);
		});
	});

	describe('Field Consistency Tests', () => {
		it('should consistently map user fields across all resource types', async () => {
			// Test that user fields are mapped the same way in listings (author) and transactions (customer/provider)
			const userFields = ['displayName', 'email', 'firstName'];

			// Test in listing context
			const listingMock = createMockExecuteFunction({
				returnAll: false,
				limit: 10,
				simplify: false,
				options: {
					outputFields: {
						listingFields: ['author'],
						authorFields: userFields,
					},
				},
				filterOptions: {},
				sort: {},
			});

			sharetribeMock.mockQuery.mockResolvedValue({
				data: [{ json: { id: 'test' } }],
			});

			await listingGetManyExecute.execute.call(listingMock);
			const listingCall = sharetribeMock.getLastQueryCall();

			// Test in transaction context
			const transactionMock = createMockExecuteFunction({
				returnAll: false,
				limit: 10,
				simplify: false,
				options: {
					outputFields: {
						transactionFields: ['customer'],
						userFields: userFields,
					},
				},
				filterOptions: {},
				sort: {},
			});

			await transactionGetManyExecute.execute.call(transactionMock);
			const transactionCall = sharetribeMock.getLastQueryCall();

			// Both should have the same user field mappings
			expect(listingCall.qs['fields.user']).toEqual(transactionCall.qs['fields.user']);
		});

		it('should map all standard listing attributes correctly', async () => {
			const allListingAttributes = [
				'title',
				'description',
				'price',
				'state',
				'createdAt',
				'geolocation',
				'publicData',
				'privateData',
				'metadata',
				'deleted',
				'availabilityPlan',
			];

			const mockExecuteFunction = createMockExecuteFunction({
				returnAll: false,
				limit: 10,
				simplify: false,
				options: {
					outputFields: {
						listingFields: allListingAttributes,
					},
				},
				filterOptions: {},
				sort: {},
			});

			sharetribeMock.mockQuery.mockResolvedValue({
				data: [{ json: { id: 'test' } }],
			});

			await listingGetManyExecute.execute.call(mockExecuteFunction);

			const call = sharetribeMock.getLastQueryCall();
			assertHasFields(call.qs, 'listing', allListingAttributes);
		});

		it('should map all standard transaction attributes correctly', async () => {
			const allTransactionAttributes = [
				'lastTransition',
				'lastTransitionedAt',
				'createdAt',
				'processName',
				'processVersion',
				'payinTotal',
				'payoutTotal',
				'lineItems',
				'protectedData',
				'metadata',
				'state',
			];

			const mockExecuteFunction = createMockExecuteFunction({
				returnAll: false,
				limit: 10,
				simplify: false,
				options: {
					outputFields: {
						transactionFields: allTransactionAttributes,
					},
				},
				filterOptions: {},
				sort: {},
			});

			sharetribeMock.mockQuery.mockResolvedValue({
				data: [{ json: { id: 'test' } }],
			});

			await transactionGetManyExecute.execute.call(mockExecuteFunction);

			const call = sharetribeMock.getLastQueryCall();
			assertHasFields(call.qs, 'transaction', allTransactionAttributes);
		});

		it('should map all standard user attributes correctly', async () => {
			const allUserAttributes = [
				'displayName',
				'firstName',
				'lastName',
				'abbreviatedName',
				'bio',
				'email',
				'emailVerified',
				'pendingEmail',
				'stripeConnected',
				'createdAt',
				'state',
				'metadata',
				'deleted',
				'publicData',
				'protectedData',
				'privateData',
			];

			const mockExecuteFunction = createMockExecuteFunction({
				returnAll: false,
				limit: 10,
				simplify: false,
				options: {
					outputFields: {
						userFields: allUserAttributes,
					},
				},
				filterOptions: {},
				sort: {},
			});

			sharetribeMock.mockQuery.mockResolvedValue({
				data: [{ json: { id: 'test' } }],
			});

			await userGetManyExecute.execute.call(mockExecuteFunction);

			const call = sharetribeMock.getLastQueryCall();

			// Verify expected mappings
			const expectedMappings = [
				'profile.displayName',
				'profile.firstName',
				'profile.lastName',
				'profile.abbreviatedName',
				'profile.bio',
				'email',
				'emailVerified',
				'pendingEmail',
				'stripeConnected',
				'createdAt',
				'state',
				'profile.metadata',
				'deleted',
				'profile.publicData',
				'profile.protectedData',
				'profile.privateData',
			];

			assertHasFields(call.qs, 'user', expectedMappings);
		});
	});
});
