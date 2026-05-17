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
	{
		displayName:
			'Available in DEV and TEST <a href="https://www.sharetribe.com/docs/concepts/sharetribe-environments/">environments</a>. For LIVE environments an <a href="https://www.sharetribe.com/docs/how-to/emails-and-notifications/set-up-outgoing-email-settings/#using-your-own-sendgrid-account">own Sendgrid account</a> must be in use. <a href="https://www.sharetribe.com/api-reference/integration.html#verify-email-address">Learn more</a>.',
		name: 'notice',
		type: 'notice',
		displayOptions: {
			show: {
				resource: [UI_RESOURCES.USER],
				operation: [UI_OPERATIONS.VERIFY_EMAIL],
			},
		},
		default: '',
	},
	makeResourceIdField(UI_RESOURCES.USER, UI_OPERATIONS.VERIFY_EMAIL, {
		displayName: 'User ID',
		name: 'userId',
		description: "User's UUID",
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
			"Email address to verify. Must match the user's primary 'email' or 'pendingEmail' (case-insensitive).",
	},
	makeSimplifyField(UI_RESOURCES.USER, UI_OPERATIONS.VERIFY_EMAIL),
	makeFieldsToReturnField(UI_RESOURCES.USER, UI_OPERATIONS.VERIFY_EMAIL, {
		name: 'userFields',
		defaults: [...RESOURCE_DEFAULTS.user],
		options: USER_RELATIONSHIP_OPTIONS,
	}),
];
