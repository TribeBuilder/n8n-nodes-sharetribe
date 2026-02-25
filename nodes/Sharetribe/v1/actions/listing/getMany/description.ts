import type { ListingProperties } from '../../Interfaces';
import {
	UI_OPERATIONS,
	UI_RESOURCES,
	LISTING_RELATIONSHIP_OPTIONS,
	RESOURCE_DEFAULTS,
	makeSimplifyField,
	makeReturnAllField,
	makeCountOnlyField,
	makeLimitField,
	makeFieldsToReturnField,
	makeRelatedFieldsToReturn,
} from '../../../helpers/Sharetribe';
import { sortDescriptionListing } from '../sortDescription';
import { filterDescriptionListing } from '../filterDescription';

export const listingQueryDescription: ListingProperties = [
	makeReturnAllField(UI_RESOURCES.LISTING, UI_OPERATIONS.GET_MANY),
	makeCountOnlyField(UI_RESOURCES.LISTING, UI_OPERATIONS.GET_MANY, 'listing'),
	makeLimitField(UI_RESOURCES.LISTING, UI_OPERATIONS.GET_MANY),
	makeSimplifyField(UI_RESOURCES.LISTING, UI_OPERATIONS.GET_MANY),
	makeFieldsToReturnField(UI_RESOURCES.LISTING, UI_OPERATIONS.GET_MANY, {
		name: 'listingFields',
		defaults: [...RESOURCE_DEFAULTS.listing],
		options: LISTING_RELATIONSHIP_OPTIONS,
	}),
	makeRelatedFieldsToReturn(UI_RESOURCES.LISTING, UI_OPERATIONS.GET_MANY, {
		displayName: 'Author Fields to Return',
		name: 'authorFields',
		defaults: ['firstName', 'lastName', 'displayName'],
		loadOptionsMethod: 'getUserFieldOptions',
		conditionalOn: { field: 'listingFields', values: ['author'] },
	}),

	...filterDescriptionListing,
	...sortDescriptionListing,
];
