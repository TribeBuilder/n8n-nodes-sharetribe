import * as executeModule from '../../../../../v1/actions/event/getMany/execute';
import * as transport from '../../../../../v1/transport';
import { createMockExecuteFunction } from '../../../../helpers';
import { DateTime } from 'luxon';

describe('event/getMany', () => {
	let apiRequestSpy: jest.SpyInstance;

	beforeEach(() => {
		apiRequestSpy = jest.spyOn(transport, 'apiRequest').mockResolvedValue({
			data: [
				{
					id: 'test-event-1',
					type: 'event',
					attributes: {
						sequenceId: 1,
						eventType: 'listing/created',
						resourceId: 'listing-123',
						resourceType: 'listing',
						createdAt: '2024-01-01T00:00:00.000Z',
					},
				},
			],
		});
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	const defaultParameters = {
		resources: ['transaction'],
		eventTypes: ['transaction/initiated'],
		filters: {},
		options: {},
		returnAll: false,
		limit: 50,
		simplify: true,
	};

	it('should call events/query endpoint', async () => {
		const mockExecuteFunction = createMockExecuteFunction(defaultParameters);

		await executeModule.execute.call(mockExecuteFunction);

		expect(apiRequestSpy).toHaveBeenCalledWith(
			'GET',
			'events/query',
			{},
			expect.objectContaining({
				'fields.event': expect.any(String),
			}),
		);
	});

	it('should include default event attributes', async () => {
		const mockExecuteFunction = createMockExecuteFunction(defaultParameters);

		await executeModule.execute.call(mockExecuteFunction);

		const query = apiRequestSpy.mock.calls[0][3] as Record<string, string>;
		expect(query['fields.event']).toContain('sequenceId');
		expect(query['fields.event']).toContain('eventType');
		expect(query['fields.event']).toContain('resourceId');
		expect(query['fields.event']).toContain('resourceType');
		expect(query['fields.event']).toContain('createdAt');
	});

	it('should include custom event attributes when specified', async () => {
		const mockExecuteFunction = createMockExecuteFunction({
			...defaultParameters,
			simplify: false,
			resources: ['listing'],
			eventTypes: ['listing/created'],
			eventAttributes: ['sequenceId', 'eventType', 'resource', 'auditData'],
		});

		await executeModule.execute.call(mockExecuteFunction);

		const query = apiRequestSpy.mock.calls[0][3] as Record<string, string>;
		expect(query['fields.event']).toContain('sequenceId');
		expect(query['fields.event']).toContain('eventType');
		expect(query['fields.event']).toContain('resource');
		expect(query['fields.event']).toContain('auditData');
	});

	it('should always include sequenceId even if not specified', async () => {
		const mockExecuteFunction = createMockExecuteFunction({
			...defaultParameters,
			simplify: false,
			resources: ['user'],
			eventTypes: ['user/updated'],
			eventAttributes: ['eventType', 'resourceId'],
		});

		await executeModule.execute.call(mockExecuteFunction);

		const query = apiRequestSpy.mock.calls[0][3] as Record<string, string>;
		expect(query['fields.event']).toContain('sequenceId');
	});

	it('should filter event types by selected resources', async () => {
		const mockExecuteFunction = createMockExecuteFunction({
			...defaultParameters,
			resources: ['listing'],
			eventTypes: ['listing/created', 'listing/updated', 'transaction/initiated'],
		});

		await executeModule.execute.call(mockExecuteFunction);

		const query = apiRequestSpy.mock.calls[0][3] as Record<string, string>;
		// Should only include listing events, not transaction events
		expect(query.eventTypes).toBe('listing/created,listing/updated');
	});

	it('should filter by resource ID', async () => {
		const mockExecuteFunction = createMockExecuteFunction({
			...defaultParameters,
			resources: ['listing'],
			eventTypes: ['listing/created'],
			filters: {
				byResourceId: {
					resourceId: 'listing-123',
				},
			},
		});

		await executeModule.execute.call(mockExecuteFunction);

		const query = apiRequestSpy.mock.calls[0][3] as Record<string, string>;
		expect(query.resourceId).toBe('listing-123');
	});

	it('should use relatedResourceId when includeRelated is true', async () => {
		const mockExecuteFunction = createMockExecuteFunction({
			...defaultParameters,
			resources: ['listing'],
			eventTypes: ['listing/created'],
			filters: {
				byResourceId: {
					resourceId: 'listing-123',
					includeRelated: true,
				},
			},
		});

		await executeModule.execute.call(mockExecuteFunction);

		const query = apiRequestSpy.mock.calls[0][3] as Record<string, string>;
		expect(query.relatedResourceId).toBe('listing-123');
		expect(query.resourceId).toBeUndefined();
	});

	it('should handle "all" resources selection', async () => {
		const mockExecuteFunction = createMockExecuteFunction({
			...defaultParameters,
			resources: ['all'],
			eventTypes: ['listing/created', 'user/updated', 'transaction/initiated'],
		});

		await executeModule.execute.call(mockExecuteFunction);

		const query = apiRequestSpy.mock.calls[0][3] as Record<string, string>;
		// All event types should be included when "all" is selected
		expect(query.eventTypes).toBe('listing/created,user/updated,transaction/initiated');
	});

	it('should return normalized event data', async () => {
		const mockExecuteFunction = createMockExecuteFunction(defaultParameters);

		const result = await executeModule.execute.call(mockExecuteFunction);

		expect(result).toHaveLength(1);
		expect(result[0]).toHaveLength(1);
		expect(result[0][0]).toHaveProperty('sequenceId');
		expect(result[0][0]).toHaveProperty('eventType');
	});

	it('should filter by startAfterSequenceId when mode is sequenceId', async () => {
		const mockExecuteFunction = createMockExecuteFunction({
			...defaultParameters,
			options: {
				pastEvents: {
					startQueryMode: 'sequenceId',
					startAfterSequenceId: 12345,
				},
			},
		});

		await executeModule.execute.call(mockExecuteFunction);

		const query = apiRequestSpy.mock.calls[0][3] as Record<string, number>;
		expect(query.startAfterSequenceId).toBe(12345);
	});

	it('should filter by startTime when mode is specificTime', async () => {
		const mockExecuteFunction = createMockExecuteFunction({
			...defaultParameters,
			resources: ['listing'],
			eventTypes: ['listing/created'],
			options: {
				pastEvents: {
					startQueryMode: 'specificTime',
					startTime: DateTime.fromISO('2024-01-01T00:00:00.000Z'),
				},
			},
		});

		await executeModule.execute.call(mockExecuteFunction);

		const query = apiRequestSpy.mock.calls[0][3] as Record<string, string>;
		expect(query.createdAtStart).toBeDefined();
	});

	it('should not add time filters when mode is "allEvents"', async () => {
		const mockExecuteFunction = createMockExecuteFunction({
			...defaultParameters,
			resources: ['user'],
			eventTypes: ['user/updated'],
			options: {
				pastEvents: {
					startQueryMode: 'allEvents',
				},
			},
		});

		await executeModule.execute.call(mockExecuteFunction);

		const query = apiRequestSpy.mock.calls[0][3] as Record<string, string>;
		expect(query.startAfterSequenceId).toBeUndefined();
		expect(query.createdAtStart).toBeUndefined();
	});

	it('should not add time filters when no pastEvents is provided', async () => {
		const mockExecuteFunction = createMockExecuteFunction(defaultParameters);

		await executeModule.execute.call(mockExecuteFunction);

		const query = apiRequestSpy.mock.calls[0][3] as Record<string, string>;
		expect(query.startAfterSequenceId).toBeUndefined();
		expect(query.createdAtStart).toBeUndefined();
	});

	it('should loop when returnAll is true and there are 100+ events', async () => {
		// Create 100 events for first batch
		const firstBatch = Array.from({ length: 100 }, (_, i) => ({
			id: `event-${i}`,
			type: 'event',
			attributes: {
				sequenceId: i + 1,
				eventType: 'listing/created',
				resourceId: `listing-${i}`,
				resourceType: 'listing',
				createdAt: '2024-01-01T00:00:00.000Z',
			},
		}));

		// Create 50 events for second batch
		const secondBatch = Array.from({ length: 50 }, (_, i) => ({
			id: `event-${i + 100}`,
			type: 'event',
			attributes: {
				sequenceId: i + 101,
				eventType: 'listing/created',
				resourceId: `listing-${i + 100}`,
				resourceType: 'listing',
				createdAt: '2024-01-01T00:00:00.000Z',
			},
		}));

		apiRequestSpy
			.mockResolvedValueOnce({ data: firstBatch })
			.mockResolvedValueOnce({ data: secondBatch });

		const mockExecuteFunction = createMockExecuteFunction({
			...defaultParameters,
			returnAll: true,
		});

		const result = await executeModule.execute.call(mockExecuteFunction);

		// Should have called API twice
		expect(apiRequestSpy).toHaveBeenCalledTimes(2);
		// Should return all 150 events
		expect(result[0]).toHaveLength(150);
	});

	it('should stop looping when fewer than 100 events are returned', async () => {
		// Create 50 events for first batch
		const firstBatch = Array.from({ length: 50 }, (_, i) => ({
			id: `event-${i}`,
			type: 'event',
			attributes: {
				sequenceId: i + 1,
				eventType: 'listing/created',
				resourceId: `listing-${i}`,
				resourceType: 'listing',
				createdAt: '2024-01-01T00:00:00.000Z',
			},
		}));

		apiRequestSpy.mockResolvedValueOnce({ data: firstBatch });

		const mockExecuteFunction = createMockExecuteFunction({
			...defaultParameters,
			returnAll: true,
		});

		const result = await executeModule.execute.call(mockExecuteFunction);

		// Should have called API once
		expect(apiRequestSpy).toHaveBeenCalledTimes(1);
		// Should return all 50 events
		expect(result[0]).toHaveLength(50);
	});

	it('should respect limit when returnAll is false', async () => {
		// Create 100 events for first batch
		const firstBatch = Array.from({ length: 100 }, (_, i) => ({
			id: `event-${i}`,
			type: 'event',
			attributes: {
				sequenceId: i + 1,
				eventType: 'listing/created',
				resourceId: `listing-${i}`,
				resourceType: 'listing',
				createdAt: '2024-01-01T00:00:00.000Z',
			},
		}));

		apiRequestSpy.mockResolvedValueOnce({ data: firstBatch });

		const mockExecuteFunction = createMockExecuteFunction({
			...defaultParameters,
			returnAll: false,
			limit: 50,
		});

		const result = await executeModule.execute.call(mockExecuteFunction);

		// Should have called API once
		expect(apiRequestSpy).toHaveBeenCalledTimes(1);
		// Should return only 50 events (limited)
		expect(result[0]).toHaveLength(50);
	});

	it('should return raw data when simplify is false', async () => {
		const mockExecuteFunction = createMockExecuteFunction({
			...defaultParameters,
			simplify: false,
		});

		const result = await executeModule.execute.call(mockExecuteFunction);

		// Should not normalize - data should have id, type, attributes structure
		expect(result[0][0]).toHaveProperty('id');
		expect(result[0][0]).toHaveProperty('type');
		expect(result[0][0]).toHaveProperty('attributes');
	});
});
