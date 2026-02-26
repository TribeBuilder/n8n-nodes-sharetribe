import type { ListingProperties } from '../../Interfaces';
import {
	LISTING_RELATIONSHIP_OPTIONS,
	RESOURCE_DEFAULTS,
	UI_OPERATIONS,
	UI_RESOURCES,
	makeSimplifyField,
	makeResourceIdField,
	makeFieldsToReturnField,
	makeRelatedFieldsToReturn,
} from '../../../helpers/Sharetribe';

export const listingGetDescription: ListingProperties = [
	makeResourceIdField(UI_RESOURCES.LISTING, UI_OPERATIONS.GET, {
		displayName: 'Listing ID',
		name: 'listingId',
		description: "Listing's ID",
	}),
	makeSimplifyField(UI_RESOURCES.LISTING, UI_OPERATIONS.GET),
	makeFieldsToReturnField(UI_RESOURCES.LISTING, UI_OPERATIONS.GET, {
		name: 'listingFields',
		defaults: [...RESOURCE_DEFAULTS.listing],
		options: LISTING_RELATIONSHIP_OPTIONS,
	}),
	makeRelatedFieldsToReturn(UI_RESOURCES.LISTING, UI_OPERATIONS.GET, {
		displayName: 'Author Fields to Return',
		name: 'authorFields',
		defaults: ['firstName', 'lastName', 'email'],
		loadOptionsMethod: 'getUserFieldOptions',
		conditionalOn: { field: 'listingFields', values: ['author'] },
	}),
];
