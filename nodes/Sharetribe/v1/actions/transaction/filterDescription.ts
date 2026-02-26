import type { INodeProperties } from 'n8n-workflow';
import { createExtendedDataFilter, UI_OPERATIONS, UI_RESOURCES } from '../../helpers/Sharetribe';

export const filterDescriptionTransaction: INodeProperties[] = [
	{
		displayName: 'Filters',
		name: 'filterOptions',
		type: 'collection',
		placeholder: 'Add Filter',
		displayOptions: {
			show: {
				resource: [UI_RESOURCES.TRANSACTION],
				operation: [UI_OPERATIONS.GET_MANY],
			},
		},
		default: {},
		// eslint-disable-next-line n8n-nodes-base/node-param-collection-type-unsorted-items
		options: [
			{
				displayName: 'Booking Start Time',
				name: 'bookingStart',
				type: 'fixedCollection',
				default: {},
				placeholder: 'Add Start Time Filter',
				description: 'Filter by booking start date/time',
				typeOptions: {
					multipleValues: false,
				},
				options: [
					{
						displayName: 'Booking Start Filter',
						name: 'bookingStartFilter',
						values: [
							{
								displayName: 'Filter Mode',
								name: 'bookingStartRangeType',
								noDataExpression: true,
								type: 'options',
								options: [
									{ name: 'Exact Date', value: 'exact' },
									{ name: 'Date Range', value: 'range' },
									{ name: 'On or After', value: 'after' },
									{ name: 'Before', value: 'before' },
								],
								default: 'exact',
							},
							{
								displayName: 'Date',
								name: 'bookingStartExact',
								type: 'dateTime',
								validateType: 'dateTime',
								default: '',
								placeholder: 'Date and time in UTC',
								displayOptions: {
									show: { bookingStartRangeType: ['exact'] },
								},
							},
							{
								displayName: 'Start',
								name: 'bookingStartStart',
								type: 'dateTime',
								validateType: 'dateTime',
								default: '',
								placeholder: 'Date and time in UTC',
								displayOptions: {
									show: { bookingStartRangeType: ['range', 'after'] },
								},
							},
							{
								displayName: 'End',
								name: 'bookingStartEnd',
								type: 'dateTime',
								validateType: 'dateTime',
								default: '',
								placeholder: 'Date and time in UTC',
								displayOptions: {
									show: { bookingStartRangeType: ['range', 'before'] },
								},
							},
						],
					},
				],
			},
			{
				displayName: 'Booking End Time',
				name: 'bookingEnd',
				type: 'fixedCollection',
				default: {},
				placeholder: 'Add Booking End Filter',
				description: 'Filter by booking end date/time',
				typeOptions: {
					multipleValues: false,
				},
				options: [
					{
						displayName: 'Filter Mode',
						name: 'bookingEndRangeType',
						noDataExpression: true,
						type: 'options',
						options: [
							{ name: 'Exact Date', value: 'exact' },
							{ name: 'Date Range', value: 'range' },
							{ name: 'On or After', value: 'after' },
							{ name: 'Before', value: 'before' },
						],
						default: 'exact',
					},
					{
						displayName: 'Date',
						name: 'bookingEndExact',
						type: 'dateTime',
						validateType: 'dateTime',
						default: '',
						placeholder: 'Date and time in UTC',
						displayOptions: {
							show: { bookingEndRangeType: ['exact'] },
						},
					},
					{
						displayName: 'Start',
						name: 'bookingEndStart',
						type: 'dateTime',
						validateType: 'dateTime',
						default: '',
						placeholder: 'Date and time in UTC',
						displayOptions: {
							show: { bookingEndRangeType: ['range', 'after'] },
						},
					},
					{
						displayName: 'End',
						name: 'bookingEndEnd',
						type: 'dateTime',
						validateType: 'dateTime',
						default: '',
						placeholder: 'Date and time in UTC',
						displayOptions: {
							show: { bookingEndRangeType: ['range', 'before'] },
						},
					},
				],
			},

			{
				// eslint-disable-next-line n8n-nodes-base/node-param-display-name-wrong-for-dynamic-multi-options
				displayName: 'Booking State',
				name: 'bookingStates',
				type: 'multiOptions',
				noDataExpression: true,
				default: [],
				typeOptions: {
					loadOptionsMethod: 'getBookingStates',
				},
				description:
					'Filter by booking states. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Created After',
				name: 'createdAtStart',
				type: 'dateTime',
				validateType: 'dateTime',
				default: '',
				placeholder: 'Date and time in UTC',
				description: 'Return transactions created on or after this date/time',
			},
			{
				displayName: 'Created Before',
				name: 'createdAtEnd',
				type: 'dateTime',
				validateType: 'dateTime',
				default: '',
				placeholder: 'Date and time in UTC',
				description: 'Return transactions created before this date/time',
			},
			{
				displayName: 'Customer ID',
				name: 'customerId',
				type: 'string',
				default: '',
				description: 'Filter by customer user ID',
			},
			{
				displayName: 'Has Booking',
				name: 'hasBooking',
				type: 'boolean',
				default: true,
				description: 'Whether to filter transactions that have booking information',
			},
			{
				displayName: 'Has Message',
				name: 'hasMessage',
				type: 'boolean',
				default: true,
				description: 'Whether to filter transactions that have messages',
			},
			{
				displayName: 'Has Payin',
				name: 'hasPayin',
				type: 'boolean',
				default: true,
				description: 'Whether to filter transactions that have payment information',
			},
			{
				displayName: 'Has Stock Reservation',
				name: 'hasStockReservation',
				type: 'boolean',
				default: true,
				description: 'Whether to filter transactions that have stock reservations',
			},
			{
				displayName: 'Last Transition',
				name: 'lastTransitions',
				noDataExpression: true,
				type: 'resourceLocator',
				default: { mode: 'list', value: '' },
				description: 'Filter by the last transition',
				modes: [
					{
						displayName: 'From List',
						name: 'list',
						type: 'list',
						placeholder: 'Select transition',
						typeOptions: {
							searchListMethod: 'getTransitions',
							searchable: true,
						},
					},
					{
						displayName: 'By Name',
						name: 'name',
						type: 'string',
						placeholder: 'transition/accept',
					},
				],
			},
			{
				displayName: 'Listing ID',
				name: 'listingId',
				type: 'string',
				default: '',
				description: 'Filter by listing ID',
			},
			createExtendedDataFilter('metadata'),
			createExtendedDataFilter('protectedData'),
			{
				displayName: 'Process Name',
				name: 'processNames',
				noDataExpression: true,
				type: 'resourceLocator',
				default: { mode: 'list', value: '' },
				description: 'Filter by transaction process name',
				modes: [
					{
						displayName: 'From List',
						name: 'list',
						type: 'list',
						placeholder: 'Select process',
						typeOptions: {
							searchListMethod: 'getProcessNames',
							searchable: true,
						},
					},
					{
						displayName: 'By Name',
						name: 'name',
						type: 'string',
						placeholder: 'default-booking',
					},
				],
			},
			{
				displayName: 'Provider ID',
				name: 'providerId',
				type: 'string',
				default: '',
				description: 'Filter by provider user ID',
			},
			{
				displayName: 'States',
				name: 'states',
				noDataExpression: true,
				type: 'resourceLocator',
				default: { mode: 'list', value: '' },
				description: 'Filter by transaction state',
				modes: [
					{
						displayName: 'From List',
						name: 'list',
						type: 'list',
						placeholder: 'Select state',
						typeOptions: {
							searchListMethod: 'getTransactionStates',
							searchable: true,
						},
					},
					{
						displayName: 'By Name',
						name: 'name',
						type: 'string',
						placeholder: 'state/accepted',
					},
				],
			},
		],
	},
];
