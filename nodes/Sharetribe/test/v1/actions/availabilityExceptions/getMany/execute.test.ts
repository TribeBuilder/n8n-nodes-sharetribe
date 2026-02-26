import * as executeModule from '../../../../../v1/actions/availabilityExceptions/getMany/execute';
import * as SharetribeHelpers from '../../../../../v1/helpers/Sharetribe';
import { createMockExecuteFunction, mockSharetribeRequest } from '../../../../helpers';
import { DateTime } from 'luxon';

describe('availabilityExceptions/getMany', () => {
	let sharetribeMock: ReturnType<typeof mockSharetribeRequest>;

	beforeEach(() => {
		sharetribeMock = mockSharetribeRequest();
		jest.spyOn(SharetribeHelpers, 'Sharetribe').mockImplementation(sharetribeMock.SharetribeMock);
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	it('should call correct endpoint with query params', async () => {
		const now = DateTime.now();
		const mockExecuteFunction = createMockExecuteFunction({
			listingId: '550e8400-e29b-41d6-a716-446655440000',
			start: now,
			end: now.plus({ days: 7 }),
			returnAll: false,
			limit: 50,
			simplify: true,
			options: {},
		});

		sharetribeMock.mockQuery.mockResolvedValue({
			data: [{ json: { id: 'test' } }],
		});

		await executeModule.execute.call(mockExecuteFunction);

		const call = sharetribeMock.getLastQueryCall();
		expect(call.endpoint).toBe('availability_exceptions/query');
		expect(call.qs).toBeDefined();
	});
});
