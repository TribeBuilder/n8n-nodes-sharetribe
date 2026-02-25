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
		displayName: 'Can Create Listings',
		name: 'canCreateListings',
		type: 'boolean',
		default: true,
		displayOptions: {
			show: {
				resource: [UI_RESOURCES.USER],
				operation: [UI_OPERATIONS.UPDATE_PERMISSIONS],
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
			},
		},
		description:
			'Whether this user is allowed to initiate transactions (initiateTransactions permission)',
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
			},
		},
		description: 'Whether this user is allowed to view listings and related data (read permission)',
	},
];
