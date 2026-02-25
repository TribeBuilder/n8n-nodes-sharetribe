import * as executeModule from '../../../../../v1/actions/stock/getReservation/execute';
import * as SharetribeHelpers from '../../../../../v1/helpers/Sharetribe';
import { createMockExecuteFunction, mockSharetribeRequest } from '../../../../helpers';

describe('stock/getReservation', () => {
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
			stockReservationId: '550e8400-e29b-41d6-a716-446655440000',
			returnAll: false,
			limit: 50,
			simplify: true,
			options: {},
			filterOptions: {},
			
		});

		sharetribeMock.mockQuery.mockResolvedValue({
			data: [{ json: { id: 'test' } }],
		});

		await executeModule.execute.call(mockExecuteFunction);

		const call = sharetribeMock.getLastQueryCall();
		expect(call.endpoint).toContain('stock_reservations/show');
		expect(call.qs).toBeDefined();
	});
});
