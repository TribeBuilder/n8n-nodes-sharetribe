import type { UserProperties } from '../../Interfaces';
import {
	UI_OPERATIONS,
	UI_RESOURCES,
	USER_RELATIONSHIP_OPTIONS,
	RESOURCE_DEFAULTS,
	makeSimplifyField,
	makeFieldsToReturnField,
} from '../../../helpers/Sharetribe';

export const userGetDescription: UserProperties = [
	{
		displayName: 'Get By',
		name: 'lookUpBy',
		type: 'options',
		required: true,
		displayOptions: {
			show: {
				resource: [UI_RESOURCES.USER],
				operation: [UI_OPERATIONS.GET],
			},
		},
		default: 'id',
		options: [
			{
				name: 'User ID',
				value: 'id',
				description: 'Look up the user by their UUID',
			},
			{
				name: 'Email Address',
				value: 'email',
				description: 'Look up the user by their email address',
			},
		],
	},
	{
		displayName: 'User ID',
		name: 'userId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: [UI_RESOURCES.USER],
				operation: [UI_OPERATIONS.GET],
				lookUpBy: ['id'],
			},
		},
		default: '',
		placeholder: 'e.g. 550e8400-e29b-41d4-a716-446655440000',
		description: "User's UUID",
	},
	{
		displayName: 'Email Address',
		name: 'userEmail',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: [UI_RESOURCES.USER],
				operation: [UI_OPERATIONS.GET],
				lookUpBy: ['email'],
			},
		},
		default: '',
		placeholder: 'e.g. user@example.com',
		description: "User's email address",
	},
	makeSimplifyField(UI_RESOURCES.USER, UI_OPERATIONS.GET),
	makeFieldsToReturnField(UI_RESOURCES.USER, UI_OPERATIONS.GET, {
		name: 'userFields',
		defaults: [...RESOURCE_DEFAULTS.user],
		options: USER_RELATIONSHIP_OPTIONS,
	}),
];
