import type { ListingProperties } from '../../Interfaces';
import {
	UI_OPERATIONS,
	UI_RESOURCES,
	RESOURCE_DEFAULTS,
	makeSimplifyField,
	makeResourceIdField,
	makeFieldsToReturnField,
	makeRelatedFieldsToReturn,
} from '../../../helpers/Sharetribe';

export const listingOpenDescription: ListingProperties = [
	makeResourceIdField(UI_RESOURCES.LISTING, UI_OPERATIONS.OPEN, {
		displayName: 'Listing ID',
		name: 'listingId',
		description: 'ID of the listing to open',
	}),
	makeSimplifyField(UI_RESOURCES.LISTING, UI_OPERATIONS.OPEN),
	makeFieldsToReturnField(UI_RESOURCES.LISTING, UI_OPERATIONS.OPEN, {
		name: 'fieldsToReturn',
		defaults: [...RESOURCE_DEFAULTS.listing],
		loadOptionsMethod: 'getListingFieldOptions',
	}),
	makeRelatedFieldsToReturn(UI_RESOURCES.LISTING, UI_OPERATIONS.OPEN, {
		displayName: 'Author Fields to Return',
		name: 'authorFields',
		defaults: ['firstName', 'lastName', 'email'],
		loadOptionsMethod: 'getUserFieldOptions',
		conditionalOn: { field: 'fieldsToReturn', values: ['author'] },
	}),
];
