import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import {
	Sharetribe,
	ENDPOINTS,
	DEFAULT_QUERY_LIMIT,
	generateExecutionSummary,
} from '../../../helpers/Sharetribe';
import { DateTime } from 'luxon';
import { StockAdjustmentsQueryBuilder } from './Builder';

export async function execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
	const returnData: INodeExecutionData[] = [];

	const listingId = this.getNodeParameter('listingId', 0) as string;
	const createdAtStart = this.getNodeParameter('createdAtStart', 0) as DateTime;
	const createdAtEnd = this.getNodeParameter('createdAtEnd', 0) as DateTime;
	const simplify = this.getNodeParameter('simplify', 0, true) as boolean;
	const stockFields = simplify ? [] : (this.getNodeParameter('stockFields', 0, []) as string[]);
	const listingFields = simplify ? [] : (this.getNodeParameter('listingFields', 0, []) as string[]);
	const transactionFields = simplify
		? []
		: (this.getNodeParameter('transactionFields', 0, []) as string[]);
	const userFields = simplify ? [] : (this.getNodeParameter('userFields', 0, []) as string[]);

	// Build query params using fluent builder
	const { qs, resultOptions } = new StockAdjustmentsQueryBuilder(this)
		.withOptions({
			nodeOptions: { outputFields: { stockFields, listingFields, transactionFields, userFields } },
			simplify,
			returnAll: this.getNodeParameter('returnAll', 0, false) as boolean,
			limit: this.getNodeParameter('limit', 0, DEFAULT_QUERY_LIMIT) as number,
		})
		.withListingId(listingId)
		.withTimeRange(createdAtStart, createdAtEnd)
		.build();

	// Execute API request
	const sharetribe = new Sharetribe(this);
	const { data, meta } = await sharetribe.query(
		ENDPOINTS.STOCK_ADJUSTMENTS_QUERY,
		qs,
		resultOptions,
	);

	returnData.push(...data);

	// Add execution hints
	const summary = generateExecutionSummary(this, returnData.length, meta);
	this.addExecutionHints({
		message: summary,
		location: 'outputPane',
	});

	return [returnData];
}

export { execute as query };
