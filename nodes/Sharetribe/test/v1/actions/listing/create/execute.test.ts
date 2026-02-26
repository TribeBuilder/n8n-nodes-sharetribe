import * as executeModule from '../../../../../v1/actions/listing/create/execute';
import * as SharetribeHelpers from '../../../../../v1/helpers/Sharetribe';
import { createMockExecuteFunction, mockSharetribeRequest } from '../../../../helpers';

describe('listing/create', () => {
	let sharetribeMock: ReturnType<typeof mockSharetribeRequest>;

	beforeEach(() => {
		sharetribeMock = mockSharetribeRequest();
		jest.spyOn(SharetribeHelpers, 'Sharetribe').mockImplementation(sharetribeMock.SharetribeMock);
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	it('should call correct endpoint with POST method', async () => {
		const mockExecuteFunction = createMockExecuteFunction({
			title: 'Test Listing',
			authorId: '550e8400-e29b-41d6-a716-446655440000',
			state: 'published',
			listingFields: {},
			simplify: true,
			options: {},
		});

		sharetribeMock.mockRequest.mockResolvedValue({
			data: [{ json: { id: 'test-listing-id' } }],
		});

		await executeModule.execute.call(mockExecuteFunction);

		const options = sharetribeMock.getLastRequestOptions();
		expect(options.endpoint).toContain('listings/create');
		expect(options.method).toBe('POST');
	});

	it('should include title and authorId in request body', async () => {
		const mockExecuteFunction = createMockExecuteFunction({
			title: 'New Product Listing',
			authorId: '550e8400-e29b-41d6-a716-446655440000',
			state: 'published',
			listingFields: {},
			simplify: true,
			options: {},
		});

		sharetribeMock.mockRequest.mockResolvedValue({
			data: [{ json: { id: 'test' } }],
		});

		await executeModule.execute.call(mockExecuteFunction);

		const options = sharetribeMock.getLastRequestOptions();
		expect(options.body).toMatchObject({
			title: 'New Product Listing',
			authorId: '550e8400-e29b-41d6-a716-446655440000',
		});
	});

	it('should not include resource ID in query params for create operation', async () => {
		const mockExecuteFunction = createMockExecuteFunction({
			title: 'Test Listing',
			authorId: '550e8400-e29b-41d6-a716-446655440000',
			state: 'published',
			listingFields: {},
			simplify: true,
			options: {},
		});

		sharetribeMock.mockRequest.mockResolvedValue({
			data: [{ json: { id: 'test' } }],
		});

		await executeModule.execute.call(mockExecuteFunction);

		const options = sharetribeMock.getLastRequestOptions();
		// CREATE operations should not have an 'id' in query params
		expect(options.qs?.id).toBeUndefined();
	});
});
