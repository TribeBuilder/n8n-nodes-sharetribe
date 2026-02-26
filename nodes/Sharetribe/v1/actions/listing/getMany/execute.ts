import {
	type IExecuteFunctions,
	type IDataObject,
	type INodeExecutionData,
	NodeOperationError,
} from 'n8n-workflow';
import {
	Sharetribe,
	ENDPOINTS,
	DEFAULT_QUERY_LIMIT,
	queryWithAvailabilityChunking,
	generateExecutionSummary,
	hintMultipleInputItems,
} from '../../../helpers/Sharetribe';
import { ListingQueryBuilder } from './Builder';

export async function execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
	const items = this.getInputData();
	const returnData: INodeExecutionData[] = [];

	const simplify = this.getNodeParameter('simplify', 0, true) as boolean;
	const listingFields = simplify ? [] : (this.getNodeParameter('listingFields', 0, []) as string[]);
	const authorFields = simplify ? [] : (this.getNodeParameter('authorFields', 0, []) as string[]);
	const filterOptions = this.getNodeParameter('filterOptions', 0, {}) as IDataObject;
	const sortOptions = this.getNodeParameter('sort', 0, {}) as IDataObject;

	const countOnly = this.getNodeParameter('countOnly', 0, false) as boolean;

	if (countOnly && ListingQueryBuilder.requiresAvailabilityCursor(filterOptions)) {
		throw new NodeOperationError(
			this.getNode(),
			"'Count Only' is not supported with availability filtering.",
		);
	}

	const { qs, resultOptions, useAvailabilityCursor } = new ListingQueryBuilder(this)
		.withOptions({
			nodeOptions: { outputFields: { listingFields, authorFields } },
			simplify,
			countOnly,
			returnAll: this.getNodeParameter('returnAll', 0, false) as boolean,
			limit: this.getNodeParameter('limit', 0, DEFAULT_QUERY_LIMIT) as number,
		})
		.withFilters(filterOptions)
		.withSort(sortOptions)
		.build();

	let data: INodeExecutionData[];
	let meta: IDataObject | undefined;

	if (useAvailabilityCursor) {
		data = await queryWithAvailabilityChunking(this, qs);
	} else {
		const sharetribe = new Sharetribe(this);
		const response = await sharetribe.query(ENDPOINTS.LISTINGS_QUERY, qs, resultOptions);
		data = response.data;
		meta = response.meta;
	}

	returnData.push(...data);

	const summary = generateExecutionSummary(this, returnData.length, meta);
	this.addExecutionHints({
		message: summary,
		location: 'outputPane',
	});

	hintMultipleInputItems(this, items.length);

	return [returnData];
}

export { execute as query };
