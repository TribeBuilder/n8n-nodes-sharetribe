import type { StockProperties } from '../../Interfaces';

import { UI_OPERATIONS, UI_RESOURCES } from '../../../helpers/Sharetribe';

const STOCK_MODE = {
	ADJUST_QUANTITY: 'adjustQuantity',
} as const;

export const stockAdjustDescription: StockProperties = [
	{
		displayName: 'Listing ID',
		name: 'listingId',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g. 550e8400-e29b-41d4-a716-446655440000',
		displayOptions: {
			show: {
				resource: [UI_RESOURCES.STOCK],
				operation: [UI_OPERATIONS.UPDATE_STOCK_QUANTITY],
				mode: [STOCK_MODE.ADJUST_QUANTITY],
			},
		},
		description: 'ID of the listing to create stock adjustment for',
	},
	{
		displayName: 'Simplify',
		name: 'simplify',
		type: 'boolean',
		default: true,
		displayOptions: {
			show: {
				resource: [UI_RESOURCES.STOCK],
				operation: [UI_OPERATIONS.UPDATE_STOCK_QUANTITY],
				mode: [STOCK_MODE.ADJUST_QUANTITY],
			},
		},
		description: 'Whether to return a simplified version of the response',
	},
	{
		displayName: 'Fields to Return',
		name: 'stockFields',
		type: 'multiOptions',
		default: ['listing'],
		options: [
			{
				name: 'Listing',
				value: 'listing',
				description: 'Include listing details',
			},
		],
		displayOptions: {
			show: {
				resource: [UI_RESOURCES.STOCK],
				operation: [UI_OPERATIONS.UPDATE_STOCK_QUANTITY],
				mode: [STOCK_MODE.ADJUST_QUANTITY],
				simplify: [false],
			},
		},
		description:
			'Which fields to return. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
	},
	{
		displayName: 'Listing Fields to Return',
		name: 'listingFields',
		type: 'multiOptions',
		default: ['title', 'state', 'currentStock'],
		typeOptions: {
			loadOptionsMethod: 'getListingFieldOptions',
		},
		displayOptions: {
			show: {
				resource: [UI_RESOURCES.STOCK],
				operation: [UI_OPERATIONS.UPDATE_STOCK_QUANTITY],
				mode: [STOCK_MODE.ADJUST_QUANTITY],
				simplify: [false],
				stockFields: ['listing'],
			},
		},
		description:
			'Which listing fields to return. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
	},
	{
		displayName: 'User Fields to Return',
		name: 'userFields',
		type: 'multiOptions',
		default: ['firstName', 'lastName', 'email'],
		typeOptions: {
			loadOptionsMethod: 'getUserFieldOptions',
		},
		displayOptions: {
			show: {
				resource: [UI_RESOURCES.STOCK],
				operation: [UI_OPERATIONS.UPDATE_STOCK_QUANTITY],
				mode: [STOCK_MODE.ADJUST_QUANTITY],
				simplify: [false],
				listingFields: ['author'],
			},
		},
		description:
			'Which listing author fields to return. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
	},

	{
		displayName: 'Adjust By',
		name: 'quantity',
		type: 'number',
		typeOptions: { numberPrecision: 0 },
		required: true,
		default: 1,
		displayOptions: {
			show: {
				resource: [UI_RESOURCES.STOCK],
				operation: [UI_OPERATIONS.UPDATE_STOCK_QUANTITY],
				mode: [STOCK_MODE.ADJUST_QUANTITY],
			},
		},
		description:
			'Quantity to adjust stock by (positive to increase, negative to decrease). Cannot be 0. <a href="https://www.sharetribe.com/api-reference/integration.html#create-stock-adjustment" target="_blank">Learn more</a>',
		hint: 'Non-zero integer (e.g., 5 adds 5, -3 removes 3)',
	},
];
