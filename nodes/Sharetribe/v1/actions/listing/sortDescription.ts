import { INodeProperties } from 'n8n-workflow';

import { UI_OPERATIONS, UI_RESOURCES } from '../../helpers/Sharetribe';

export const sortDescriptionListing: INodeProperties[] = [
	{
		displayName: 'Sort',
		name: 'sort',
		type: 'fixedCollection',
		placeholder: 'Add Sort Rule',
		description:
			'Up to 3 sort options can be added. Note: When Origin filter is used, results are automatically sorted by distance and custom sort options are disabled. <a href="https://www.sharetribe.com/api-reference/integration.html#controlling-sorting-of-listings" target="_blank">Learn more</a>',
		typeOptions: {
			multipleValues: true,
			maxAllowedFields: 3,
			sortable: true,
		},
		displayOptions: {
			show: {
				resource: [UI_RESOURCES.LISTING],
				operation: [UI_OPERATIONS.GET_MANY],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Sort Rule',
				name: 'sort',
				// eslint-disable-next-line n8n-nodes-base/node-param-fixed-collection-type-unsorted-items
				values: [
					{
						// eslint-disable-next-line n8n-nodes-base/node-param-display-name-wrong-for-dynamic-options
						displayName: 'Field Name',
						name: 'field',
						noDataExpression: true,
						type: 'options',
						typeOptions: {
							loadOptionsMethod: 'getListingSortFields',
							loadOptionsDependsOn: ['filterOptions'],
						},
						// eslint-disable-next-line n8n-nodes-base/node-param-default-wrong-for-options
						default: 'createdAt',
						description:
							'The sorting field (keywords/origin filters auto-apply their respective sorts). Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
					},
					{
						displayName: 'Direction',
						name: 'direction',
						noDataExpression: true,
						type: 'options',
						options: [
							{
								name: 'Ascending',
								value: 'ASC',
							},
							{
								name: 'Descending',
								value: 'DESC',
							},
						],
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
							show: { field: ['publicData', 'metadata'] },
						},
					},
				],
			},
		],
	},
];
