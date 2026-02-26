import type { INodeProperties } from 'n8n-workflow';

import * as getMany from './getMany';

export { getMany };

export const descriptions: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['event'],
			},
		},
		options: [
			{
				name: 'Get Many',
				value: 'getMany',
				description: 'Retrieve multiple events with filtering',
				action: 'Get many events',
			},
		],
		default: 'getMany',
	},

	...getMany.description,
];
