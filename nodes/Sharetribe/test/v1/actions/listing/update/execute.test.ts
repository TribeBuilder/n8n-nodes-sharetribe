import * as executeModule from '../../../../../v1/actions/listing/update/execute';
import * as SharetribeHelpers from '../../../../../v1/helpers/Sharetribe';
import { createMockExecuteFunction, mockSharetribeRequest } from '../../../../helpers';

const LISTING_ID = '660e8400-e29b-41d6-a716-446655440000';

describe('listing/update', () => {
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
			listingId: LISTING_ID,
			listingFields: {},
			simplify: true,
			options: {},
		});

		sharetribeMock.mockRequest.mockResolvedValue({
			data: [{ json: { id: LISTING_ID } }],
		});

		await executeModule.execute.call(mockExecuteFunction);

		const options = sharetribeMock.getLastRequestOptions();
		expect(options.endpoint).toContain('listings/update');
	});

	it('should send core listing fields in body', async () => {
		const mockExecuteFunction = createMockExecuteFunction({
			listingId: LISTING_ID,
			simplify: true,
			options: {},
			listingFields: {
				title: 'Updated Listing',
				description: 'Updated description',
			},
		});

		sharetribeMock.mockRequest.mockResolvedValue({
			data: [{ json: { id: LISTING_ID } }],
		});

		await executeModule.execute.call(mockExecuteFunction);

		const options = sharetribeMock.getLastRequestOptions();
		expect(options.body.title).toBe('Updated Listing');
		expect(options.body.description).toBe('Updated description');
	});

	it('should send top-level extended data updates', async () => {
		const mockExecuteFunction = createMockExecuteFunction({
			listingId: LISTING_ID,
			simplify: true,
			options: {},
			listingFields: {
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
			},
		});

		sharetribeMock.mockRequest.mockResolvedValue({
			data: [{ json: { id: LISTING_ID } }],
		});

		await executeModule.execute.call(mockExecuteFunction);

		const options = sharetribeMock.getLastRequestOptions();
		expect(options.body.publicData).toEqual({ Category: 'electronics' });
	});

	it('should fetch existing data for nested assignments', async () => {
		const mockExecuteFunction = createMockExecuteFunction({
			listingId: LISTING_ID,
			simplify: true,
			options: {},
			listingFields: {
				publicData: {
					publicDataValues: {
						mode: 'manual',
						fields: {
							assignments: [
								{ name: 'details.model', value: 'iPhone 15', type: 'string' },
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
						id: LISTING_ID,
						publicData: {
							details: { brand: 'Apple', model: 'iPhone 14' },
						},
					},
				}],
			})
			.mockResolvedValueOnce({
				data: [{ json: { id: LISTING_ID } }],
			});

		await executeModule.execute.call(mockExecuteFunction);

		const fetchCall = sharetribeMock.mockRequest.mock.calls[0][0];
		expect(fetchCall.method).toBe('GET');
		expect(fetchCall.endpoint).toContain('listings/show');
		expect(fetchCall.qs['fields.listing']).toEqual(['publicData']);

		const updateCall = sharetribeMock.mockRequest.mock.calls[1][0];
		expect(updateCall.body.publicData).toEqual({
			details: { brand: 'Apple', model: 'iPhone 15' },
		});
	});

	it('should not fetch when only top-level operations', async () => {
		const mockExecuteFunction = createMockExecuteFunction({
			listingId: LISTING_ID,
			simplify: true,
			options: {},
			listingFields: {
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
			},
		});

		sharetribeMock.mockRequest.mockResolvedValue({
			data: [{ json: { id: LISTING_ID } }],
		});

		await executeModule.execute.call(mockExecuteFunction);

		expect(sharetribeMock.mockRequest).toHaveBeenCalledTimes(1);
		expect(sharetribeMock.mockRequest.mock.calls[0][0].method).toBe('POST');
	});

	it('should handle speculative mode', async () => {
		const mockExecuteFunction = createMockExecuteFunction({
			listingId: LISTING_ID,
			simplify: false,
			speculative: true,
			options: {
				outputFields: {
					fieldsToReturn: ['title', 'publicData'],
				},
			},
			listingFields: {
				title: 'Updated',
			},
		});

		sharetribeMock.mockRequest.mockResolvedValue({
			data: [{
				json: {
					id: LISTING_ID,
					title: 'Original',
					publicData: { category: 'test' },
				},
			}],
		});

		const result = await executeModule.execute.call(mockExecuteFunction);

		expect(sharetribeMock.mockRequest).toHaveBeenCalledTimes(1);
		expect(sharetribeMock.mockRequest.mock.calls[0][0].method).toBe('GET');

		const output = result[0][0].json;
		expect(output._speculative).toBe(true);
	});

	it('should handle JSON mode extended data', async () => {
		const mockExecuteFunction = createMockExecuteFunction({
			listingId: LISTING_ID,
			simplify: true,
			options: {},
			listingFields: {
				publicData: {
					publicDataValues: {
						mode: 'json',
						json: { category: 'electronics', price: 100 },
					},
				},
			},
		});

		sharetribeMock.mockRequest.mockResolvedValue({
			data: [{ json: { id: LISTING_ID } }],
		});

		await executeModule.execute.call(mockExecuteFunction);

		const options = sharetribeMock.getLastRequestOptions();
		expect(options.body.publicData).toEqual({ category: 'electronics', price: 100 });
	});

	it('should handle continue on fail', async () => {
		const mockExecuteFunction = createMockExecuteFunction({
			listingId: 'invalid-id',
			simplify: true,
			options: {},
			listingFields: {},
		});

		(mockExecuteFunction.continueOnFail as jest.Mock).mockReturnValue(true);

		const result = await executeModule.execute.call(mockExecuteFunction);

		expect(result[0][0].json).toHaveProperty('error');
	});

	it('should handle top-level deletions', async () => {
		const mockExecuteFunction = createMockExecuteFunction({
			listingId: LISTING_ID,
			simplify: true,
			options: {},
			listingFields: {},
			fieldDeletions: {
				deletions: [
					{ dataType: 'publicData', fieldPath: 'category' },
				],
			},
		});

		sharetribeMock.mockRequest.mockResolvedValue({
			data: [{ json: { id: LISTING_ID } }],
		});

		await executeModule.execute.call(mockExecuteFunction);

		const options = sharetribeMock.getLastRequestOptions();
		expect(options.body.publicData).toEqual({ category: null });
	});
});
