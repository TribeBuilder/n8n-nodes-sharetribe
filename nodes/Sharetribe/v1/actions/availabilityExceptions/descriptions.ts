import type { INodeProperties } from 'n8n-workflow';

import * as getMany from './getMany';
import * as create from './create';
import * as deleteException from './delete';

import { UI_OPERATIONS, UI_RESOURCES } from '../../helpers/Sharetribe';

export { getMany, create, deleteException };

export const descriptions: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		default: UI_OPERATIONS.GET_MANY.toString(),
		displayOptions: {
			show: {
				resource: [UI_RESOURCES.AVAILABILITY_EXCEPTIONS],
			},
		},
		options: [
			{
				name: 'Get Many',
				value: UI_OPERATIONS.GET_MANY,
				description: 'Get many availability exceptions for a listing',
				action: 'Get availability exceptions',
			},
			{
				name: 'Create',
				value: UI_OPERATIONS.CREATE,
				description: 'Create an availability exception',
				action: 'Create an availability exception',
			},
			{
				name: 'Delete',
				value: UI_OPERATIONS.DELETE,
				description: 'Delete an availability exception',
				action: 'Delete an availability exception',
			},
		],
	},

	...getMany.availabilityExceptionGetManyDescription,
	...create.availabilityExceptionCreateDescription,
	...deleteException.availabilityExceptionDeleteDescription,
];
