import type { INodeProperties } from 'n8n-workflow';

import * as get from './getName';

export { get };

export const descriptions: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['marketplace'],
			},
		},
		options: [
			{
				name: 'Get Marketplace Name',
				value: 'get',
				description: "Retrieve the marketplace's name",
				action: 'Get marketplace name',
			},
		],
		default: 'get',
	},

	...get.description,
];
