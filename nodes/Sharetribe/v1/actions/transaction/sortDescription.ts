import type { INodeProperties } from 'n8n-workflow';

import {
	UI_OPERATIONS,
	UI_RESOURCES,
	TRANSACTION_SORT_FIELDS_ARRAY,
	SORT_DIRECTION_OPTIONS_ARRAY,
} from '../../helpers/Sharetribe';

/**
 * Creates the sort options fixed collection for transaction queries
 * This centralizes the sort configuration to keep description files clean
 */
export const sortDescriptionTransaction: INodeProperties[] = [
	{
		displayName: 'Sort',
		name: 'sort',
		type: 'fixedCollection',
		description: 'Up to 3 sort options can be added. <a href="https://www.sharetribe.com/api-reference/integration.html#transaction-sorting" target="_blank">Learn more</a>.',
		placeholder: 'Add Sort Rule',
		typeOptions: {
			multipleValues: true,
			maxAllowedFields: 3,
			sortable: true,
		},
		displayOptions: {
			show: {
				resource: [UI_RESOURCES.TRANSACTION],
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
						name: 'field',
						noDataExpression: true,
						type: 'options',
						options: [...TRANSACTION_SORT_FIELDS_ARRAY],
						default: '',
						description: 'The field to sort by. Sort fields can be re-ordered.',
					},
					{
						displayName: 'Direction',
						name: 'direction',
						noDataExpression: true,
						type: 'options',
						options: [...SORT_DIRECTION_OPTIONS_ARRAY],
						default: '',
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
						name: 'protectedDataAttributeName',
						noDataExpression: true,
						type: 'resourceLocator',
						default: { mode: 'list', value: '' },
						description: 'Select the protected data field to sort by',
						modes: [
							{
								displayName: 'From List',
								name: 'list',
								type: 'list',
								placeholder: 'Select field',
								typeOptions: {
									searchListMethod: 'getSortableProtectedDataAttributes',
									searchable: true,
								},
							},
							{
								displayName: 'By Name',
								name: 'name',
								type: 'string',
								placeholder: 'e.g. fieldName',
								hint: 'Enter the top-level protected data field name (numbers only)',
							},
						],
						displayOptions: {
							show: { field: ['protectedData'] },
						},
					},
					{
						displayName:
							'Sort options for Extended Data must be defined with the <a href="https://www.sharetribe.com/docs/how-to/manage-search-schemas-with-sharetribe-cli/" target="_blank">Sharetribe CLI</a> and are only valid for numbers.',
						name: 'notice',
						type: 'notice',
						default: '',
						displayOptions: {
							show: { field: ['metadata', 'protectedData'] },
						},
					},
				],
			},
		],
	},
];
