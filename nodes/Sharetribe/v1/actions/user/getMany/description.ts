import type { UserProperties } from '../../Interfaces';
import {
	UI_OPERATIONS,
	UI_RESOURCES,
	USER_RELATIONSHIP_OPTIONS,
	RESOURCE_DEFAULTS,
	makeSimplifyField,
	makeReturnAllField,
	makeCountOnlyField,
	makeLimitField,
	makeFieldsToReturnField,
} from '../../../helpers/Sharetribe';
import { filterDescriptionUser } from '../filterDescription';
import { sortDescriptionUser } from '../sortDescription';

export const getManyDescription: UserProperties = [
	makeReturnAllField(UI_RESOURCES.USER, UI_OPERATIONS.GET_MANY),
	makeCountOnlyField(UI_RESOURCES.USER, UI_OPERATIONS.GET_MANY, 'user'),
	makeLimitField(UI_RESOURCES.USER, UI_OPERATIONS.GET_MANY),
	makeSimplifyField(UI_RESOURCES.USER, UI_OPERATIONS.GET_MANY),
	makeFieldsToReturnField(UI_RESOURCES.USER, UI_OPERATIONS.GET_MANY, {
		name: 'userFields',
		defaults: [...RESOURCE_DEFAULTS.user],
		options: USER_RELATIONSHIP_OPTIONS,
	}),

	...filterDescriptionUser,
	...sortDescriptionUser,
];
