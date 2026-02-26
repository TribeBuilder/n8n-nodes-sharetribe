import type { StockProperties } from '../../Interfaces';

import { UI_OPERATIONS, UI_RESOURCES } from '../../../helpers/Sharetribe';

const STOCK_UPDATE_MODE = {
	COMPARE_AND_SET: 'compareAndSet',
} as const;

export const stockCompareAndSetDescription: StockProperties = [
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
				mode: [STOCK_UPDATE_MODE.COMPARE_AND_SET],
			},
		},
		description: 'ID of the listing to set total stock for',
	},
	{
		displayName: 'Has Existing Stock',
		type: 'boolean',
		name: 'hasNoStockDefined',
		default: true,
		displayOptions: {
			show: {
				resource: [UI_RESOURCES.STOCK],
				operation: [UI_OPERATIONS.UPDATE_STOCK_QUANTITY],
				mode: [STOCK_UPDATE_MODE.COMPARE_AND_SET],
			},
		},
	},
	{
		displayName: 'Current Quantity',
		name: 'oldTotal',
		type: 'number',
		typeOptions: { numberPrecision: 0 },
		default: null,
		displayOptions: {
			show: {
				resource: [UI_RESOURCES.STOCK],
				operation: [UI_OPERATIONS.UPDATE_STOCK_QUANTITY],
				mode: [STOCK_UPDATE_MODE.COMPARE_AND_SET],
				hasNoStockDefined: [{ _cnd: { eq: true } }],
			},
		},
		description:
			'Expected current stock quantity. Must match for the operation to succeed (atomic compare-and-set). <a href="https://www.sharetribe.com/api-reference/integration.html#compare-and-set-total-stock" target="_blank">Learn more</a>',
		hint: 'Must match for new quantity to be set',
		placeholder: 'e.g. 10',
	},

	{
		displayName: 'New Quantity',
		name: 'newTotal',
		type: 'number',
		typeOptions: { numberPrecision: 0 },
		required: true,
		default: null,
		displayOptions: {
			show: {
				resource: [UI_RESOURCES.STOCK],
				operation: [UI_OPERATIONS.UPDATE_STOCK_QUANTITY],
				mode: [STOCK_UPDATE_MODE.COMPARE_AND_SET],
			},
		},
		description: 'New total stock quantity to set for the listing. <a href="https://www.sharetribe.com/api-reference/integration.html#compare-and-set-total-stock" target="_blank">Learn more</a>.',
		hint: 'Must be greater than zero',
		placeholder: 'e.g 15',
	},
];
