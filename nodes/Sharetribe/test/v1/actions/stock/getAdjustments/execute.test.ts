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

	describe('item linking', () => {
		it('should make one query per input item', async () => {
			const mockExecuteFunction = createMockExecuteFunction({
				listingId: '550e8400-e29b-41d6-a716-446655440000',
				createdAtStart: DateTime.fromISO('2024-01-01T00:00:00.000Z'),
				createdAtEnd: DateTime.fromISO('2024-12-31T23:59:59.999Z'),
				returnAll: false,
				limit: 50,
				simplify: true,
				options: {},
			});
			(mockExecuteFunction.getInputData as jest.Mock).mockReturnValue([{ json: {} }, { json: {} }]);

			sharetribeMock.mockQuery.mockResolvedValue({
				data: [{ json: { id: 'adjustment' } }],
			});

			const result = await executeModule.execute.call(mockExecuteFunction);

			expect(sharetribeMock.mockQuery).toHaveBeenCalledTimes(2);
			expect(result[0]).toHaveLength(2);
		});

		it('should set pairedItem correctly for each input item', async () => {
			const mockExecuteFunction = createMockExecuteFunction({
				listingId: '550e8400-e29b-41d6-a716-446655440000',
				createdAtStart: DateTime.fromISO('2024-01-01T00:00:00.000Z'),
				createdAtEnd: DateTime.fromISO('2024-12-31T23:59:59.999Z'),
				returnAll: false,
				limit: 50,
				simplify: true,
				options: {},
			});
			(mockExecuteFunction.getInputData as jest.Mock).mockReturnValue([{ json: {} }, { json: {} }]);

			sharetribeMock.mockQuery
				.mockResolvedValueOnce({ data: [{ json: { id: 'adj-1' } }] })
				.mockResolvedValueOnce({ data: [{ json: { id: 'adj-2' } }] });

			const result = await executeModule.execute.call(mockExecuteFunction);

			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			expect((result[0][0] as any).pairedItem).toEqual({ item: 0 });
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			expect((result[0][1] as any).pairedItem).toEqual({ item: 1 });
		});

		it('should handle continueOnFail per item', async () => {
			const mockExecuteFunction = createMockExecuteFunction({
				listingId: '550e8400-e29b-41d6-a716-446655440000',
				createdAtStart: DateTime.fromISO('2024-01-01T00:00:00.000Z'),
				createdAtEnd: DateTime.fromISO('2024-12-31T23:59:59.999Z'),
				returnAll: false,
				limit: 50,
				simplify: true,
				options: {},
			});
			(mockExecuteFunction.getInputData as jest.Mock).mockReturnValue([{ json: {} }, { json: {} }]);
			(mockExecuteFunction.continueOnFail as jest.Mock).mockReturnValue(true);

			sharetribeMock.mockQuery
				.mockRejectedValueOnce(new Error('API error'))
				.mockResolvedValueOnce({ data: [{ json: { id: 'adj-2' } }] });

			const result = await executeModule.execute.call(mockExecuteFunction);

			expect(result[0]).toHaveLength(2);
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			expect((result[0][0] as any).json.error).toBe('API error');
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			expect((result[0][0] as any).pairedItem).toEqual({ item: 0 });
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			expect((result[0][1] as any).pairedItem).toEqual({ item: 1 });
		});
	});
});
