import type { ListingProperties } from '../../Interfaces';
import {
	UI_OPERATIONS,
	UI_RESOURCES,
	RESOURCE_DEFAULTS,
	makeSimplifyField,
	makeSpeculativeField,
	makeFieldsToReturnField,
	makeRelatedFieldsToReturn,
	makeFieldsToAddOrUpdate,
	makeDeleteFieldsCollection,
} from '../../../helpers/Sharetribe';
import {
	availabilityPlanField,
	descriptionField,
	geolocationField,
	imagesField,
	listingMetadataCollectionField,
	listingPrivateDataCollectionField,
	listingPublicDataCollectionField,
	priceCollectionField,
	titleField,
} from '../sharedFields';

export const listingUpdateDescription: ListingProperties = [
	makeSimplifyField(UI_RESOURCES.LISTING, UI_OPERATIONS.UPDATE),
	{
		displayName: 'Listing ID',
		name: 'listingId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: [UI_RESOURCES.LISTING],
				operation: [UI_OPERATIONS.UPDATE],
			},
		},
		default: '',
		placeholder: 'e.g. 550e8400-e29b-41d4-a716-446655440000',
		description: 'ID of the listing to update',
		hint: 'Add ID before choosing fields to update',
	},
	makeSpeculativeField(
		UI_RESOURCES.LISTING,
		UI_OPERATIONS.UPDATE,
		'Whether to preview the changes without actually updating the listing. Returns what the updated listing would look like.',
	),
	makeFieldsToReturnField(UI_RESOURCES.LISTING, UI_OPERATIONS.UPDATE, {
		name: 'fieldsToReturn',
		defaults: [...RESOURCE_DEFAULTS.listing],
		loadOptionsMethod: 'getListingFieldOptions',
	}),
	makeRelatedFieldsToReturn(UI_RESOURCES.LISTING, UI_OPERATIONS.UPDATE, {
		displayName: 'Author Fields to Return',
		name: 'authorFields',
		defaults: ['firstName', 'lastName', 'email'],
		loadOptionsMethod: 'getUserFieldOptions',
		conditionalOn: { field: 'fieldsToReturn', values: ['author'] },
	}),
	makeFieldsToAddOrUpdate(UI_RESOURCES.LISTING, UI_OPERATIONS.UPDATE, {
		name: 'listingFields',
		options: [
			titleField,
			availabilityPlanField,
			descriptionField,
			geolocationField,
			imagesField,
			listingMetadataCollectionField,
			listingPrivateDataCollectionField,
			listingPublicDataCollectionField,
			priceCollectionField,
		],
	}),
	makeDeleteFieldsCollection(UI_RESOURCES.LISTING, UI_OPERATIONS.UPDATE, {
		dataTypes: [
			{ name: 'Public Data', value: 'publicData' },
			{ name: 'Private Data', value: 'privateData' },
			{ name: 'Metadata', value: 'metadata' },
		],
		searchListMethod: 'getListingExtendedDataFields',
		placeholder: 'e.g. location.address.city',
	}),
];
