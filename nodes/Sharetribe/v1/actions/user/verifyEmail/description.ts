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

export const verifyEmailDescription: UserProperties = [
	makeResourceIdField(UI_RESOURCES.USER, UI_OPERATIONS.VERIFY_EMAIL, {
		displayName: 'User ID',
		name: 'userId',
		description:
			"Mark a user's email address as verified without requiring them to click the verification link.",
	}),
	{
		displayName: 'Email Address',
		name: 'userEmail',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: [UI_RESOURCES.USER],
				operation: [UI_OPERATIONS.VERIFY_EMAIL],
			},
		},
		default: '',
		placeholder: 'e.g. user@example.com',
		description:
			"Email address to verify. Must match the user's primary <code>email</code> or <code>pendingEmail</code> (case-insensitive).",
	},
	makeSimplifyField(UI_RESOURCES.USER, UI_OPERATIONS.VERIFY_EMAIL),
	makeFieldsToReturnField(UI_RESOURCES.USER, UI_OPERATIONS.VERIFY_EMAIL, {
		name: 'userFields',
		defaults: [...RESOURCE_DEFAULTS.user],
		options: USER_RELATIONSHIP_OPTIONS,
	}),
];
