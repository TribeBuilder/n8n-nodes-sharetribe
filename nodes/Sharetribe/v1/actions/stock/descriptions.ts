import type { INodeProperties } from 'n8n-workflow';

import * as getMany from './getAdjustments';
import * as adjust from './adjustQuantity';
import * as compareAndSet from './compareAndSet';
import * as getReservation from './getReservation';

import { UI_OPERATIONS, UI_RESOURCES } from '../../helpers/Sharetribe';

const STOCK_MODE = {
	ADJUST_QUANTITY: 'adjustQuantity',
	COMPARE_AND_SET: 'compareAndSet',
} as const;

export { getMany, adjust, compareAndSet, getReservation };

export const descriptions: INodeProperties[] = [
	// eslint-disable-next-line n8n-nodes-base/node-param-default-missing
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: [UI_RESOURCES.STOCK],
			},
		},
		options: [
			{
				name: 'Get Stock Adjustments',
				value: UI_OPERATIONS.GET_MANY,
				description: 'Get stock adjustments for a listing with a given ID',
				action: 'Get stock adjustments',
			},
			{
				name: 'Update Stock Quantity',
				value: UI_OPERATIONS.UPDATE_STOCK_QUANTITY,
				description: 'Update the stock quantity for a listing with a given ID',
				action: 'Update stock quantity',
			},
			{
				name: 'Get Reservation',
				value: UI_OPERATIONS.GET_RESERVATION,
				description: 'Get details of a stock reservation for a given ID',
				action: 'Get a stock reservation',
			},
		],
		default: UI_OPERATIONS.GET_MANY,
	},
	// eslint-disable-next-line n8n-nodes-base/node-param-default-missing
	{
		displayName: 'Mode',
		name: 'mode',
		type: 'options',
		options: [
			{
				name: 'Adjust Quantity',
				value: STOCK_MODE.ADJUST_QUANTITY,
				description: 'Adjust stock quantity up or down',
			},
			{
				name: 'Compare and Set',
				value: STOCK_MODE.COMPARE_AND_SET,
				description: 'Set stock quantity if current quantity matches',
			},
		],
		default: STOCK_MODE.COMPARE_AND_SET,
		displayOptions: {
			show: {
				operation: [UI_OPERATIONS.UPDATE_STOCK_QUANTITY],
			},
		},
		description: 'Adjust existing or compare and set',
	},
	...getMany.stockQueryDescription,
	...adjust.stockAdjustDescription,
	...compareAndSet.stockCompareAndSetDescription,
	...getReservation.stockGetReservationDescription,
];
