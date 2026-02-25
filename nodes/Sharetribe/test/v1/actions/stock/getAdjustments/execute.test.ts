import * as executeModule from '../../../../../v1/actions/stock/getAdjustments/execute';
import * as SharetribeHelpers from '../../../../../v1/helpers/Sharetribe';
import { createMockExecuteFunction, mockSharetribeRequest } from '../../../../helpers';
import { DateTime } from 'luxon';

describe('stock/getAdjustments', () => {
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
			listingId: '550e8400-e29b-41d6-a716-446655440000',
			createdAtStart: DateTime.fromISO('2024-01-01T00:00:00.000Z'),
			createdAtEnd: DateTime.fromISO('2024-12-31T23:59:59.999Z'),
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
		expect(call.endpoint).toBe('stock_adjustments/query');
		expect(call.qs).toBeDefined();
	});
});
