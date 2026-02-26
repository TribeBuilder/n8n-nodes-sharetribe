import type { INodeProperties } from 'n8n-workflow';

export const resourceField: INodeProperties = {
	displayName: 'Resources',
	name: 'resources',
	type: 'multiOptions',
	noDataExpression: true,
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
};

export const eventTypeField: INodeProperties = {
	// eslint-disable-next-line n8n-nodes-base/node-param-display-name-wrong-for-dynamic-multi-options
	displayName: 'Trigger On',
	name: 'eventTypes',
	noDataExpression: true,
	// eslint-disable-next-line n8n-nodes-base/node-param-description-missing-from-dynamic-multi-options
	type: 'multiOptions',
	typeOptions: {
		loadOptionsMethod: 'getEventTypes',
		loadOptionsDependsOn: ['resources'],
	},
	default: ['transaction/initiated'],
	required: true,
};

const filtersCollection: INodeProperties = {
	displayName: 'Filters',
	name: 'filters',
	type: 'fixedCollection',
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
					description:
						'Whether to also return events for related resources.<br>' +
						'<br><b>Example</b>: If filtering by a "Listing" ID, this will also return transaction events for that "Listing". <a href="https://www.sharetribe.com/api-reference/integration.html#querying-events-for-related-resources" target="_blank">Learn more</a>',
				},
			],
		},
	],
};

export const triggerProperties: INodeProperties[] = [
	resourceField,
	eventTypeField,

	{
		displayName: 'Simplify',
		name: 'simplify',
		type: 'boolean',
		default: true,
		description: 'Whether to return a simplified version of the response',
	},
	{
		displayName: 'Fields to Return',
		name: 'eventAttributes',
		type: 'multiOptions',
		default: ['createdAt', 'eventType', 'resourceId', 'resourceType'],
		displayOptions: {
			show: {
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
			'Returning \'Resources\' is not recommended. Follow with an "IF" node to determine if the event is important, then retrieve the resource to improve memory usage and performance.',
		name: 'resourceNotice',
		hint: '',
		type: 'notice',
		default: '',
		displayOptions: {
			show: {
				simplify: [false],
				eventAttributes: ['resource'],
			},
		},
	},
	filtersCollection,
];
