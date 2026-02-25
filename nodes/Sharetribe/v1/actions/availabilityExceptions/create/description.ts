import type { AvailabilityExceptionProperties } from '../../Interfaces';

import {
	UI_RESOURCES,
	UI_OPERATIONS,
	AVAILABILITY_EXCEPTION_RELATIONSHIP_OPTIONS,
	makeSimplifyField,
	makeResourceIdField,
	makeFieldsToReturnField,
	makeRelatedFieldsToReturn,
} from '../../../helpers/Sharetribe';

export const availabilityExceptionCreateDescription: AvailabilityExceptionProperties = [
	makeResourceIdField(UI_RESOURCES.AVAILABILITY_EXCEPTIONS, UI_OPERATIONS.CREATE, {
		displayName: 'Listing ID',
		name: 'listingId',
		description: 'ID of the listing to create exception for',
	}),
	makeSimplifyField(UI_RESOURCES.AVAILABILITY_EXCEPTIONS, UI_OPERATIONS.CREATE),
	makeFieldsToReturnField(UI_RESOURCES.AVAILABILITY_EXCEPTIONS, UI_OPERATIONS.CREATE, {
		name: 'availabilityExceptionFields',
		defaults: ['start', 'end', 'seats'],
		options: AVAILABILITY_EXCEPTION_RELATIONSHIP_OPTIONS,
	}),
	makeRelatedFieldsToReturn(UI_RESOURCES.AVAILABILITY_EXCEPTIONS, UI_OPERATIONS.CREATE, {
		displayName: 'Listing Fields to Return',
		name: 'listingFields',
		defaults: ['title', 'state'],
		loadOptionsMethod: 'getListingFieldOptions',
		conditionalOn: { field: 'availabilityExceptionFields', values: ['listing'] },
	}),

	{
		displayName: 'Available',
		name: 'available',
		type: 'boolean',
		default: false,
		displayOptions: {
			show: {
				resource: [UI_RESOURCES.AVAILABILITY_EXCEPTIONS],
				operation: [UI_OPERATIONS.CREATE],
			},
		},
		description: 'Whether the exception creates a time range available for booking',
	},
	{
		displayName: 'All Day',
		name: 'allDay',
		type: 'boolean',
		default: true,
		displayOptions: {
			show: {
				resource: [UI_RESOURCES.AVAILABILITY_EXCEPTIONS],
				operation: [UI_OPERATIONS.CREATE],
			},
		},
		description: 'Whether to create a full day exception (00:00:00 UTC to next day 00:00:00 UTC)',
	},
	{
		displayName: 'Date',
		name: 'date',
		type: 'dateTime',
		required: true,
		validateType: 'dateTime',
		placeholder: 'Date in UTC',
		default: '',
		displayOptions: {
			show: {
				resource: [UI_RESOURCES.AVAILABILITY_EXCEPTIONS],
				operation: [UI_OPERATIONS.CREATE],
				allDay: [true],
			},
		},
		description: 'Date for the exception (will span from 00:00:00 UTC to next day 00:00:00 UTC). <a href="https://www.sharetribe.com/api-reference/integration.html#create-availability-exceptions" target="_blank">Learn more</a>.',
		hint: 'Max 365 days in the future',
	},
	{
		displayName: 'Start',
		name: 'start',
		type: 'dateTime',
		required: true,
		validateType: 'dateTime',
		placeholder: 'Date and time in UTC',
		default: '',
		displayOptions: {
			show: {
				resource: [UI_RESOURCES.AVAILABILITY_EXCEPTIONS],
				operation: [UI_OPERATIONS.CREATE],
				allDay: [false],
			},
		},
		description: 'Start date and time of the exception. <a href="https://www.sharetribe.com/api-reference/integration.html#create-availability-exceptions" target="_blank">Learn more</a>.',
		hint: 'Max 365 days future. Minutes must be multiple of 5, seconds/ms must be 0.',
	},
	{
		displayName: 'End',
		name: 'end',
		type: 'dateTime',
		placeholder: 'Date and time in UTC',
		required: true,
		validateType: 'dateTime',
		default: '',
		displayOptions: {
			show: {
				resource: [UI_RESOURCES.AVAILABILITY_EXCEPTIONS],
				operation: [UI_OPERATIONS.CREATE],
				allDay: [false],
			},
		},
		description: 'End date and time (exclusive) of the exception. <a href="https://www.sharetribe.com/api-reference/integration.html#create-availability-exceptions" target="_blank">Learn more</a>.',
		hint: 'After start. Max 365 days future. Minutes must be multiple of 5, seconds/ms must be 0. Cannot overlap existing exceptions.',
	},
	{
		displayName: 'Seats Available',
		name: 'seats',
		type: 'number',
		typeOptions: { numberPrecision: 0 },
		default: 1,
		displayOptions: {
			show: {
				resource: [UI_RESOURCES.AVAILABILITY_EXCEPTIONS],
				operation: [UI_OPERATIONS.CREATE],
				available: [true],
			},
		},
		description: 'How many seats to make available during this time period',
	},
];
