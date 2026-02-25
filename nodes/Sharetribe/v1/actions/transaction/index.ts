import type { INodeProperties } from 'n8n-workflow';

import * as get from './get';
import * as getMany from './getMany';
import * as transition from './transition';
import * as updateMetadata from './updateMetadata';

export { get, getMany, transition, updateMetadata };

export const descriptions: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['transaction'],
			},
		},
		options: [
			{
				name: 'Get',
				value: 'get',
				description: 'Retrieve a transaction by ID',
				action: 'Get a transaction',
			},
			{
				name: 'Get Many',
				value: 'getMany',
				description: 'Retrieve multiple transactions with filtering and sorting',
				action: 'Get many transactions',
			},
			{
				name: 'Transition',
				value: 'transition',
				description: 'Transition a transaction to a new state',
				action: 'Transition a transaction',
			},
			{
				name: 'Update',
				value: 'updateMetadata',
				description: 'Update transaction metadata',
				action: 'Update a transaction',
			},
		],
		default: 'get',
	},

	...get.description,
	...getMany.description,
	...transition.description,
	...updateMetadata.description,
];
