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

export const approveUserDescription: UserProperties = [
	makeResourceIdField(UI_RESOURCES.USER, UI_OPERATIONS.APPROVE_USER, {
		displayName: 'User ID',
		name: 'userId',
		description:
			"Command for approving a user that is currently in pendingApproval state. The user's state is set to active.",
	}),
	makeSimplifyField(UI_RESOURCES.USER, UI_OPERATIONS.APPROVE_USER),
	makeFieldsToReturnField(UI_RESOURCES.USER, UI_OPERATIONS.APPROVE_USER, {
		name: 'userFields',
		defaults: [...RESOURCE_DEFAULTS.user],
		options: USER_RELATIONSHIP_OPTIONS,
	}),
];
