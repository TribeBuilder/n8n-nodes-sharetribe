import type { TransactionProperties } from '../../Interfaces';
import {
	UI_OPERATIONS,
	UI_RESOURCES,
	TRANSACTION_RELATIONSHIP_OPTIONS,
	RESOURCE_DEFAULTS,
	makeSimplifyField,
	makeReturnAllField,
	makeCountOnlyField,
	makeLimitField,
	makeFieldsToReturnField,
	makeRelatedFieldsToReturn,
} from '../../../helpers/Sharetribe';
import { filterDescriptionTransaction } from '../filterDescription';
import { sortDescriptionTransaction } from '../sortDescription';

export const transactionQueryDescription: TransactionProperties = [
	makeReturnAllField(UI_RESOURCES.TRANSACTION, UI_OPERATIONS.GET_MANY),
	makeCountOnlyField(UI_RESOURCES.TRANSACTION, UI_OPERATIONS.GET_MANY, 'transaction'),
	makeLimitField(UI_RESOURCES.TRANSACTION, UI_OPERATIONS.GET_MANY),
	makeSimplifyField(UI_RESOURCES.TRANSACTION, UI_OPERATIONS.GET_MANY),
	makeFieldsToReturnField(UI_RESOURCES.TRANSACTION, UI_OPERATIONS.GET_MANY, {
		name: 'transactionFields',
		defaults: [...RESOURCE_DEFAULTS.transaction],
		options: TRANSACTION_RELATIONSHIP_OPTIONS,
	}),
	makeRelatedFieldsToReturn(UI_RESOURCES.TRANSACTION, UI_OPERATIONS.GET_MANY, {
		displayName: 'Listing Fields to Return',
		name: 'listingFields',
		defaults: ['title', 'state'],
		loadOptionsMethod: 'getListingFieldOptions',
		conditionalOn: { field: 'transactionFields', values: ['listing'] },
	}),
	makeRelatedFieldsToReturn(UI_RESOURCES.TRANSACTION, UI_OPERATIONS.GET_MANY, {
		displayName: 'User Fields to Return',
		name: 'userFields',
		defaults: ['firstName', 'lastName', 'email'],
		loadOptionsMethod: 'getUserFieldOptions',
		conditionalOn: { field: 'listingFields', values: ['author'] },
		hide: { transactionFields: ['customer', 'provider'] },
		description: 'Which listing author fields to return. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
	}),
	makeRelatedFieldsToReturn(UI_RESOURCES.TRANSACTION, UI_OPERATIONS.GET_MANY, {
		displayName: 'User Fields to Return',
		name: 'userFields',
		defaults: ['firstName', 'lastName', 'email'],
		loadOptionsMethod: 'getUserFieldOptions',
		conditionalOn: { field: 'transactionFields', values: ['customer', 'provider'] },
		hide: { listingFields: ['author'] },
		description: 'Which customer/provider fields to return. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
	}),
	{
		displayName: 'User Fields to Return',
		name: 'userFields',
		type: 'multiOptions',
		default: ['firstName', 'lastName', 'email'],
		typeOptions: { loadOptionsMethod: 'getUserFieldOptions' },
		displayOptions: {
			show: {
				resource: [UI_RESOURCES.TRANSACTION],
				operation: [UI_OPERATIONS.GET_MANY],
				simplify: [false],
				transactionFields: ['customer', 'provider'],
				listingFields: ['author'],
			},
		},
		description:
			'Which author/customer/provider fields to return. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
	},

	...filterDescriptionTransaction,
	...sortDescriptionTransaction,
];
