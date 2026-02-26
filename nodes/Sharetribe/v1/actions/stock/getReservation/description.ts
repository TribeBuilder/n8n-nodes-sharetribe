import type { INodeProperties } from 'n8n-workflow';
import {
	UI_RESOURCES,
	UI_OPERATIONS,
	makeSimplifyField,
	makeResourceIdField,
	makeFieldsToReturnField,
	makeRelatedFieldsToReturn,
} from '../../../helpers/Sharetribe';

export const stockGetReservationDescription: INodeProperties[] = [
	makeResourceIdField(UI_RESOURCES.STOCK, UI_OPERATIONS.GET_RESERVATION, {
		displayName: 'Stock Reservation ID',
		name: 'stockReservationId',
		description: 'The ID of the stock reservation to show',
	}),
	makeSimplifyField(UI_RESOURCES.STOCK, UI_OPERATIONS.GET_RESERVATION),
	makeFieldsToReturnField(UI_RESOURCES.STOCK, UI_OPERATIONS.GET_RESERVATION, {
		name: 'stockFields',
		defaults: ['quantity', 'state'],
		options: [
			{ name: 'Listing', value: 'listing', description: 'Include listing details' },
			{ name: 'Quantity', value: 'quantity', description: 'The quantity of reserved stock' },
			{ name: 'State', value: 'state', description: 'The state of the stock reservation' },
			{ name: 'Stock Adjustments', value: 'stockAdjustments', description: 'Include stock adjustments' },
			{ name: 'Transaction', value: 'transaction', description: 'Include transaction details' },
		],
	}),
	makeRelatedFieldsToReturn(UI_RESOURCES.STOCK, UI_OPERATIONS.GET_RESERVATION, {
		displayName: 'Listing Fields to Return',
		name: 'listingFields',
		defaults: ['title', 'state'],
		loadOptionsMethod: 'getListingFieldOptions',
		conditionalOn: { field: 'stockFields', values: ['listing'] },
	}),
	makeRelatedFieldsToReturn(UI_RESOURCES.STOCK, UI_OPERATIONS.GET_RESERVATION, {
		displayName: 'Transaction Fields to Return',
		name: 'transactionFields',
		defaults: ['state', 'lastTransition'],
		loadOptionsMethod: 'getTransactionFieldOptions',
		conditionalOn: { field: 'stockFields', values: ['transaction'] },
	}),
	makeRelatedFieldsToReturn(UI_RESOURCES.STOCK, UI_OPERATIONS.GET_RESERVATION, {
		displayName: 'User Fields to Return',
		name: 'userFields',
		defaults: ['firstName', 'lastName', 'email'],
		loadOptionsMethod: 'getUserFieldOptions',
		conditionalOn: { field: 'listingFields', values: ['author'] },
		hide: { transactionFields: ['customer', 'provider'] },
		description: 'Which listing author fields to return. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
	}),
	makeRelatedFieldsToReturn(UI_RESOURCES.STOCK, UI_OPERATIONS.GET_RESERVATION, {
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
				resource: [UI_RESOURCES.STOCK],
				operation: [UI_OPERATIONS.GET_RESERVATION],
				simplify: [false],
				transactionFields: ['customer', 'provider'],
				listingFields: ['author'],
			},
		},
		description:
			'Which author/customer/provider fields to return. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
	},
];
