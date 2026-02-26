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
} from '../../../helpers/Sharetribe';
import { ListingQueryBuilder } from './Builder';

export async function execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
	const items = this.getInputData();
	const returnData: INodeExecutionData[] = [];
	const sharetribe = new Sharetribe(this);
	let summaryMeta: IDataObject | undefined;

	for (let i = 0; i < items.length; i++) {
		try {
			const simplify = this.getNodeParameter('simplify', i, true) as boolean;
			const listingFields = simplify
				? []
				: (this.getNodeParameter('listingFields', i, []) as string[]);
			const authorFields = simplify
				? []
				: (this.getNodeParameter('authorFields', i, []) as string[]);
			const filterOptions = this.getNodeParameter('filterOptions', i, {}) as IDataObject;
			const sortOptions = this.getNodeParameter('sort', i, {}) as IDataObject;
			const countOnly = this.getNodeParameter('countOnly', i, false) as boolean;

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
					returnAll: this.getNodeParameter('returnAll', i, false) as boolean,
					limit: this.getNodeParameter('limit', i, DEFAULT_QUERY_LIMIT) as number,
				})
				.withFilters(filterOptions)
				.withSort(sortOptions)
				.build();

			let data: INodeExecutionData[];
			if (useAvailabilityCursor) {
				data = await queryWithAvailabilityChunking(this, qs);
			} else {
				const response = await sharetribe.query(ENDPOINTS.LISTINGS_QUERY, qs, resultOptions);
				data = response.data;
				if (response.meta?.totalItems != null) {
					summaryMeta = items.length === 1
						? response.meta
						: { totalItems: ((summaryMeta?.totalItems as number) ?? 0) + (response.meta.totalItems as number) };
				}
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
