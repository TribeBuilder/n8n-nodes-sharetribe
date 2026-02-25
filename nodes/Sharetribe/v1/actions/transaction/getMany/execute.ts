import type { IExecuteFunctions, IDataObject, INodeExecutionData } from 'n8n-workflow';
import {
	Sharetribe,
	ENDPOINTS,
	DEFAULT_QUERY_LIMIT,
	generateExecutionSummary,
	hintMultipleInputItems,
} from '../../../helpers/Sharetribe';
import { TransactionQueryBuilder } from './Builder';

export async function execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
	const items = this.getInputData();
	const returnData: INodeExecutionData[] = [];

	const simplify = this.getNodeParameter('simplify', 0, true) as boolean;
	const transactionFields = simplify ? [] : (this.getNodeParameter('transactionFields', 0, []) as string[]);
	const listingFields = simplify ? [] : (this.getNodeParameter('listingFields', 0, []) as string[]);
	const userFields = simplify ? [] : (this.getNodeParameter('userFields', 0, []) as string[]);
	const filterOptions = this.getNodeParameter('filterOptions', 0, {}) as IDataObject;
	const sortOptions = this.getNodeParameter('sort', 0, {}) as IDataObject;

	// Build query params using fluent builder
	const { qs, resultOptions } = new TransactionQueryBuilder(this)
		.withOptions({
			nodeOptions: { outputFields: { transactionFields, listingFields, userFields } },
			simplify,
			countOnly: this.getNodeParameter('countOnly', 0, false) as boolean,
			returnAll: this.getNodeParameter('returnAll', 0, false) as boolean,
			limit: this.getNodeParameter('limit', 0, DEFAULT_QUERY_LIMIT) as number,
		})
		.withFilters(filterOptions)
		.withSort(sortOptions)
		.build();

	// Execute API request
	const sharetribe = new Sharetribe(this);
	const { data, meta } = await sharetribe.query(ENDPOINTS.TRANSACTIONS_QUERY, qs, resultOptions);

	returnData.push(...data);

	// Add execution hints
	const summary = generateExecutionSummary(this, returnData.length, meta);
	this.addExecutionHints({
		message: summary,
		location: 'outputPane',
	});

	hintMultipleInputItems(this, items.length);

	return [returnData];
}

export { execute as query };
