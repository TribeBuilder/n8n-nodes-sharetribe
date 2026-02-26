import type { INodeProperties } from 'n8n-workflow';

import * as get from './get';

export { get };

export const descriptions: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['asset'],
			},
		},
		options: [
			{
				name: 'Get',
				value: 'get',
				description: 'Retrieve one or more assets',
				action: 'Get an asset',
			},
		],
		default: 'get',
	},

	...get.description,
];
