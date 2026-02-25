import * as executeModule from '../../../../../v1/actions/user/update/execute';
import * as SharetribeHelpers from '../../../../../v1/helpers/Sharetribe';
import { createMockExecuteFunction, mockSharetribeRequest } from '../../../../helpers';

const USER_ID = '550e8400-e29b-41d6-a716-446655440000';

describe('user/update', () => {
	let sharetribeMock: ReturnType<typeof mockSharetribeRequest>;

	beforeEach(() => {
		sharetribeMock = mockSharetribeRequest();
		jest.spyOn(SharetribeHelpers, 'Sharetribe').mockImplementation(sharetribeMock.SharetribeMock);
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	it('should call correct endpoint', async () => {
		const mockExecuteFunction = createMockExecuteFunction({
			userId: USER_ID,
			simplify: true,
			options: {},
			profileFields: {
				firstName: 'Test',
			},
		});

		sharetribeMock.mockRequest.mockResolvedValue({
			data: [{ json: { id: USER_ID } }],
		});

		await executeModule.execute.call(mockExecuteFunction);

		const options = sharetribeMock.getLastRequestOptions();
		expect(options.endpoint).toContain('users/update_profile');
	});

	it('should send core profile fields in body', async () => {
		const mockExecuteFunction = createMockExecuteFunction({
			userId: USER_ID,
			simplify: true,
			options: {},
			profileFields: {
				firstName: 'John',
				lastName: 'Doe',
				displayName: 'John Doe',
			},
		});

		sharetribeMock.mockRequest.mockResolvedValue({
			data: [{ json: { id: USER_ID } }],
		});

		await executeModule.execute.call(mockExecuteFunction);

		const options = sharetribeMock.getLastRequestOptions();
		expect(options.body.firstName).toBe('John');
		expect(options.body.lastName).toBe('Doe');
		expect(options.body.displayName).toBe('John Doe');
	});

	it('should send top-level extended data updates', async () => {
		const mockExecuteFunction = createMockExecuteFunction({
			userId: USER_ID,
			simplify: true,
			options: {},
			profileFields: {
				publicData: {
					publicDataValues: {
						mode: 'manual',
						fields: {
							assignments: [
								{ name: 'Role', value: 'admin', type: 'string' },
							],
						},
					},
				},
			},
		});

		sharetribeMock.mockRequest.mockResolvedValue({
			data: [{ json: { id: USER_ID } }],
		});

		await executeModule.execute.call(mockExecuteFunction);

		const options = sharetribeMock.getLastRequestOptions();
		expect(options.body.publicData).toEqual({ Role: 'admin' });
	});

	it('should fetch existing data for nested assignments', async () => {
		const mockExecuteFunction = createMockExecuteFunction({
			userId: USER_ID,
			simplify: true,
			options: {},
			profileFields: {
				publicData: {
					publicDataValues: {
						mode: 'manual',
						fields: {
							assignments: [
								{ name: 'settings.theme', value: 'dark', type: 'string' },
							],
						},
					},
				},
			},
		});

		// First call: GET to fetch existing data
		sharetribeMock.mockRequest
			.mockResolvedValueOnce({
				data: [{
					json: {
						id: USER_ID,
						profile: {
							publicData: {
								settings: { language: 'en', theme: 'light' },
							},
						},
					},
				}],
			})
			// Second call: POST to update
			.mockResolvedValueOnce({
				data: [{ json: { id: USER_ID } }],
			});

		await executeModule.execute.call(mockExecuteFunction);

		// First call should be GET for existing data
		const fetchCall = sharetribeMock.mockRequest.mock.calls[0][0];
		expect(fetchCall.method).toBe('GET');
		expect(fetchCall.endpoint).toContain('users/show');
		expect(fetchCall.qs['fields.user']).toEqual(['profile.publicData']);

		// Second call should be POST with merged data
		const updateCall = sharetribeMock.mockRequest.mock.calls[1][0];
		expect(updateCall.method).toBe('POST');
		expect(updateCall.body.publicData).toEqual({
			settings: { language: 'en', theme: 'dark' },
		});
	});

	it('should fetch existing data for nested deletions', async () => {
		const mockExecuteFunction = createMockExecuteFunction({
			userId: USER_ID,
			simplify: true,
			options: {},
			profileFields: {},
			fieldDeletions: {
				deletions: [
					{ dataType: 'publicData', fieldPath: 'settings.theme' },
				],
			},
		});

		sharetribeMock.mockRequest
			.mockResolvedValueOnce({
				data: [{
					json: {
						id: USER_ID,
						profile: {
							publicData: {
								settings: { language: 'en', theme: 'light' },
							},
						},
					},
				}],
			})
			.mockResolvedValueOnce({
				data: [{ json: { id: USER_ID } }],
			});

		await executeModule.execute.call(mockExecuteFunction);

		const updateCall = sharetribeMock.mockRequest.mock.calls[1][0];
		expect(updateCall.body.publicData).toEqual({
			settings: { language: 'en' },
		});
	});

	it('should not fetch when only top-level operations', async () => {
		const mockExecuteFunction = createMockExecuteFunction({
			userId: USER_ID,
			simplify: true,
			options: {},
			profileFields: {
				publicData: {
					publicDataValues: {
						mode: 'manual',
						fields: {
							assignments: [
								{ name: 'Role', value: 'admin', type: 'string' },
							],
						},
					},
				},
			},
		});

		sharetribeMock.mockRequest.mockResolvedValue({
			data: [{ json: { id: USER_ID } }],
		});

		await executeModule.execute.call(mockExecuteFunction);

		// Only one call (the update), no prefetch needed
		expect(sharetribeMock.mockRequest).toHaveBeenCalledTimes(1);
		expect(sharetribeMock.mockRequest.mock.calls[0][0].method).toBe('POST');
	});

	it('should handle speculative mode', async () => {
		const mockExecuteFunction = createMockExecuteFunction({
			userId: USER_ID,
			simplify: false,
			speculative: true,
			options: {
				outputFields: {
					userFields: ['firstName', 'publicData'],
				},
			},
			profileFields: {
				firstName: 'Updated',
			},
		});

		sharetribeMock.mockRequest.mockResolvedValue({
			data: [{
				json: {
					id: USER_ID,
					profile: {
						firstName: 'Original',
						publicData: { role: 'user' },
					},
				},
			}],
		});

		const result = await executeModule.execute.call(mockExecuteFunction);

		// Should only make GET request (no POST)
		expect(sharetribeMock.mockRequest).toHaveBeenCalledTimes(1);
		expect(sharetribeMock.mockRequest.mock.calls[0][0].method).toBe('GET');

		// Result should be speculative preview
		const output = result[0][0].json;
		expect(output._speculative).toBe(true);
	});

	it('should map user metadata to profile.metadata in sparse fields', async () => {
		const mockExecuteFunction = createMockExecuteFunction({
			userId: USER_ID,
			simplify: false,
			options: {
				outputFields: {
					userFields: ['firstName', 'lastName', 'metadata'],
				},
			},
			profileFields: {
				firstName: 'Test',
			},
		});

		sharetribeMock.mockRequest.mockResolvedValue({
			data: [{ json: { id: 'test' } }],
		});

		await executeModule.execute.call(mockExecuteFunction);

		const options = sharetribeMock.getLastRequestOptions();
		expect(options.qs['fields.user']).toContain('profile.metadata');
		expect(options.qs['fields.user']).not.toContain('metadata');
	});

	it('should handle continue on fail', async () => {
		const mockExecuteFunction = createMockExecuteFunction({
			userId: 'invalid-id',
			simplify: true,
			options: {},
			profileFields: {},
		});

		(mockExecuteFunction.continueOnFail as jest.Mock).mockReturnValue(true);

		const result = await executeModule.execute.call(mockExecuteFunction);

		expect(result[0][0].json).toHaveProperty('error');
	});

	it('should handle JSON mode extended data', async () => {
		const mockExecuteFunction = createMockExecuteFunction({
			userId: USER_ID,
			simplify: true,
			options: {},
			profileFields: {
				publicData: {
					publicDataValues: {
						mode: 'json',
						json: { role: 'editor', permissions: ['read', 'write'] },
					},
				},
			},
		});

		sharetribeMock.mockRequest.mockResolvedValue({
			data: [{ json: { id: USER_ID } }],
		});

		await executeModule.execute.call(mockExecuteFunction);

		const options = sharetribeMock.getLastRequestOptions();
		expect(options.body.publicData).toEqual({
			role: 'editor',
			permissions: ['read', 'write'],
		});
	});

	it('should handle multiple extended data types', async () => {
		const mockExecuteFunction = createMockExecuteFunction({
			userId: USER_ID,
			simplify: true,
			options: {},
			profileFields: {
				publicData: {
					publicDataValues: {
						mode: 'manual',
						fields: {
							assignments: [
								{ name: 'Role', value: 'admin', type: 'string' },
							],
						},
					},
				},
				privateData: {
					privateDataValues: {
						mode: 'json',
						json: { ssn: '123-45-6789' },
					},
				},
			},
		});

		sharetribeMock.mockRequest.mockResolvedValue({
			data: [{ json: { id: USER_ID } }],
		});

		await executeModule.execute.call(mockExecuteFunction);

		const options = sharetribeMock.getLastRequestOptions();
		expect(options.body.publicData).toEqual({ Role: 'admin' });
		expect(options.body.privateData).toEqual({ ssn: '123-45-6789' });
	});
});
