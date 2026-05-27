import type { IExecuteFunctions, IDataObject, INodeExecutionData, JsonObject } from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';
import {
	Sharetribe,
	ENDPOINTS,
	DEFAULT_QUERY_LIMIT,
	generateExecutionSummary,
} from '../../../helpers/Sharetribe';
import { TransactionQueryBuilder } from './Builder';

export async function execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
	const items = this.getInputData();
	const returnData: INodeExecutionData[] = [];
	const sharetribe = new Sharetribe(this);
	let summaryMeta: IDataObject | undefined;

	for (let i = 0; i < items.length; i++) {
		try {
			const simplify = this.getNodeParameter('simplify', i, true) as boolean;
			const transactionFields = simplify
				? []
				: (this.getNodeParameter('transactionFields', i, []) as string[]);
			const listingFields = simplify
				? []
				: (this.getNodeParameter('listingFields', i, []) as string[]);
			const userFields = simplify ? [] : (this.getNodeParameter('userFields', i, []) as string[]);
			const filterOptions = this.getNodeParameter('filterOptions', i, {}) as IDataObject;
			const sortOptions = this.getNodeParameter('sort', i, {}) as IDataObject;

			const { qs, resultOptions } = new TransactionQueryBuilder(this)
				.withOptions({
					nodeOptions: { outputFields: { transactionFields, listingFields, userFields } },
					simplify,
					countOnly: this.getNodeParameter('countOnly', i, false) as boolean,
					returnAll: this.getNodeParameter('returnAll', i, false) as boolean,
					limit: this.getNodeParameter('limit', i, DEFAULT_QUERY_LIMIT) as number,
				})
				.withFilters(filterOptions)
				.withSort(sortOptions)
				.build();

			const { data, meta } = await sharetribe.query(ENDPOINTS.TRANSACTIONS_QUERY, qs, resultOptions);
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
			throw new NodeApiError(this.getNode(), error as JsonObject);
		}
	}

	const countOnly = this.getNodeParameter('countOnly', 0, false) as boolean;
	const summaryCount = countOnly
		? returnData.reduce((sum, item) => sum + ((item.json.totalItems as number) ?? 0), 0)
		: returnData.length;
	this.addExecutionHints({
		message: generateExecutionSummary(this, summaryCount, countOnly ? undefined : summaryMeta),
		location: 'outputPane',
	});

	return [returnData];
}

export { execute as query };
