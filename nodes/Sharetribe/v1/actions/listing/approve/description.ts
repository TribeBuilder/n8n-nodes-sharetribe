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

export const listingApproveDescription: ListingProperties = [
	makeResourceIdField(UI_RESOURCES.LISTING, UI_OPERATIONS.APPROVE, {
		displayName: 'Listing ID',
		name: 'listingId',
		description: 'ID of the listing to approve',
	}),
	makeSimplifyField(UI_RESOURCES.LISTING, UI_OPERATIONS.APPROVE),
	makeFieldsToReturnField(UI_RESOURCES.LISTING, UI_OPERATIONS.APPROVE, {
		name: 'fieldsToReturn',
		defaults: [...RESOURCE_DEFAULTS.listing],
		loadOptionsMethod: 'getListingFieldOptions',
	}),
	makeRelatedFieldsToReturn(UI_RESOURCES.LISTING, UI_OPERATIONS.APPROVE, {
		displayName: 'Author Fields to Return',
		name: 'authorFields',
		defaults: ['firstName', 'lastName', 'email'],
		loadOptionsMethod: 'getUserFieldOptions',
		conditionalOn: { field: 'fieldsToReturn', values: ['author'] },
	}),
];
