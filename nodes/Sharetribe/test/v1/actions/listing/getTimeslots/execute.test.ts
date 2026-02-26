import { NodeOperationError } from 'n8n-workflow';
import { Settings } from 'luxon';
import * as executeModule from '../../../../../v1/actions/listing/getTimeslots/execute';
import * as TransportModule from '../../../../../v1/transport';
import { TimeslotQueryBuilder } from '../../../../../v1/actions/listing/getTimeslots/Builder';
import { createMockExecuteFunction } from '../../../../helpers';

// Freeze Luxon's "now" so test dates (2024-01-01) pass validation
const FROZEN_NOW = new Date('2024-01-01T00:00:00.000Z').valueOf();

describe('listing/getTimeslots', () => {
	beforeAll(() => {
		Settings.now = () => FROZEN_NOW;
	});

	afterAll(() => {
		Settings.now = () => Date.now();
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	it('should fetch timeslots for a listing', async () => {
		const mockExecuteFunction = createMockExecuteFunction({
			listingId: '550e8400-e29b-41d4-a716-446655440000',
			start: '2024-01-01T00:00:00.000Z',
			end: '2024-01-02T00:00:00.000Z',
			returnAll: false,
			limit: 50,
			options: {},
		});

		const mockTimeslotResponse = {
			data: [
				{
					id: 'timeslot-1',
					type: 'timeSlot',
					attributes: {
						start: '2024-01-01T09:00:00.000Z',
						end: '2024-01-01T10:00:00.000Z',
						seats: 1,
					},
				},
				{
					id: 'timeslot-2',
					type: 'timeSlot',
					attributes: {
						start: '2024-01-01T10:00:00.000Z',
						end: '2024-01-01T11:00:00.000Z',
						seats: 1,
					},
				},
			],
			meta: {
				page: 1,
				perPage: 50,
				totalItems: 2,
				totalPages: 1,
			},
		};

		jest
			.spyOn(TransportModule, 'timeslotRequest')
			.mockResolvedValue(
				mockTimeslotResponse as unknown as Awaited<
					ReturnType<typeof TransportModule.timeslotRequest>
				>,
			);

		const result = await executeModule.execute.call(mockExecuteFunction);

		expect(TransportModule.timeslotRequest).toHaveBeenCalledWith({
			listingId: '550e8400-e29b-41d4-a716-446655440000',
			start: '2024-01-01T00:00:00.000Z',
			end: '2024-01-02T00:00:00.000Z',
			page: 1,
			perPage: 50,
		});
		expect(result).toBeDefined();
		expect(result[0]).toHaveLength(2);
	});

	it('should fetch all timeslots when returnAll is true', async () => {
		const mockExecuteFunction = createMockExecuteFunction({
			listingId: '550e8400-e29b-41d4-a716-446655440000',
			start: '2024-01-01T00:00:00.000Z',
			end: '2024-01-02T00:00:00.000Z',
			returnAll: true,
			limit: 50,
			options: {},
		});

		const mockPage1Response = {
			data: new Array(500).fill(null).map((_, i) => ({
				id: `timeslot-${i}`,
				type: 'timeSlot',
				attributes: {
					start: '2024-01-01T09:00:00.000Z',
					end: '2024-01-01T10:00:00.000Z',
					seats: 1,
				},
			})),
			meta: {
				page: 1,
				perPage: 500,
				totalItems: 600,
				totalPages: 2,
			},
		};

		const mockPage2Response = {
			data: new Array(100).fill(null).map((_, i) => ({
				id: `timeslot-${i + 500}`,
				type: 'timeSlot',
				attributes: {
					start: '2024-01-01T09:00:00.000Z',
					end: '2024-01-01T10:00:00.000Z',
					seats: 1,
				},
			})),
			meta: {
				page: 2,
				perPage: 500,
				totalItems: 600,
				totalPages: 2,
			},
		};

		const timeslotRequestMock = jest
			.spyOn(TransportModule, 'timeslotRequest')
			.mockResolvedValueOnce(
				mockPage1Response as unknown as Awaited<
					ReturnType<typeof TransportModule.timeslotRequest>
				>,
			)
			.mockResolvedValueOnce(
				mockPage2Response as unknown as Awaited<
					ReturnType<typeof TransportModule.timeslotRequest>
				>,
			);

		const result = await executeModule.execute.call(mockExecuteFunction);

		expect(timeslotRequestMock).toHaveBeenCalledTimes(2);
		expect(result[0]).toHaveLength(600);
	});

	it('should respect limit when returnAll is false', async () => {
		const mockExecuteFunction = createMockExecuteFunction({
			listingId: '550e8400-e29b-41d4-a716-446655440000',
			start: '2024-01-01T00:00:00.000Z',
			end: '2024-01-02T00:00:00.000Z',
			returnAll: false,
			limit: 10,
			options: {},
		});

		const mockTimeslotResponse = {
			data: new Array(10).fill(null).map((_, i) => ({
				id: `timeslot-${i}`,
				type: 'timeSlot',
				attributes: {
					start: '2024-01-01T09:00:00.000Z',
					end: '2024-01-01T10:00:00.000Z',
					seats: 1,
				},
			})),
			meta: {
				page: 1,
				perPage: 10,
				totalItems: 100,
				totalPages: 10,
			},
		};

		jest
			.spyOn(TransportModule, 'timeslotRequest')
			.mockResolvedValue(
				mockTimeslotResponse as unknown as Awaited<
					ReturnType<typeof TransportModule.timeslotRequest>
				>,
			);

		const result = await executeModule.execute.call(mockExecuteFunction);

		expect(result[0]).toHaveLength(10);
	});

	it('should convert duration with units to proper ISO 8601 format', async () => {
		const mockExecuteFunction = createMockExecuteFunction({
			listingId: '550e8400-e29b-41d4-a716-446655440000',
			start: '2024-01-01T00:00:00.000Z',
			end: '2024-01-02T00:00:00.000Z',
			returnAll: false,
			limit: 50,
			options: {
				timeSlotGrouping: {
					duration: {
						value: 30,
						unit: 'minutes',
					},
				},
			},
		});

		const mockTimeslotResponse = {
			data: [],
			meta: {
				page: 1,
				perPage: 50,
				totalItems: 0,
				totalPages: 0,
			},
		};

		jest
			.spyOn(TransportModule, 'timeslotRequest')
			.mockResolvedValue(
				mockTimeslotResponse as unknown as Awaited<
					ReturnType<typeof TransportModule.timeslotRequest>
				>,
			);

		await executeModule.execute.call(mockExecuteFunction);

		expect(TransportModule.timeslotRequest).toHaveBeenCalledWith({
			listingId: '550e8400-e29b-41d4-a716-446655440000',
			start: '2024-01-01T00:00:00.000Z',
			end: '2024-01-02T00:00:00.000Z',
			intervalDuration: 'PT30M',
			page: 1,
			perPage: 50,
		});
	});

	it('should convert all time units to proper ISO 8601 format', async () => {
		const testCases = [
			{ value: 15, unit: 'minutes', expected: 'PT15M' },
			{ value: 30, unit: 'minutes', expected: 'PT30M' },
			{ value: 1, unit: 'hours', expected: 'PT1H' },
			{ value: 2, unit: 'hours', expected: 'PT2H' },
			{ value: 1, unit: 'days', expected: 'P1D' },
			{ value: 7, unit: 'days', expected: 'P7D' },
			{ value: 1, unit: 'weeks', expected: 'P1W' },
			{ value: 2, unit: 'weeks', expected: 'P2W' },
		];

		for (const { value, unit, expected } of testCases) {
			const mockExecuteFunction = createMockExecuteFunction({
				listingId: '550e8400-e29b-41d4-a716-446655440000',
				start: '2024-01-01T00:00:00.000Z',
				end: '2024-01-02T00:00:00.000Z',
				returnAll: false,
				limit: 50,
				options: {
					timeSlotGrouping: {
						duration: {
							value,
							unit,
						},
					},
				},
			});

			const mockTimeslotResponse = {
				data: [],
				meta: {
					page: 1,
					perPage: 50,
					totalItems: 0,
					totalPages: 0,
				},
			};

			jest
				.spyOn(TransportModule, 'timeslotRequest')
				.mockResolvedValue(
					mockTimeslotResponse as unknown as Awaited<
						ReturnType<typeof TransportModule.timeslotRequest>
					>,
				);

			await executeModule.execute.call(mockExecuteFunction);

			expect(TransportModule.timeslotRequest).toHaveBeenCalledWith(
				expect.objectContaining({
					intervalDuration: expected,
				}),
			);

			jest.restoreAllMocks();
		}
	});

	it('should handle expandTimeSlots with default minDurationStartingInInterval', async () => {
		const mockExecuteFunction = createMockExecuteFunction({
			listingId: '550e8400-e29b-41d4-a716-446655440000',
			start: '2024-01-01T00:00:00.000Z',
			end: '2024-01-07T00:00:00.000Z',
			returnAll: false,
			limit: 50,
			options: {
				expandTimeSlots: true,
			},
		});

		const mockTimeslotResponse = {
			data: [],
			meta: {
				page: 1,
				perPage: 50,
				totalItems: 0,
				totalPages: 0,
			},
		};

		jest
			.spyOn(TransportModule, 'timeslotRequest')
			.mockResolvedValue(
				mockTimeslotResponse as unknown as Awaited<
					ReturnType<typeof TransportModule.timeslotRequest>
				>,
			);

		await executeModule.execute.call(mockExecuteFunction);

		expect(TransportModule.timeslotRequest).toHaveBeenCalledWith({
			listingId: '550e8400-e29b-41d4-a716-446655440000',
			start: '2024-01-01T00:00:00.000Z',
			end: '2024-01-07T00:00:00.000Z',
			minDurationStartingInInterval: 5,
			page: 1,
			perPage: 50,
		});
	});

	it('should handle expandTimeSlots with custom minDurationStartingInInterval', async () => {
		const mockExecuteFunction = createMockExecuteFunction({
			listingId: '550e8400-e29b-41d4-a716-446655440000',
			start: '2024-01-01T00:00:00.000Z',
			end: '2024-01-07T00:00:00.000Z',
			returnAll: false,
			limit: 50,
			options: {
				expandTimeSlots: true,
				minDurationStartingInInterval: {
					duration: {
						value: 2,
						unit: 'hours',
					},
				},
			},
		});

		const mockTimeslotResponse = {
			data: [],
			meta: {
				page: 1,
				perPage: 50,
				totalItems: 0,
				totalPages: 0,
			},
		};

		jest
			.spyOn(TransportModule, 'timeslotRequest')
			.mockResolvedValue(
				mockTimeslotResponse as unknown as Awaited<
					ReturnType<typeof TransportModule.timeslotRequest>
				>,
			);

		await executeModule.execute.call(mockExecuteFunction);

		expect(TransportModule.timeslotRequest).toHaveBeenCalledWith({
			listingId: '550e8400-e29b-41d4-a716-446655440000',
			start: '2024-01-01T00:00:00.000Z',
			end: '2024-01-07T00:00:00.000Z',
			minDurationStartingInInterval: 120,
			page: 1,
			perPage: 50,
		});
	});

	it('should NOT include minDurationStartingInInterval when expandTimeSlots is false', async () => {
		const mockExecuteFunction = createMockExecuteFunction({
			listingId: '550e8400-e29b-41d4-a716-446655440000',
			start: '2024-01-01T00:00:00.000Z',
			end: '2024-01-07T00:00:00.000Z',
			returnAll: false,
			limit: 50,
			options: {
				expandTimeSlots: false,
				minDurationStartingInInterval: {
					duration: {
						value: 2,
						unit: 'hours',
					},
				},
			},
		});

		const mockTimeslotResponse = {
			data: [],
			meta: {
				page: 1,
				perPage: 50,
				totalItems: 0,
				totalPages: 0,
			},
		};

		jest
			.spyOn(TransportModule, 'timeslotRequest')
			.mockResolvedValue(
				mockTimeslotResponse as unknown as Awaited<
					ReturnType<typeof TransportModule.timeslotRequest>
				>,
			);

		await executeModule.execute.call(mockExecuteFunction);

		expect(TransportModule.timeslotRequest).toHaveBeenCalledWith({
			listingId: '550e8400-e29b-41d4-a716-446655440000',
			start: '2024-01-01T00:00:00.000Z',
			end: '2024-01-07T00:00:00.000Z',
			page: 1,
			perPage: 50,
		});
	});

	it('should pass all optional parameters with new nested structure', async () => {
		const mockExecuteFunction = createMockExecuteFunction({
			listingId: '550e8400-e29b-41d4-a716-446655440000',
			start: '2024-01-01T00:00:00.000Z',
			end: '2024-01-07T00:00:00.000Z',
			returnAll: false,
			limit: 50,
			options: {
				timeSlotGrouping: {
					duration: {
						value: 1,
						unit: 'days',
					},
					limitOptions: {
						maxPerInterval: 2,
					},
					alignmentOptions: {
						intervalAlign: '2024-01-01T08:30:00.000Z',
					},
				},
				expandTimeSlots: true,
				minDurationStartingInInterval: {
					duration: {
						value: 30,
						unit: 'minutes',
					},
				},
			},
		});

		const mockTimeslotResponse = {
			data: [],
			meta: {
				page: 1,
				perPage: 50,
				totalItems: 0,
				totalPages: 0,
			},
		};

		jest
			.spyOn(TransportModule, 'timeslotRequest')
			.mockResolvedValue(
				mockTimeslotResponse as unknown as Awaited<
					ReturnType<typeof TransportModule.timeslotRequest>
				>,
			);

		await executeModule.execute.call(mockExecuteFunction);

		expect(TransportModule.timeslotRequest).toHaveBeenCalledWith({
			listingId: '550e8400-e29b-41d4-a716-446655440000',
			start: '2024-01-01T00:00:00.000Z',
			end: '2024-01-07T00:00:00.000Z',
			intervalDuration: 'P1D',
			maxPerInterval: 2,
			intervalAlign: '2024-01-01T08:30:00.000Z',
			minDurationStartingInInterval: 30,
			page: 1,
			perPage: 50,
		});
	});

	it('should convert minDurationStartingInInterval with all units to minutes', async () => {
		const testCases = [
			{ value: 15, unit: 'minutes', expected: 15 },
			{ value: 1, unit: 'hours', expected: 60 },
			{ value: 2, unit: 'hours', expected: 120 },
			{ value: 1, unit: 'days', expected: 1440 },
			{ value: 2, unit: 'days', expected: 2880 },
			{ value: 1, unit: 'weeks', expected: 10080 },
		];

		for (const { value, unit, expected } of testCases) {
			const mockExecuteFunction = createMockExecuteFunction({
				listingId: '550e8400-e29b-41d4-a716-446655440000',
				start: '2024-01-01T00:00:00.000Z',
				end: '2024-01-02T00:00:00.000Z',
				returnAll: false,
				limit: 50,
				options: {
					expandTimeSlots: true,
					minDurationStartingInInterval: {
						duration: {
							value,
							unit,
						},
					},
				},
			});

			const mockTimeslotResponse = {
				data: [],
				meta: {
					page: 1,
					perPage: 50,
					totalItems: 0,
					totalPages: 0,
				},
			};

			jest
				.spyOn(TransportModule, 'timeslotRequest')
				.mockResolvedValue(
					mockTimeslotResponse as unknown as Awaited<
						ReturnType<typeof TransportModule.timeslotRequest>
					>,
				);

			await executeModule.execute.call(mockExecuteFunction);

			expect(TransportModule.timeslotRequest).toHaveBeenCalledWith(
				expect.objectContaining({
					minDurationStartingInInterval: expected,
				}),
			);

			jest.restoreAllMocks();
		}
	});

	describe('date range validation', () => {
		// Tests run with FROZEN_NOW = 2024-01-01T00:00:00Z

		function buildWithDates(start: string, end: string) {
			const ctx = createMockExecuteFunction({});
			return new TimeslotQueryBuilder(ctx)
				.withListingId('550e8400-e29b-41d4-a716-446655440000')
				.withDateRange(start, end);
		}

		it('should reject start date more than 1 day in the past', () => {
			expect(() => buildWithDates('2023-12-29T00:00:00.000Z', '2024-01-02T00:00:00.000Z'))
				.toThrow(NodeOperationError);
			expect(() => buildWithDates('2023-12-29T00:00:00.000Z', '2024-01-02T00:00:00.000Z'))
				.toThrow('more than 1 day in the past');
		});

		it('should reject start date more than 366 days in the future', () => {
			expect(() => buildWithDates('2025-01-04T00:00:00.000Z', '2025-01-05T00:00:00.000Z'))
				.toThrow(NodeOperationError);
			expect(() => buildWithDates('2025-01-04T00:00:00.000Z', '2025-01-05T00:00:00.000Z'))
				.toThrow('more than 366 days in the future');
		});

		it('should reject end date more than 366 days in the future', () => {
			expect(() => buildWithDates('2024-12-30T00:00:00.000Z', '2025-01-04T00:00:00.000Z'))
				.toThrow(NodeOperationError);
			expect(() => buildWithDates('2024-12-30T00:00:00.000Z', '2025-01-04T00:00:00.000Z'))
				.toThrow('more than 366 days in the future');
		});

		it('should reject date range exceeding 90 days', () => {
			expect(() => buildWithDates('2024-01-01T00:00:00.000Z', '2024-04-02T00:00:00.000Z'))
				.toThrow(NodeOperationError);
			expect(() => buildWithDates('2024-01-01T00:00:00.000Z', '2024-04-02T00:00:00.000Z'))
				.toThrow('cannot exceed 90 days');
		});

		it('should reject end before start', () => {
			expect(() => buildWithDates('2024-01-05T00:00:00.000Z', '2024-01-01T00:00:00.000Z'))
				.toThrow(NodeOperationError);
			expect(() => buildWithDates('2024-01-05T00:00:00.000Z', '2024-01-01T00:00:00.000Z'))
				.toThrow('must be after start');
		});

		it('should accept valid date range within 90 days', () => {
			expect(() => buildWithDates('2024-01-01T00:00:00.000Z', '2024-03-01T00:00:00.000Z'))
				.not.toThrow();
		});

		it('should accept start up to 1 day in the past (with buffer)', () => {
			expect(() => buildWithDates('2023-12-31T01:00:00.000Z', '2024-01-02T00:00:00.000Z'))
				.not.toThrow();
		});
	});
});
