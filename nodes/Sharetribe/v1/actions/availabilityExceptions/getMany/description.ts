import type { AvailabilityExceptionProperties } from '../../Interfaces';
import {
	UI_RESOURCES,
	UI_OPERATIONS,
	AVAILABILITY_EXCEPTION_RELATIONSHIP_OPTIONS,
	DEFAULT_QUERY_LIMIT,
	makeSimplifyField,
	makeResourceIdField,
	makeReturnAllField,
	makeLimitField,
	makeFieldsToReturnField,
	makeRelatedFieldsToReturn,
} from '../../../helpers/Sharetribe';

export const availabilityExceptionGetManyDescription: AvailabilityExceptionProperties = [
	makeResourceIdField(UI_RESOURCES.AVAILABILITY_EXCEPTIONS, UI_OPERATIONS.GET_MANY, {
		displayName: 'Listing ID',
		name: 'listingId',
		description: 'The ID of the listing',
	}),
	makeReturnAllField(UI_RESOURCES.AVAILABILITY_EXCEPTIONS, UI_OPERATIONS.GET_MANY),
	makeLimitField(UI_RESOURCES.AVAILABILITY_EXCEPTIONS, UI_OPERATIONS.GET_MANY, {
		default: DEFAULT_QUERY_LIMIT,
		showCountOnly: false,
	}),
	makeSimplifyField(UI_RESOURCES.AVAILABILITY_EXCEPTIONS, UI_OPERATIONS.GET_MANY),
	makeFieldsToReturnField(UI_RESOURCES.AVAILABILITY_EXCEPTIONS, UI_OPERATIONS.GET_MANY, {
		name: 'availabilityExceptionFields',
		defaults: ['start', 'end', 'seats'],
		options: AVAILABILITY_EXCEPTION_RELATIONSHIP_OPTIONS,
	}),
	makeRelatedFieldsToReturn(UI_RESOURCES.AVAILABILITY_EXCEPTIONS, UI_OPERATIONS.GET_MANY, {
		displayName: 'Listing Fields to Return',
		name: 'listingFields',
		defaults: ['title', 'state'],
		loadOptionsMethod: 'getListingFieldOptions',
		conditionalOn: { field: 'availabilityExceptionFields', values: ['listing'] },
	}),

	{
		displayName: 'Start',
		name: 'start',
		type: 'dateTime',
		validateType: 'dateTime',
		placeholder: 'Date and time in UTC',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: [UI_RESOURCES.AVAILABILITY_EXCEPTIONS],
				operation: [UI_OPERATIONS.GET_MANY],
			},
		},
		description: 'Start date and time for the query range. <a href="https://www.sharetribe.com/api-reference/integration.html#query-availability-exceptions" target="_blank">Learn more</a>.',
		hint: '366 days past to 366 days future',
	},
	{
		displayName: 'End',
		name: 'end',
		type: 'dateTime',
		validateType: 'dateTime',
		placeholder: 'Date and time in UTC',
		default: '',
		required: true,
		displayOptions: {
			show: {
				resource: [UI_RESOURCES.AVAILABILITY_EXCEPTIONS],
				operation: [UI_OPERATIONS.GET_MANY],
			},
		},
		description: 'End date and time for the query range. <a href="https://www.sharetribe.com/api-reference/integration.html#query-availability-exceptions" target="_blank">Learn more</a>.',
		hint: 'After start, max 366 days future, max 366 days after start',
	},
];
