import type { ListingProperties } from '../../Interfaces';
import {
	UI_OPERATIONS,
	UI_RESOURCES,
	RESOURCE_DEFAULTS,
	makeSimplifyField,
	makeFieldsToReturnField,
	makeRelatedFieldsToReturn,
} from '../../../helpers/Sharetribe';
import {
	availabilityPlanField,
	descriptionField,
	geolocationField,
	imagesField,
	metadataField,
	priceCollectionField,
	privateDataField,
	publicDataField,
} from '../sharedFields';

export const listingCreateDescription: ListingProperties = [
	makeSimplifyField(UI_RESOURCES.LISTING, UI_OPERATIONS.CREATE),
	makeFieldsToReturnField(UI_RESOURCES.LISTING, UI_OPERATIONS.CREATE, {
		name: 'fieldsToReturn',
		defaults: [...RESOURCE_DEFAULTS.listing],
		loadOptionsMethod: 'getListingFieldOptions',
	}),
	makeRelatedFieldsToReturn(UI_RESOURCES.LISTING, UI_OPERATIONS.CREATE, {
		displayName: 'Author Fields to Return',
		name: 'authorFields',
		defaults: ['firstName', 'lastName', 'email'],
		loadOptionsMethod: 'getUserFieldOptions',
		conditionalOn: { field: 'fieldsToReturn', values: ['author'] },
	}),
	{
		displayName: 'Title',
		name: 'title',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: [UI_RESOURCES.LISTING],
				operation: [UI_OPERATIONS.CREATE],
			},
		},
		default: '',
		description: 'Title of the listing',
	},
	{
		displayName: 'Author ID',
		name: 'authorId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: [UI_RESOURCES.LISTING],
				operation: [UI_OPERATIONS.CREATE],
			},
		},
		default: '',
		placeholder: 'e.g. 550e8400-e29b-41d4-a716-446655440000',
		description: 'ID of the user to whom the listing belongs',
	},
	{
		displayName: 'State',
		name: 'state',
		type: 'options',
		required: true,
		displayOptions: {
			show: {
				resource: [UI_RESOURCES.LISTING],
				operation: [UI_OPERATIONS.CREATE],
			},
		},
		options: [
			{
				name: 'Pending Approval',
				value: 'pendingApproval',
			},
			{
				name: 'Published',
				value: 'published',
			},
		],
		default: 'pendingApproval',
		description: 'State of the listing',
	},
	{
		displayName: 'Optional Fields',
		name: 'listingFields',
		type: 'collection',
		placeholder: 'Add field',
		displayOptions: {
			show: {
				resource: [UI_RESOURCES.LISTING],
				operation: [UI_OPERATIONS.CREATE],
			},
		},
		default: {},
		options: [
			availabilityPlanField,
			descriptionField,
			geolocationField,
			imagesField,
			metadataField,
			priceCollectionField,
			privateDataField,
			publicDataField,
		],
	},
];
