import type { INodeProperties } from 'n8n-workflow';
import {
	makeExtendedDataCollectionField,
} from '../../helpers/Sharetribe';

export const bioField: INodeProperties = {
	displayName: 'Bio',
	name: 'bio',
	type: 'string',
	default: '',
	description: 'User bio',
};

export const displayNameField: INodeProperties = {
	displayName: 'Display Name',
	name: 'displayName',
	type: 'string',
	default: '',
	description: 'Display name for the user',
};

export const firstNameField: INodeProperties = {
	displayName: 'First Name',
	name: 'firstName',
	type: 'string',
	default: '',
	description: 'First name of the user',
};

export const lastNameField: INodeProperties = {
	displayName: 'Last Name',
	name: 'lastName',
	type: 'string',
	default: '',
	description: 'Last name of the user',
};

export const profileImageIdField: INodeProperties = {
	displayName: 'Profile Image ID',
	name: 'profileImageId',
	type: 'string',
	default: '',
	placeholder: 'e.g. 550e8400-e29b-41d4-a716-446655440000',
	description: 'ID of an uploaded image. Use the Upload Image operation to get an image ID.',
};

export const userPublicDataCollectionField: INodeProperties = makeExtendedDataCollectionField({
	dataType: 'publicData',
	displayName: 'Public Data',
	fieldHint: 'someRootObject.nested',
});

export const userProtectedDataCollectionField: INodeProperties = makeExtendedDataCollectionField({
	dataType: 'protectedData',
	displayName: 'Protected Data',
	fieldHint: 'someRootObject.nested',
});

export const userPrivateDataCollectionField: INodeProperties = makeExtendedDataCollectionField({
	dataType: 'privateData',
	displayName: 'Private Data',
	fieldHint: 'someRootObject.nested',
});

export const userMetadataCollectionField: INodeProperties = makeExtendedDataCollectionField({
	dataType: 'metadata',
	displayName: 'Metadata',
	fieldHint: 'profile.privateData.someRootObject.nested',
});

