import type { INodeProperties } from 'n8n-workflow';

import {
	UI_OPERATIONS,
	UI_RESOURCES,
	COMMON_SORT_FIELDS_ARRAY,
	SORT_DIRECTION_OPTIONS_ARRAY,
} from '../../helpers/Sharetribe';

/**
 * Sort options fixed collection for user queries
 * This centralizes the sort configuration to keep description files clean
 */
export const sortDescriptionUser: INodeProperties[] = [
	{
		displayName: 'Sort',
		name: 'sort',
		type: 'fixedCollection',
		placeholder: 'Add Sort Rule',
		typeOptions: {
			multipleValues: true,
			maxAllowedFields: 3,
			sortable: true,
		},
		displayOptions: {
			show: {
				resource: [UI_RESOURCES.USER],
				operation: [UI_OPERATIONS.GET_MANY],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Sort',
				name: 'sort',
				// eslint-disable-next-line n8n-nodes-base/node-param-fixed-collection-type-unsorted-items
				values: [
					{
						displayName: 'Field',
						noDataExpression: true,
						name: 'field',
						type: 'options',
						options: [...COMMON_SORT_FIELDS_ARRAY],
						default: 'createdAt',
						description: 'The field to sort by. Sort fields can be re-ordered.',
					},
					{
						displayName: 'Direction',
						noDataExpression: true,
						name: 'direction',
						type: 'options',
						options: [...SORT_DIRECTION_OPTIONS_ARRAY],
						default: 'DESC',
						description: 'The sorting direction',
					},
					{
						displayName: 'Field Name',
						name: 'metadataAttributeName',
						noDataExpression: true,
						type: 'resourceLocator',
						default: { mode: 'list', value: '' },
						description: 'Select the metadata field to sort by',
						modes: [
							{
								displayName: 'From List',
								name: 'list',
								type: 'list',
								placeholder: 'Select field',
								typeOptions: {
									searchListMethod: 'getSortableMetadataAttributes',
									searchable: true,
								},
							},
							{
								displayName: 'By Name',
								name: 'name',
								type: 'string',
								placeholder: 'e.g. fieldName',
								hint: 'Enter the top-level metadata field name (numbers only)',
							},
						],
						displayOptions: {
							show: { field: ['metadata'] },
						},
					},
					{
						displayName: 'Field Name',
						name: 'privateDataAttributeName',
						noDataExpression: true,
						type: 'resourceLocator',
						default: { mode: 'list', value: '' },
						description: 'Select the private data field to sort by',
						modes: [
							{
								displayName: 'From List',
								name: 'list',
								type: 'list',
								placeholder: 'Select field',
								typeOptions: {
									searchListMethod: 'getSortablePrivateDataAttributes',
									searchable: true,
								},
							},
							{
								displayName: 'By Name',
								name: 'name',
								type: 'string',
								placeholder: 'e.g. fieldName',
								hint: 'Enter the top-level private data field name (numbers only)',
							},
						],
						displayOptions: {
							show: { field: ['privateData'] },
						},
					},
					{
						displayName: 'Field Name',
						name: 'publicDataAttributeName',
						noDataExpression: true,
						type: 'resourceLocator',
						default: { mode: 'list', value: '' },
						description: 'Select the public data field to sort by',
						modes: [
							{
								displayName: 'From List',
								name: 'list',
								type: 'list',
								placeholder: 'Select field',
								typeOptions: {
									searchListMethod: 'getSortablePublicDataAttributes',
									searchable: true,
								},
							},
							{
								displayName: 'By Name',
								name: 'name',
								type: 'string',
								placeholder: 'e.g. fieldName',
								hint: 'Enter the top-level public data field name (numbers only)',
							},
						],
						displayOptions: {
							show: { field: ['publicData'] },
						},
					},
					{
						displayName:
							'Sort options for Extended Data must be defined with the <a href="https://www.sharetribe.com/docs/how-to/manage-search-schemas-with-sharetribe-cli/" target="_blank">Sharetribe CLI</a> and are only valid for numbers.',
						name: 'notice',
						type: 'notice',
						default: '',
						displayOptions: {
							show: { field: ['publicData', 'privateData', 'metadata'] },
						},
					},
				],
			},
		],
	},
];
