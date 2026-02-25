import type { StockProperties } from '../../Interfaces';
import {
	UI_OPERATIONS,
	UI_RESOURCES,
	STOCK_RELATIONSHIPS,
	makeSimplifyField,
	makeResourceIdField,
	makeReturnAllField,
	makeCountOnlyField,
	makeLimitField,
	makeFieldsToReturnField,
	makeRelatedFieldsToReturn,
} from '../../../helpers/Sharetribe';

export const stockQueryDescription: StockProperties = [
	makeResourceIdField(UI_RESOURCES.STOCK, UI_OPERATIONS.GET_MANY, {
		displayName: 'Listing ID',
		name: 'listingId',
		description: 'The ID of the listing',
	}),
	makeReturnAllField(UI_RESOURCES.STOCK, UI_OPERATIONS.GET_MANY),
	makeCountOnlyField(UI_RESOURCES.STOCK, UI_OPERATIONS.GET_MANY, 'stock adjustment'),
	makeLimitField(UI_RESOURCES.STOCK, UI_OPERATIONS.GET_MANY),
	makeSimplifyField(UI_RESOURCES.STOCK, UI_OPERATIONS.GET_MANY),
	makeFieldsToReturnField(UI_RESOURCES.STOCK, UI_OPERATIONS.GET_MANY, {
		name: 'stockFields',
		defaults: ['at', 'quantity'],
		options: [
			{ name: 'Adjustment Time', value: 'at', description: 'When the adjustment takes effect' },
			{ name: 'Quantity', value: 'quantity', description: 'Adjustment quantity' },
			{ name: 'Listing', value: STOCK_RELATIONSHIPS.LISTING, description: 'Include listing details' },
			{ name: 'Stock Reservation', value: STOCK_RELATIONSHIPS.STOCK_RESERVATION, description: 'The stock reservation that created the adjustment' },
			{ name: 'Transaction', value: STOCK_RELATIONSHIPS.STOCK_RESERVATION_TRANSACTION, description: 'The transaction that created the stock reservation' },
		],
	}),
	makeRelatedFieldsToReturn(UI_RESOURCES.STOCK, UI_OPERATIONS.GET_MANY, {
		displayName: 'Listing Fields to Return',
		name: 'listingFields',
		defaults: ['title', 'state'],
		loadOptionsMethod: 'getListingFieldOptions',
		conditionalOn: { field: 'stockFields', values: [STOCK_RELATIONSHIPS.LISTING] },
	}),
	makeRelatedFieldsToReturn(UI_RESOURCES.STOCK, UI_OPERATIONS.GET_MANY, {
		displayName: 'Transaction Fields to Return',
		name: 'transactionFields',
		defaults: ['state', 'lastTransition'],
		loadOptionsMethod: 'getTransactionFieldOptions',
		conditionalOn: { field: 'stockFields', values: [STOCK_RELATIONSHIPS.STOCK_RESERVATION_TRANSACTION] },
	}),
	makeRelatedFieldsToReturn(UI_RESOURCES.STOCK, UI_OPERATIONS.GET_MANY, {
		displayName: 'User Fields to Return',
		name: 'userFields',
		defaults: ['firstName', 'lastName', 'email'],
		loadOptionsMethod: 'getUserFieldOptions',
		conditionalOn: { field: 'listingFields', values: ['author'] },
		hide: { transactionFields: ['customer', 'provider'] },
		description: 'Which listing author fields to return. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
	}),
	makeRelatedFieldsToReturn(UI_RESOURCES.STOCK, UI_OPERATIONS.GET_MANY, {
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
				operation: [UI_OPERATIONS.GET_MANY],
				simplify: [false],
				transactionFields: ['customer', 'provider'],
				listingFields: ['author'],
			},
		},
		description:
			'Which author/customer/provider fields to return. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
	},

	{
		displayName: 'Created On or After',
		name: 'createdAtStart',
		type: 'dateTime',
		placeholder: 'Date and time in UTC',
		default: '',
		required: true,
		validateType: 'dateTime',
		displayOptions: {
			show: {
				resource: [UI_RESOURCES.STOCK],
				operation: [UI_OPERATIONS.GET_MANY],
			},
		},
		description: 'Start time for the query range. <a href="https://www.sharetribe.com/api-reference/integration.html#query-stock-adjustments" target="_blank">Learn more</a>.',
		hint: '366 days in the past to 1 day in the future',
	},
	{
		displayName: 'Created Before',
		name: 'createdAtEnd',
		type: 'dateTime',
		placeholder: 'Date and time in UTC',
		default: '',
		required: true,
		validateType: 'dateTime',
		displayOptions: {
			show: {
				resource: [UI_RESOURCES.STOCK],
				operation: [UI_OPERATIONS.GET_MANY],
			},
		},
		description: 'End time for the query range. <a href="https://www.sharetribe.com/api-reference/integration.html#query-stock-adjustments" target="_blank">Learn more</a>.',
		hint: 'After start, max 1 day future, max 366 days from start',
	},
];
