import type { UserProperties } from '../../Interfaces';
import {
	UI_OPERATIONS,
	UI_RESOURCES,
	USER_RELATIONSHIP_OPTIONS,
	RESOURCE_DEFAULTS,
	makeSimplifyField,
	makeResourceIdField,
	makeFieldsToReturnField,
} from '../../../helpers/Sharetribe';

export const updatePermissionsDescription: UserProperties = [
	makeResourceIdField(UI_RESOURCES.USER, UI_OPERATIONS.UPDATE_PERMISSIONS, {
		displayName: 'User ID',
		name: 'userId',
		description: "User's ID",
	}),
	makeSimplifyField(UI_RESOURCES.USER, UI_OPERATIONS.UPDATE_PERMISSIONS),
	makeFieldsToReturnField(UI_RESOURCES.USER, UI_OPERATIONS.UPDATE_PERMISSIONS, {
		name: 'userFields',
		defaults: [...RESOURCE_DEFAULTS.user],
		options: USER_RELATIONSHIP_OPTIONS,
	}),
	{
		displayName: 'Permissions to Update',
		name: 'permissionsToUpdate',
		type: 'multiOptions',
		default: ['canRead', 'canCreateListings', 'canInitiateTransactions'],
		displayOptions: {
			show: {
				resource: [UI_RESOURCES.USER],
				operation: [UI_OPERATIONS.UPDATE_PERMISSIONS],
			},
		},
		options: [
			{
				name: 'Read Data',
				value: 'canRead',
			},
			{
				name: 'Create Listings',
				value: 'canCreateListings',
			},
			{
				name: 'Initiate Transactions',
				value: 'canInitiateTransactions',
			},
		],
		description:
			'Select which permissions to update. Denying permissions is only effective with corresponding console configured access control. <a href="https://www.sharetribe.com/help/en/collections/8975285-permissions" target="_blank">Learn more</a>.',
	},
	{
		displayName: 'Can Read Data',
		name: 'canRead',
		type: 'boolean',
		default: true,
		displayOptions: {
			show: {
				resource: [UI_RESOURCES.USER],
				operation: [UI_OPERATIONS.UPDATE_PERMISSIONS],
				permissionsToUpdate: ['canRead'],
			},
		},
		description: 'Whether this user is allowed to view listings and related data (read permission)',
	},
	{
		displayName: 'Can Create Listings',
		name: 'canCreateListings',
		type: 'boolean',
		default: true,
		displayOptions: {
			show: {
				resource: [UI_RESOURCES.USER],
				operation: [UI_OPERATIONS.UPDATE_PERMISSIONS],
				permissionsToUpdate: ['canCreateListings'],
			},
		},
		description: 'Whether this user is allowed to create listings (postListings permission)',
	},
	{
		displayName: 'Can Initiate Transactions',
		name: 'canInitiateTransactions',
		type: 'boolean',
		default: true,
		displayOptions: {
			show: {
				resource: [UI_RESOURCES.USER],
				operation: [UI_OPERATIONS.UPDATE_PERMISSIONS],
				permissionsToUpdate: ['canInitiateTransactions'],
			},
		},
		description:
			'Whether this user is allowed to initiate transactions (initiateTransactions permission)',
	},
];
