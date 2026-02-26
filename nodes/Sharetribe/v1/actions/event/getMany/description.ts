import type { INodeProperties } from 'n8n-workflow';
import {
	UI_OPERATIONS,
	UI_RESOURCES,
	makeSimplifyField,
	makeReturnAllField,
	makeLimitField,
} from '../../../helpers/Sharetribe';

export const eventQueryDescription: INodeProperties[] = [
	makeReturnAllField(UI_RESOURCES.EVENT, UI_OPERATIONS.GET_MANY),
	makeLimitField(UI_RESOURCES.EVENT, UI_OPERATIONS.GET_MANY, { showCountOnly: false }),
	makeSimplifyField(UI_RESOURCES.EVENT, UI_OPERATIONS.GET_MANY),
	{
		displayName: 'Resources',
		name: 'resources',
		type: 'multiOptions',
		displayOptions: {
			show: {
				resource: [UI_RESOURCES.EVENT],
				operation: [UI_OPERATIONS.GET_MANY],
			},
		},
		options: [
			{ name: 'All', value: 'all' },
			{ name: 'Availability Exception', value: 'availabilityException' },
			{ name: 'Booking', value: 'booking' },
			{ name: 'Listing', value: 'listing' },
			{ name: 'Message', value: 'message' },
			{ name: 'Review', value: 'review' },
			{ name: 'Stock Adjustment', value: 'stockAdjustment' },
			{ name: 'Stock Reservation', value: 'stockReservation' },
			{ name: 'Transaction', value: 'transaction' },
			{ name: 'User', value: 'user' },
		],
		default: ['transaction'],
		required: true,
		description: 'Select one or more resources to poll for events',
	},
	{
		// eslint-disable-next-line n8n-nodes-base/node-param-display-name-wrong-for-dynamic-multi-options
		displayName: 'Events',
		name: 'eventTypes',
		displayOptions: {
			show: {
				resource: [UI_RESOURCES.EVENT],
				operation: [UI_OPERATIONS.GET_MANY],
			},
		},
		// eslint-disable-next-line n8n-nodes-base/node-param-description-missing-from-dynamic-multi-options
		type: 'multiOptions',
		typeOptions: {
			loadOptionsMethod: 'getEventTypes',
			loadOptionsDependsOn: ['resources'],
		},
		default: ['transaction/initiated'],
		required: true,
	},
	{
		displayName: 'Event Fields to Return',
		hint: 'Select the minimum fields to improve performance.',
		name: 'eventAttributes',
		type: 'multiOptions',
		default: ['createdAt', 'eventType', 'resourceId', 'resourceType'],
		displayOptions: {
			show: {
				resource: [UI_RESOURCES.EVENT],
				operation: [UI_OPERATIONS.GET_MANY],
				simplify: [false],
			},
		},
		options: [
			{
				name: 'Audit Data',
				value: 'auditData',
				description: 'Data about the actor that caused the event',
			},
			{
				name: 'Created At',
				value: 'createdAt',
				description: 'The date and time when the event occurred',
			},
			{
				name: 'Event Type',
				value: 'eventType',
				description: 'The type of the event (e.g., listing/created, user/updated)',
			},
			{
				name: 'Marketplace ID',
				value: 'marketplaceId',
				description: 'The ID of the marketplace in which the event happened',
			},
			{
				name: 'Previous Values',
				value: 'previousValues',
				description: 'Previous values for changed resource fields and relationships',
			},
			{
				name: 'Resource',
				value: 'resource',
				description: 'The full resource data after the event occurred',
			},
			{
				name: 'Resource ID',
				value: 'resourceId',
				description: 'The ID of the API resource that the event is about',
			},
			{
				name: 'Resource Type',
				value: 'resourceType',
				description: 'The type of the API resource (user, listing, transaction, etc.)',
			},
			{
				name: 'Sequence ID',
				value: 'sequenceId',
				description: 'Numeric ID providing strict ordering of events',
			},
			{
				name: 'Source',
				value: 'source',
				description: 'The service from which the event originated',
			},
		],
		description: 'Select which event fields to include in the response',
	},
	{
		displayName:
			'It is not recommended to return resources in events. Use a filter node then get the resource if it is an event you are interested in.',
		name: 'resourceNotice',
		type: 'notice',
		default: '',
		displayOptions: {
			show: {
				resource: [UI_RESOURCES.EVENT],
				operation: [UI_OPERATIONS.GET_MANY],
				simplify: [false],
				eventAttributes: ['resource'],
			},
		},
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'fixedCollection',
		displayOptions: {
			show: {
				resource: [UI_RESOURCES.EVENT],
				operation: [UI_OPERATIONS.GET_MANY],
			},
		},
		placeholder: 'Add Option',
		default: {},
		options: [
			{
				displayName: 'Past Events',
				name: 'pastEvents',
				values: [
					{
						displayName: 'Starting From',
						name: 'startQueryMode',
						type: 'options',
						default: 'allEvents',
						options: [
							{
								name: 'All Past Events',
								value: 'allEvents',
								description: 'All available events (up to 90 days for live, 7 days for dev/test)',
							},
							{
								name: 'Specific Time',
								value: 'specificTime',
								description: 'Events on or after a specific time',
							},
							{
								name: 'Specific Sequence ID',
								value: 'sequenceId',
								description: 'Events after a specific event sequence ID',
							},
						],
						description: 'Starting point for past events polling',
					},
					{
						displayName: 'Start Time',
						name: 'startTime',
						type: 'dateTime',
						placeholder: 'Date and time in UTC',
						validateType: 'dateTime',
						default: '',
						displayOptions: {
							show: {
								startQueryMode: ['specificTime'],
							},
						},
						description:
							'Return only events created on or after this timestamp. Can be at most 90 days in the past for live marketplaces or 7 days for dev/test.',
					},
					{
						displayName: 'Start After Sequence ID',
						name: 'startAfterSequenceId',
						type: 'number',
						default: 0,
						displayOptions: {
							show: {
								startQueryMode: ['sequenceId'],
							},
						},
						description: 'Return events with sequence ID strictly larger than this value',
					},
				],
			},
		],
	},
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'fixedCollection',
		displayOptions: {
			show: {
				resource: [UI_RESOURCES.EVENT],
				operation: [UI_OPERATIONS.GET_MANY],
			},
		},
		placeholder: 'Add Filter',
		default: {},
		options: [
			{
				displayName: 'By Resource ID',
				name: 'byResourceId',
				values: [
					{
						displayName: 'Resource ID',
						name: 'resourceId',
						type: 'string',
						default: '',
						required: true,
						placeholder: 'e.g. 550e8400-e29b-41d4-a716-446655440000',
						description: 'Filter events for this specific resource ID e.g a "Listing" ID',
					},
					{
						displayName: 'Include Related Resources',
						name: 'includeRelated',
						type: 'boolean',
						default: false,
						description: 'Whether to also return events for related resources',
					},
				],
			},
		],
	},
];
