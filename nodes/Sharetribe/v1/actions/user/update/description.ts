import type { UserProperties } from '../../Interfaces';
import {
	UI_OPERATIONS,
	UI_RESOURCES,
	USER_RELATIONSHIP_OPTIONS,
	RESOURCE_DEFAULTS,
	makeSimplifyField,
	makeResourceIdField,
	makeSpeculativeField,
	makeFieldsToReturnField,
	makeFieldsToAddOrUpdate,
	makeDeleteFieldsCollection,
} from '../../../helpers/Sharetribe';
import {
	bioField,
	displayNameField,
	firstNameField,
	lastNameField,
	profileImageIdField,
	userMetadataCollectionField,
	userPrivateDataCollectionField,
	userProtectedDataCollectionField,
	userPublicDataCollectionField,
} from '../sharedFields';

export const updateProfileDescription: UserProperties = [
	makeSimplifyField(UI_RESOURCES.USER, UI_OPERATIONS.UPDATE_PROFILE),
	makeResourceIdField(UI_RESOURCES.USER, UI_OPERATIONS.UPDATE_PROFILE, {
		displayName: 'ID of User to Update',
		name: 'userId',
		description: 'ID of the user to update',
	}),
	makeSpeculativeField(
		UI_RESOURCES.USER,
		UI_OPERATIONS.UPDATE_PROFILE,
		'Whether to preview the changes without actually updating the user. Returns what the updated user would look like.',
	),
	makeFieldsToReturnField(UI_RESOURCES.USER, UI_OPERATIONS.UPDATE_PROFILE, {
		name: 'userFields',
		defaults: [...RESOURCE_DEFAULTS.user],
		options: USER_RELATIONSHIP_OPTIONS,
	}),
	makeFieldsToAddOrUpdate(UI_RESOURCES.USER, UI_OPERATIONS.UPDATE_PROFILE, {
		name: 'profileFields',
		options: [
			bioField,
			displayNameField,
			firstNameField,
			lastNameField,
			profileImageIdField,
			userMetadataCollectionField,
			userPrivateDataCollectionField,
			userProtectedDataCollectionField,
			userPublicDataCollectionField,
		],
	}),
	makeDeleteFieldsCollection(UI_RESOURCES.USER, UI_OPERATIONS.UPDATE_PROFILE, {
		dataTypes: [
			{ name: 'Public Data', value: 'publicData' },
			{ name: 'Protected Data', value: 'protectedData' },
			{ name: 'Private Data', value: 'privateData' },
			{ name: 'Metadata', value: 'metadata' },
		],
		searchListMethod: 'getUserExtendedDataFields',
		placeholder: 'e.g. someRootObject.nested',
	}),
];
