import type { INodeProperties } from 'n8n-workflow';
import { createExtendedDataFilter, UI_OPERATIONS, UI_RESOURCES } from '../../helpers/Sharetribe';

export const filterDescriptionUser: INodeProperties[] = [
	{
		displayName: 'Filters',
		name: 'filterOptions',
		type: 'collection',
		placeholder: 'Add Filter',
		displayOptions: {
			show: {
				resource: [UI_RESOURCES.USER],
				operation: [UI_OPERATIONS.GET_MANY],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Created Before',
				name: 'createdAtEnd',
				type: 'dateTime',
				validateType: 'dateTime',
				placeholder: 'Date and time in UTC',
				default: '',
				description: 'Filter users created before this date',
			},
			{
				displayName: 'Created After',
				name: 'createdAtStart',
				type: 'dateTime',
				validateType: 'dateTime',
				placeholder: 'Date and time in UTC',
				default: '',
				description: 'Filter users created after this date',
			},
			{
				displayName: 'User Type',
				name: 'userType',
				type: 'resourceLocator',
				noDataExpression: true,
				default: { mode: 'list', value: '' },
				description: 'Filter by user type (e.g., customer, provider)',
				modes: [
					{
						displayName: 'From List',
						name: 'list',
						type: 'list',
						placeholder: 'Select user type',
						typeOptions: {
							searchListMethod: 'getUserTypes',
							searchable: true,
						},
					},
					{
						displayName: 'By Name',
						name: 'name',
						type: 'string',
						placeholder: 'customer',
						hint: 'Enter the user type name',
					},
				],
			},
			createExtendedDataFilter('metadata'),
			createExtendedDataFilter('privateData'),
			createExtendedDataFilter('protectedData'),
			createExtendedDataFilter('publicData'),
		],
	},
];
