import { ExtendedDataManager } from '../../../v1/helpers/ExtendedDataManager';
import { Sharetribe } from '../../../v1/helpers/Sharetribe';
import { createMockExecuteFunction } from '../../helpers';

describe('ExtendedDataManager', () => {
	let mockExecuteFunction: ReturnType<typeof createMockExecuteFunction>;
	let sharetribe: Sharetribe;
	let manager: ExtendedDataManager;

	const USER_ID = '550e8400-e29b-41d6-a716-446655440000';
	const LISTING_ID = '660e8400-e29b-41d6-a716-446655440000';
	const TRANSACTION_ID = '770e8400-e29b-41d6-a716-446655440000';

	beforeEach(() => {
		mockExecuteFunction = createMockExecuteFunction({});
		sharetribe = new Sharetribe(mockExecuteFunction);
		manager = ExtendedDataManager.for(mockExecuteFunction, sharetribe);
	});

	describe('resource configuration', () => {
		it('should configure user resource correctly', () => {
			manager.resource(USER_ID, 'user', 0);
			const nestedInfo = manager.getNestedDataTypes();
			expect(nestedInfo).toBeNull();
		});

		it('should configure listing resource correctly', () => {
			manager.resource(LISTING_ID, 'listing', 0);
			const nestedInfo = manager.getNestedDataTypes();
			expect(nestedInfo).toBeNull();
		});

		it('should configure transaction resource correctly', () => {
			manager.resource(TRANSACTION_ID, 'transaction', 0);
			const nestedInfo = manager.getNestedDataTypes();
			expect(nestedInfo).toBeNull();
		});
	});

	describe('core fields', () => {
		it('should handle user core fields', () => {
			manager
				.resource(USER_ID, 'user', 0)
				.withCoreFields({
					firstName: 'John',
					lastName: 'Doe',
					displayName: 'John Doe',
					bio: 'Test bio',
				})
				.withOutput([], 'simplified', {});

			const { body } = manager.build('users/update_profile', {});

			expect(body.firstName).toBe('John');
			expect(body.lastName).toBe('Doe');
			expect(body.displayName).toBe('John Doe');
			expect(body.bio).toBe('Test bio');
		});

		it('should handle listing core fields', () => {
			manager
				.resource(LISTING_ID, 'listing', 0)
				.withCoreFields({
					title: 'Test Listing',
					description: 'Test description',
				})
				.withOutput([], 'simplified', {});

			const { body } = manager.build('listings/update', {});

			expect(body.title).toBe('Test Listing');
			expect(body.description).toBe('Test description');
		});

		it('should normalize listing geolocation from CSV string', () => {
			manager
				.resource(LISTING_ID, 'listing', 0)
				.withCoreFields({
					geolocation: '40.7128,-74.006',
				})
				.withOutput([], 'simplified', {});

			const { body } = manager.build('listings/update', {});

			expect(body.geolocation).toEqual({ lat: 40.7128, lng: -74.006 });
		});

		it('should normalize listing price from collection', () => {
			manager
				.resource(LISTING_ID, 'listing', 0)
				.withCoreFields({
					price: { priceDetails: { amount: 10000, currency: 'USD' } },
				})
				.withOutput([], 'simplified', {});

			const { body } = manager.build('listings/update', {});

			expect(body.price).toEqual({ amount: 10000, currency: 'USD' });
		});

		it('should skip empty core fields', () => {
			manager
				.resource(USER_ID, 'user', 0)
				.withCoreFields({
					firstName: 'John',
					lastName: '',
				})
				.withOutput([], 'simplified', {});

			const { body } = manager.build('users/update_profile', {});

			expect(body.firstName).toBe('John');
			expect(body.lastName).toBeUndefined();
		});
	});

	describe('extended data updates - manual mode', () => {
		it('should apply top-level manual assignments', () => {
			const fieldsConfig = {
				publicData: {
					publicDataValues: {
						mode: 'manual',
						fields: {
							assignments: [
								{ name: 'Category', value: 'electronics', type: 'string' },
								{ name: 'Price', value: 100, type: 'number' },
							],
						},
					},
				},
			};

			manager
				.resource(LISTING_ID, 'listing', 0)
				.withExtendedDataUpdates(fieldsConfig, ['publicData'])
				.withOutput([], 'simplified', {});

			const { body } = manager.build('listings/update', {});

			expect(body.publicData).toEqual({
				Category: 'electronics',
				Price: 100,
			});
		});

		it('should apply nested manual assignments', () => {
			const fieldsConfig = {
				publicData: {
					publicDataValues: {
						mode: 'manual',
						fields: {
							assignments: [
								{ name: 'details.brand', value: 'Apple', type: 'string' },
								{ name: 'details.model', value: 'iPhone', type: 'string' },
							],
						},
					},
				},
			};

			manager
				.resource(LISTING_ID, 'listing', 0)
				.withExtendedDataUpdates(fieldsConfig, ['publicData'])
				.withOutput([], 'simplified', {});

			const { body } = manager.build('listings/update', {});

			expect(body.publicData).toEqual({
				details: {
					brand: 'Apple',
					model: 'iPhone',
				},
			});
		});

		it('should merge nested assignments with existing data', () => {
			const fieldsConfig = {
				publicData: {
					publicDataValues: {
						mode: 'manual',
						fields: {
							assignments: [{ name: 'details.model', value: 'iPhone 15', type: 'string' }],
						},
					},
				},
			};

			const existingData = {
				publicData: {
					details: {
						brand: 'Apple',
						year: 2024,
					},
				},
			};

			manager
				.resource(LISTING_ID, 'listing', 0)
				.withExtendedDataUpdates(fieldsConfig, ['publicData'])
				.withOutput([], 'simplified', {});

			const { body } = manager.build('listings/update', existingData);

			expect(body.publicData).toEqual({
				details: {
					brand: 'Apple',
					year: 2024,
					model: 'iPhone 15',
				},
			});
		});

		it('should handle boolean assignments', () => {
			const fieldsConfig = {
				publicData: {
					publicDataValues: {
						mode: 'manual',
						fields: {
							assignments: [
								{ name: 'Featured', value: true, type: 'boolean' },
								{ name: 'Active', value: false, type: 'boolean' },
							],
						},
					},
				},
			};

			manager
				.resource(LISTING_ID, 'listing', 0)
				.withExtendedDataUpdates(fieldsConfig, ['publicData'])
				.withOutput([], 'simplified', {});

			const { body } = manager.build('listings/update', {});

			expect(body.publicData).toEqual({
				Featured: true,
				Active: false,
			});
		});

		it('should handle null assignments', () => {
			const fieldsConfig = {
				publicData: {
					publicDataValues: {
						mode: 'manual',
						fields: {
							assignments: [{ name: 'Category', value: null, type: 'null' }],
						},
					},
				},
			};

			manager
				.resource(LISTING_ID, 'listing', 0)
				.withExtendedDataUpdates(fieldsConfig, ['publicData'])
				.withOutput([], 'simplified', {});

			const { body } = manager.build('listings/update', {});

			expect(body.publicData).toEqual({
				Category: null,
			});
		});

		it('should handle array assignments', () => {
			const fieldsConfig = {
				publicData: {
					publicDataValues: {
						mode: 'manual',
						fields: {
							assignments: [
								{ name: 'Tags', value: ['electronics', 'phones'], type: 'array' },
							],
						},
					},
				},
			};

			manager
				.resource(LISTING_ID, 'listing', 0)
				.withExtendedDataUpdates(fieldsConfig, ['publicData'])
				.withOutput([], 'simplified', {});

			const { body } = manager.build('listings/update', {});

			expect(body.publicData).toEqual({
				Tags: ['electronics', 'phones'],
			});
		});
	});

	describe('extended data updates - JSON mode', () => {
		it('should apply JSON mode with object', () => {
			const fieldsConfig = {
				publicData: {
					publicDataValues: {
						mode: 'json',
						json: { category: 'electronics', price: 100 },
					},
				},
			};

			manager
				.resource(LISTING_ID, 'listing', 0)
				.withExtendedDataUpdates(fieldsConfig, ['publicData'])
				.withOutput([], 'simplified', {});

			const { body } = manager.build('listings/update', {});

			expect(body.publicData).toEqual({
				category: 'electronics',
				price: 100,
			});
		});

		it('should apply JSON mode with string', () => {
			const fieldsConfig = {
				publicData: {
					publicDataValues: {
						mode: 'json',
						json: '{"category":"electronics","price":100}',
					},
				},
			};

			manager
				.resource(LISTING_ID, 'listing', 0)
				.withExtendedDataUpdates(fieldsConfig, ['publicData'])
				.withOutput([], 'simplified', {});

			const { body } = manager.build('listings/update', {});

			expect(body.publicData).toEqual({
				category: 'electronics',
				price: 100,
			});
		});

		it('should throw error on invalid JSON string', () => {
			const fieldsConfig = {
				publicData: {
					publicDataValues: {
						mode: 'json',
						json: '{invalid json}',
					},
				},
			};

			manager
				.resource(LISTING_ID, 'listing', 0)
				.withExtendedDataUpdates(fieldsConfig, ['publicData']);

			expect(() => manager.build('listings/update', {})).toThrow('Invalid JSON:');
		});
	});

	describe('extended data deletions', () => {
		it('should handle top-level deletions', () => {
			const fieldDeletions = {
				deletions: [{ dataType: 'publicData', fieldPath: 'category' }],
			};

			manager
				.resource(LISTING_ID, 'listing', 0)
				.withExtendedDataDeletions(fieldDeletions)
				.withOutput([], 'simplified', {});

			const { body } = manager.build('listings/update', {});

			expect(body.publicData).toEqual({
				category: null,
			});
		});

		it('should handle nested deletions', () => {
			const fieldDeletions = {
				deletions: [{ dataType: 'publicData', fieldPath: 'details.model' }],
			};

			const existingData = {
				publicData: {
					details: {
						brand: 'Apple',
						model: 'iPhone',
					},
				},
			};

			manager
				.resource(LISTING_ID, 'listing', 0)
				.withExtendedDataDeletions(fieldDeletions)
				.withOutput([], 'simplified', {});

			const { body } = manager.build('listings/update', existingData);

			expect(body.publicData).toEqual({
				details: {
					brand: 'Apple',
				},
			});
		});

		it('should handle deletions with prefix stripping', () => {
			const fieldDeletions = {
				deletions: [{ dataType: 'publicData', fieldPath: 'publicData.category' }],
			};

			manager
				.resource(LISTING_ID, 'listing', 0)
				.withExtendedDataDeletions(fieldDeletions)
				.withOutput([], 'simplified', {});

			const { body } = manager.build('listings/update', {});

			expect(body.publicData).toEqual({
				category: null,
			});
		});

		it('should handle deletions with resource locator format', () => {
			const fieldDeletions = {
				deletions: [
					{
						dataType: 'publicData',
						fieldPath: { value: 'category' },
					},
				],
			};

			manager
				.resource(LISTING_ID, 'listing', 0)
				.withExtendedDataDeletions(fieldDeletions)
				.withOutput([], 'simplified', {});

			const { body } = manager.build('listings/update', {});

			expect(body.publicData).toEqual({
				category: null,
			});
		});

		it('should skip invalid deletions', () => {
			const fieldDeletions = {
				deletions: [
					{ dataType: 'publicData', fieldPath: null },
					{ dataType: 'publicData', fieldPath: '' },
				],
			};

			manager
				.resource(LISTING_ID, 'listing', 0)
				.withExtendedDataDeletions(fieldDeletions)
				.withOutput([], 'simplified', {});

			const { body } = manager.build('listings/update', {});

			expect(body.publicData).toBeUndefined();
		});
	});

	describe('getNestedDataTypes', () => {
		it('should return null when no nested operations', () => {
			const fieldsConfig = {
				publicData: {
					publicDataValues: {
						mode: 'manual',
						fields: {
							assignments: [{ name: 'Category', value: 'electronics', type: 'string' }],
						},
					},
				},
			};

			manager
				.resource(LISTING_ID, 'listing', 0)
				.withExtendedDataUpdates(fieldsConfig, ['publicData']);

			const nestedInfo = manager.getNestedDataTypes();

			expect(nestedInfo).toBeNull();
		});

		it('should return info when nested assignments exist', () => {
			const fieldsConfig = {
				publicData: {
					publicDataValues: {
						mode: 'manual',
						fields: {
							assignments: [
								{ name: 'details.brand', value: 'Apple', type: 'string' },
							],
						},
					},
				},
			};

			manager
				.resource(LISTING_ID, 'listing', 0)
				.withExtendedDataUpdates(fieldsConfig, ['publicData']);

			const nestedInfo = manager.getNestedDataTypes();

			expect(nestedInfo).toEqual({
				extendedDataTypes: ['publicData'],
				endpoint: 'listings/show',
				resourceKey: 'listing',
				fieldPrefix: '',
			});
		});

		it('should return info when nested deletions exist', () => {
			const fieldDeletions = {
				deletions: [{ dataType: 'publicData', fieldPath: 'details.model' }],
			};

			manager
				.resource(LISTING_ID, 'listing', 0)
				.withExtendedDataDeletions(fieldDeletions);

			const nestedInfo = manager.getNestedDataTypes();

			expect(nestedInfo).toEqual({
				extendedDataTypes: ['publicData'],
				endpoint: 'listings/show',
				resourceKey: 'listing',
				fieldPrefix: '',
			});
		});

		it('should combine unique types from updates and deletions', () => {
			const fieldsConfig = {
				publicData: {
					publicDataValues: {
						mode: 'manual',
						fields: {
							assignments: [
								{ name: 'details.brand', value: 'Apple', type: 'string' },
							],
						},
					},
				},
			};

			const fieldDeletions = {
				deletions: [{ dataType: 'privateData', fieldPath: 'secret.key' }],
			};

			manager
				.resource(LISTING_ID, 'listing', 0)
				.withExtendedDataUpdates(fieldsConfig, ['publicData'])
				.withExtendedDataDeletions(fieldDeletions);

			const nestedInfo = manager.getNestedDataTypes();

			expect(nestedInfo?.extendedDataTypes).toEqual(['publicData', 'privateData']);
		});

		it('should handle user resource with field prefix', () => {
			const fieldDeletions = {
				deletions: [{ dataType: 'publicData', fieldPath: 'details.avatar' }],
			};

			manager
				.resource(USER_ID, 'user', 0)
				.withExtendedDataDeletions(fieldDeletions);

			const nestedInfo = manager.getNestedDataTypes();

			expect(nestedInfo).toEqual({
				extendedDataTypes: ['publicData'],
				endpoint: 'users/show',
				resourceKey: 'user',
				fieldPrefix: 'profile',
			});
		});
	});

	describe('build output configuration', () => {
		it('should include output fields in query string', () => {
			manager
				.resource(LISTING_ID, 'listing', 0)
				.withOutput(['title', 'description', 'publicData'], 'selectedFields', {});

			const { qs } = manager.build('listings/update', {});

			expect(qs['fields.listing']).toEqual(['id', 'title', 'description', 'publicData']);
		});

		it('should handle user resource field prefix in output', () => {
			manager
				.resource(USER_ID, 'user', 0)
				.withOutput(['firstName', 'lastName', 'publicData'], 'selectedFields', {});

			const { qs } = manager.build('users/update_profile', {});

			expect(qs['fields.user']).toEqual([
				'id',
				'profile.firstName',
				'profile.lastName',
				'profile.publicData',
			]);
		});
	});

	describe('buildSpeculative', () => {
		it('should build speculative preview for listing', async () => {
			const mockRequest = jest.spyOn(sharetribe, 'request').mockResolvedValue({
				data: [
					{
						json: {
							id: LISTING_ID,
							title: 'Original Title',
							publicData: { Category: 'original' },
						},
					},
				],
			});

			const fieldsConfig = {
				publicData: {
					publicDataValues: {
						mode: 'manual',
						fields: {
							assignments: [
								{ name: 'Category', value: 'updated', type: 'string' },
							],
						},
					},
				},
			};

			manager
				.resource(LISTING_ID, 'listing', 0)
				.withCoreFields({ title: 'Updated Title' })
				.withExtendedDataUpdates(fieldsConfig, ['publicData'])
				.withOutput(['title', 'publicData'], 'selectedFields', {});

			const preview = await manager.buildSpeculative({});

			expect(preview).toEqual({
				id: LISTING_ID,
				title: 'Updated Title',
				publicData: { Category: 'updated' },
				_speculative: true,
			});

			expect(mockRequest).toHaveBeenCalledWith({
				method: 'GET',
				endpoint: 'listings/show',
				qs: {
					id: LISTING_ID,
					'fields.listing': ['title', 'publicData'],
				},
			});
		});

		it('should apply deletions in speculative preview', async () => {
			jest.spyOn(sharetribe, 'request').mockResolvedValue({
				data: [
					{
						json: {
							id: LISTING_ID,
							publicData: { category: 'electronics', featured: true },
						},
					},
				],
			});

			const fieldDeletions = {
				deletions: [{ dataType: 'publicData', fieldPath: 'featured' }],
			};

			manager
				.resource(LISTING_ID, 'listing', 0)
				.withExtendedDataDeletions(fieldDeletions)
				.withOutput(['publicData'], 'selectedFields', {});

			const preview = await manager.buildSpeculative({});

			expect(preview.publicData).toEqual({ category: 'electronics' });
		});

		it('should handle user resource field prefix in speculative', async () => {
			jest.spyOn(sharetribe, 'request').mockResolvedValue({
				data: [
					{
						json: {
							id: USER_ID,
							profile: {
								firstName: 'John',
								publicData: { Role: 'admin' },
							},
						},
					},
				],
			});

			const fieldsConfig = {
				publicData: {
					publicDataValues: {
						mode: 'manual',
						fields: {
							assignments: [{ name: 'Role', value: 'editor', type: 'string' }],
						},
					},
				},
			};

			manager
				.resource(USER_ID, 'user', 0)
				.withExtendedDataUpdates(fieldsConfig, ['publicData'])
				.withOutput(['firstName', 'publicData'], 'selectedFields', {});

			const preview = await manager.buildSpeculative({});

			expect(preview.profile).toEqual({
				firstName: 'John',
				publicData: { Role: 'editor' },
			});
		});
	});

	describe('complex scenarios', () => {
		it('should handle updates, deletions, and core fields together', () => {
			const fieldsConfig = {
				publicData: {
					publicDataValues: {
						mode: 'manual',
						fields: {
							assignments: [
								{ name: 'Category', value: 'electronics', type: 'string' },
							],
						},
					},
				},
			};

			const fieldDeletions = {
				deletions: [{ dataType: 'privateData', fieldPath: 'oldSecret' }],
			};

			manager
				.resource(LISTING_ID, 'listing', 0)
				.withCoreFields({ title: 'New Title' })
				.withExtendedDataUpdates(fieldsConfig, ['publicData'])
				.withExtendedDataDeletions(fieldDeletions)
				.withOutput([], 'simplified', {});

			const { body } = manager.build('listings/update', {});

			expect(body.id).toBe(LISTING_ID);
			expect(body.title).toBe('New Title');
			expect(body.publicData).toEqual({ Category: 'electronics' });
			expect(body.privateData).toEqual({ oldSecret: null });
		});

		it('should handle multiple extended data types', () => {
			const fieldsConfig = {
				publicData: {
					publicDataValues: {
						mode: 'manual',
						fields: {
							assignments: [
								{ name: 'Category', value: 'electronics', type: 'string' },
							],
						},
					},
				},
				privateData: {
					privateDataValues: {
						mode: 'json',
						json: { secret: 'value' },
					},
				},
			};

			manager
				.resource(LISTING_ID, 'listing', 0)
				.withExtendedDataUpdates(fieldsConfig, ['publicData', 'privateData'])
				.withOutput([], 'simplified', {});

			const { body } = manager.build('listings/update', {});

			expect(body.publicData).toEqual({ Category: 'electronics' });
			expect(body.privateData).toEqual({ secret: 'value' });
		});
	});

	describe('dotNotation toggle', () => {
		it('should treat dotted field names as literal keys when dotNotation is false', () => {
			const fieldsConfig = {
				publicData: {
					publicDataValues: {
						mode: 'manual',
						dotNotation: false,
						fields: {
							assignments: [
								{ name: 'details.brand', value: 'Apple', type: 'string' },
								{ name: 'details.model', value: 'iPhone', type: 'string' },
							],
						},
					},
				},
			};

			manager
				.resource(LISTING_ID, 'listing', 0)
				.withExtendedDataUpdates(fieldsConfig, ['publicData'])
				.withOutput([], 'simplified', {});

			const { body } = manager.build('listings/update', {});

			expect(body.publicData).toEqual({
				'details.brand': 'Apple',
				'details.model': 'iPhone',
			});
		});

		it('should create nested objects when dotNotation is true', () => {
			const fieldsConfig = {
				publicData: {
					publicDataValues: {
						mode: 'manual',
						dotNotation: true,
						fields: {
							assignments: [
								{ name: 'details.brand', value: 'Apple', type: 'string' },
							],
						},
					},
				},
			};

			manager
				.resource(LISTING_ID, 'listing', 0)
				.withExtendedDataUpdates(fieldsConfig, ['publicData'])
				.withOutput([], 'simplified', {});

			const { body } = manager.build('listings/update', {});

			expect(body.publicData).toEqual({
				details: {
					brand: 'Apple',
				},
			});
		});

		it('should treat dotNotation undefined as enabled (backwards compat)', () => {
			const fieldsConfig = {
				publicData: {
					publicDataValues: {
						mode: 'manual',
						// dotNotation not set — existing workflows
						fields: {
							assignments: [
								{ name: 'details.brand', value: 'Apple', type: 'string' },
							],
						},
					},
				},
			};

			manager
				.resource(LISTING_ID, 'listing', 0)
				.withExtendedDataUpdates(fieldsConfig, ['publicData'])
				.withOutput([], 'simplified', {});

			const { body } = manager.build('listings/update', {});

			expect(body.publicData).toEqual({
				details: {
					brand: 'Apple',
				},
			});
		});

		it('should not detect nested assignments when dotNotation is false', () => {
			const fieldsConfig = {
				publicData: {
					publicDataValues: {
						mode: 'manual',
						dotNotation: false,
						fields: {
							assignments: [
								{ name: 'details.brand', value: 'Apple', type: 'string' },
							],
						},
					},
				},
			};

			manager
				.resource(LISTING_ID, 'listing', 0)
				.withExtendedDataUpdates(fieldsConfig, ['publicData'])
				.withOutput([], 'simplified', {});

			// getNestedDataTypes should return null because dotNotation is false
			const nestedInfo = manager.getNestedDataTypes();
			expect(nestedInfo).toBeNull();
		});

		it('should detect nested assignments when dotNotation is true or undefined', () => {
			const fieldsConfig = {
				publicData: {
					publicDataValues: {
						mode: 'manual',
						dotNotation: true,
						fields: {
							assignments: [
								{ name: 'details.brand', value: 'Apple', type: 'string' },
							],
						},
					},
				},
			};

			manager
				.resource(LISTING_ID, 'listing', 0)
				.withExtendedDataUpdates(fieldsConfig, ['publicData'])
				.withOutput([], 'simplified', {});

			const nestedInfo = manager.getNestedDataTypes();
			expect(nestedInfo).not.toBeNull();
			expect(nestedInfo!.extendedDataTypes).toContain('publicData');
		});
	});
});
