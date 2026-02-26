import * as executeModule from '../../../../../v1/actions/transaction/updateMetadata/execute';
import * as SharetribeHelpers from '../../../../../v1/helpers/Sharetribe';
import { createMockExecuteFunction, mockSharetribeRequest } from '../../../../helpers';

const TRANSACTION_ID = '770e8400-e29b-41d6-a716-446655440000';

describe('transaction/updateMetadata', () => {
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
			transactionId: TRANSACTION_ID,
			simplify: true,
			options: {},
			transactionFields: {},
		});

		sharetribeMock.mockRequest.mockResolvedValue({
			data: [{ json: { id: TRANSACTION_ID } }],
		});

		await executeModule.execute.call(mockExecuteFunction);

		const options = sharetribeMock.getLastRequestOptions();
		expect(options.endpoint).toContain('transactions/update_metadata');
	});

	it('should send top-level metadata updates', async () => {
		const mockExecuteFunction = createMockExecuteFunction({
			transactionId: TRANSACTION_ID,
			simplify: true,
			options: {},
			transactionFields: {
				metadata: {
					metadataValues: {
						mode: 'manual',
						fields: {
							assignments: [
								{ name: 'Status', value: 'reviewed', type: 'string' },
							],
						},
					},
				},
			},
		});

		sharetribeMock.mockRequest.mockResolvedValue({
			data: [{ json: { id: TRANSACTION_ID } }],
		});

		await executeModule.execute.call(mockExecuteFunction);

		const options = sharetribeMock.getLastRequestOptions();
		expect(options.body.metadata).toEqual({ Status: 'reviewed' });
	});

	it('should fetch existing data for nested assignments', async () => {
		const mockExecuteFunction = createMockExecuteFunction({
			transactionId: TRANSACTION_ID,
			simplify: true,
			options: {},
			transactionFields: {
				metadata: {
					metadataValues: {
						mode: 'manual',
						fields: {
							assignments: [
								{ name: 'review.rating', value: 5, type: 'number' },
							],
						},
					},
				},
			},
		});

		sharetribeMock.mockRequest
			.mockResolvedValueOnce({
				data: [{
					json: {
						id: TRANSACTION_ID,
						metadata: {
							review: { comment: 'Great!', rating: 4 },
						},
					},
				}],
			})
			.mockResolvedValueOnce({
				data: [{ json: { id: TRANSACTION_ID } }],
			});

		await executeModule.execute.call(mockExecuteFunction);

		const fetchCall = sharetribeMock.mockRequest.mock.calls[0][0];
		expect(fetchCall.method).toBe('GET');
		expect(fetchCall.endpoint).toContain('transactions/show');
		expect(fetchCall.qs['fields.transaction']).toEqual(['metadata']);

		const updateCall = sharetribeMock.mockRequest.mock.calls[1][0];
		expect(updateCall.body.metadata).toEqual({
			review: { comment: 'Great!', rating: 5 },
		});
	});

	it('should not fetch when only top-level operations', async () => {
		const mockExecuteFunction = createMockExecuteFunction({
			transactionId: TRANSACTION_ID,
			simplify: true,
			options: {},
			transactionFields: {
				metadata: {
					metadataValues: {
						mode: 'manual',
						fields: {
							assignments: [
								{ name: 'Status', value: 'done', type: 'string' },
							],
						},
					},
				},
			},
		});

		sharetribeMock.mockRequest.mockResolvedValue({
			data: [{ json: { id: TRANSACTION_ID } }],
		});

		await executeModule.execute.call(mockExecuteFunction);

		expect(sharetribeMock.mockRequest).toHaveBeenCalledTimes(1);
		expect(sharetribeMock.mockRequest.mock.calls[0][0].method).toBe('POST');
	});

	it('should handle speculative mode', async () => {
		const mockExecuteFunction = createMockExecuteFunction({
			transactionId: TRANSACTION_ID,
			simplify: false,
			speculative: true,
			options: {
				outputFields: {
					transactionFields: ['metadata'],
				},
			},
			transactionFields: {
				metadata: {
					metadataValues: {
						mode: 'manual',
						fields: {
							assignments: [
								{ name: 'Status', value: 'reviewed', type: 'string' },
							],
						},
					},
				},
			},
		});

		sharetribeMock.mockRequest.mockResolvedValue({
			data: [{
				json: {
					id: TRANSACTION_ID,
					metadata: { status: 'pending' },
				},
			}],
		});

		const result = await executeModule.execute.call(mockExecuteFunction);

		expect(sharetribeMock.mockRequest).toHaveBeenCalledTimes(1);
		expect(sharetribeMock.mockRequest.mock.calls[0][0].method).toBe('GET');

		const output = result[0][0].json;
		expect(output._speculative).toBe(true);
	});

	it('should handle JSON mode metadata', async () => {
		const mockExecuteFunction = createMockExecuteFunction({
			transactionId: TRANSACTION_ID,
			simplify: true,
			options: {},
			transactionFields: {
				metadata: {
					metadataValues: {
						mode: 'json',
						json: { status: 'reviewed', notes: 'Looks good' },
					},
				},
			},
		});

		sharetribeMock.mockRequest.mockResolvedValue({
			data: [{ json: { id: TRANSACTION_ID } }],
		});

		await executeModule.execute.call(mockExecuteFunction);

		const options = sharetribeMock.getLastRequestOptions();
		expect(options.body.metadata).toEqual({
			status: 'reviewed',
			notes: 'Looks good',
		});
	});

	it('should handle continue on fail', async () => {
		const mockExecuteFunction = createMockExecuteFunction({
			transactionId: 'invalid-id',
			simplify: true,
			options: {},
			transactionFields: {},
		});

		(mockExecuteFunction.continueOnFail as jest.Mock).mockReturnValue(true);

		const result = await executeModule.execute.call(mockExecuteFunction);

		expect(result[0][0].json).toHaveProperty('error');
	});

	it('should handle top-level deletions', async () => {
		const mockExecuteFunction = createMockExecuteFunction({
			transactionId: TRANSACTION_ID,
			simplify: true,
			options: {},
			transactionFields: {},
			fieldDeletions: {
				deletions: [
					{ dataType: 'metadata', fieldPath: 'oldField' },
				],
			},
		});

		sharetribeMock.mockRequest.mockResolvedValue({
			data: [{ json: { id: TRANSACTION_ID } }],
		});

		await executeModule.execute.call(mockExecuteFunction);

		const options = sharetribeMock.getLastRequestOptions();
		expect(options.body.metadata).toEqual({ oldField: null });
	});

	it('should handle protectedData updates', async () => {
		const mockExecuteFunction = createMockExecuteFunction({
			transactionId: TRANSACTION_ID,
			simplify: true,
			options: {},
			transactionFields: {
				protectedData: {
					protectedDataValues: {
						mode: 'json',
						json: { internalNotes: 'VIP customer' },
					},
				},
			},
		});

		sharetribeMock.mockRequest.mockResolvedValue({
			data: [{ json: { id: TRANSACTION_ID } }],
		});

		await executeModule.execute.call(mockExecuteFunction);

		const options = sharetribeMock.getLastRequestOptions();
		expect(options.body.protectedData).toEqual({ internalNotes: 'VIP customer' });
	});
});
