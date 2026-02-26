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

	describe('item linking', () => {
		it('should make one query per input item', async () => {
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
			(mockExecuteFunction.getInputData as jest.Mock).mockReturnValue([{ json: {} }, { json: {} }]);

			sharetribeMock.mockQuery.mockResolvedValue({
				data: [{ json: { id: 'exception' } }],
			});

			const result = await executeModule.execute.call(mockExecuteFunction);

			expect(sharetribeMock.mockQuery).toHaveBeenCalledTimes(2);
			expect(result[0]).toHaveLength(2);
		});

		it('should set pairedItem correctly for each input item', async () => {
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
			(mockExecuteFunction.getInputData as jest.Mock).mockReturnValue([{ json: {} }, { json: {} }]);

			sharetribeMock.mockQuery
				.mockResolvedValueOnce({ data: [{ json: { id: 'exc-1' } }] })
				.mockResolvedValueOnce({ data: [{ json: { id: 'exc-2' } }] });

			const result = await executeModule.execute.call(mockExecuteFunction);

			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			expect((result[0][0] as any).pairedItem).toEqual({ item: 0 });
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			expect((result[0][1] as any).pairedItem).toEqual({ item: 1 });
		});

		it('should handle continueOnFail per item', async () => {
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
			(mockExecuteFunction.getInputData as jest.Mock).mockReturnValue([{ json: {} }, { json: {} }]);
			(mockExecuteFunction.continueOnFail as jest.Mock).mockReturnValue(true);

			sharetribeMock.mockQuery
				.mockRejectedValueOnce(new Error('API error'))
				.mockResolvedValueOnce({ data: [{ json: { id: 'exc-2' } }] });

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
