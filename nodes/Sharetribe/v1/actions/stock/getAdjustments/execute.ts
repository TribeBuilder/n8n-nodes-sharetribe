import type { IDataObject, IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import {
	Sharetribe,
	ENDPOINTS,
	DEFAULT_QUERY_LIMIT,
	generateExecutionSummary,
} from '../../../helpers/Sharetribe';
import { DateTime } from 'luxon';
import { StockAdjustmentsQueryBuilder } from './Builder';

export async function execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
	const items = this.getInputData();
	const returnData: INodeExecutionData[] = [];
	const sharetribe = new Sharetribe(this);
	let summaryMeta: IDataObject | undefined;

	for (let i = 0; i < items.length; i++) {
		try {
			const listingId = this.getNodeParameter('listingId', i) as string;
			const createdAtStart = this.getNodeParameter('createdAtStart', i) as DateTime;
			const createdAtEnd = this.getNodeParameter('createdAtEnd', i) as DateTime;
			const simplify = this.getNodeParameter('simplify', i, true) as boolean;
			const stockFields = simplify
				? []
				: (this.getNodeParameter('stockFields', i, []) as string[]);
			const listingFields = simplify
				? []
				: (this.getNodeParameter('listingFields', i, []) as string[]);
			const transactionFields = simplify
				? []
				: (this.getNodeParameter('transactionFields', i, []) as string[]);
			const userFields = simplify ? [] : (this.getNodeParameter('userFields', i, []) as string[]);

			const { qs, resultOptions } = new StockAdjustmentsQueryBuilder(this)
				.withOptions({
					nodeOptions: { outputFields: { stockFields, listingFields, transactionFields, userFields } },
					simplify,
					returnAll: this.getNodeParameter('returnAll', i, false) as boolean,
					limit: this.getNodeParameter('limit', i, DEFAULT_QUERY_LIMIT) as number,
				})
				.withListingId(listingId)
				.withTimeRange(createdAtStart, createdAtEnd)
				.build();

			const { data, meta } = await sharetribe.query(ENDPOINTS.STOCK_ADJUSTMENTS_QUERY, qs, resultOptions);
			if (meta?.totalItems != null) {
				summaryMeta = items.length === 1
					? meta
					: { totalItems: ((summaryMeta?.totalItems as number) ?? 0) + (meta.totalItems as number) };
			}
			data.forEach((item) => {
				item.pairedItem = { item: i };
			});
			returnData.push(...data);
		} catch (error) {
			if (this.continueOnFail()) {
				returnData.push({ json: { error: error.message }, pairedItem: { item: i } });
				continue;
			}
			throw error;
		}
	}

	this.addExecutionHints({
		message: generateExecutionSummary(this, returnData.length, summaryMeta),
		location: 'outputPane',
	});

	return [returnData];
}

export { execute as query };
