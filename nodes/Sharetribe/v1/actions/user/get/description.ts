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

export const userGetDescription: UserProperties = [
	makeResourceIdField(UI_RESOURCES.USER, UI_OPERATIONS.GET, {
		displayName: 'User ID',
		name: 'userId',
		description: "User's ID",
	}),
	makeSimplifyField(UI_RESOURCES.USER, UI_OPERATIONS.GET),
	makeFieldsToReturnField(UI_RESOURCES.USER, UI_OPERATIONS.GET, {
		name: 'userFields',
		defaults: [...RESOURCE_DEFAULTS.user],
		options: USER_RELATIONSHIP_OPTIONS,
	}),
];
