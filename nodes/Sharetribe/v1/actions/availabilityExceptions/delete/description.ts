import type { AvailabilityExceptionProperties } from '../../Interfaces';

import {
	UI_RESOURCES,
	UI_OPERATIONS,
	makeSimplifyField,
	makeResourceIdField,
} from '../../../helpers/Sharetribe';

export const availabilityExceptionDeleteDescription: AvailabilityExceptionProperties = [
	makeResourceIdField(UI_RESOURCES.AVAILABILITY_EXCEPTIONS, UI_OPERATIONS.DELETE, {
		displayName: 'Exception ID',
		name: 'exceptionId',
		description: 'ID of the availability exception to delete',
	}),
	{
		...makeSimplifyField(UI_RESOURCES.AVAILABILITY_EXCEPTIONS, UI_OPERATIONS.DELETE),
		description: 'Whether to return a simplified response with just {deleted: true}',
	},
];
