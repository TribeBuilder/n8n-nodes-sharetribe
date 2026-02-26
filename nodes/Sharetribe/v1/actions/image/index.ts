import type { INodeProperties } from 'n8n-workflow';

import * as upload from './upload';

export { upload };

export const descriptions: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['image'],
			},
		},
		options: [
			{
				name: 'Upload',
				value: 'upload',
				description: 'Returned ID can be added to user or listing',
				action: 'Upload an image',
			},
		],
		default: 'upload',
	},

	...upload.description,
];
