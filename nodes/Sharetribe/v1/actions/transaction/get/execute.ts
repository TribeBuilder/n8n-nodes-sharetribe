import type { IExecuteFunctions, INodeExecutionData, JsonObject } from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';
import {
	FieldsetBuilder,
	Sharetribe,
	generateExecutionSummary,
	API_RESOURCES,
	ENDPOINTS,
	UI_RESOURCES,
	OUTPUT_MODES,
} from '../../../helpers/Sharetribe';

export async function execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
	const items = this.getInputData();
	const returnData: INodeExecutionData[] = [];

	for (let i = 0; i < items.length; i++) {
		try {
			const transactionId = this.getNodeParameter('transactionId', i) as string;
			const simplify = this.getNodeParameter('simplify', i, true) as boolean;
			const transactionFields = simplify
				? []
				: (this.getNodeParameter('transactionFields', i, []) as string[]);
			const listingFields = simplify
				? []
				: (this.getNodeParameter('listingFields', i, []) as string[]);
			const userFields = simplify ? [] : (this.getNodeParameter('userFields', i, []) as string[]);
			const outputMode = simplify ? OUTPUT_MODES.SIMPLIFIED : OUTPUT_MODES.SELECTED_FIELDS;

			// Build query params using fluent builder
			const { qs, endpoint } = new FieldsetBuilder(
				this,
				API_RESOURCES.TRANSACTION,
				UI_RESOURCES.TRANSACTION,
				ENDPOINTS.TRANSACTIONS_GET,
			)
				.withResourceId(transactionId, i)
				.withFields(transactionFields, outputMode)
				.withOptions({ outputFields: { transactionFields, listingFields, userFields } })
				.build();

			// Execute API request
			const sharetribe = new Sharetribe(this);
			const { data } = await sharetribe.query(endpoint, qs, { mode: 'limit', limit: 1 });

			// Add pairedItem metadata
			data.forEach((item) => {
				item.pairedItem = { item: i };
			});

			returnData.push(...data);
		} catch (error) {
			if (this.continueOnFail()) {
				returnData.push({
					json: { error: error.message },
					pairedItem: { item: i },
				} as INodeExecutionData);
				continue;
			}
			throw new NodeApiError(this.getNode(), error as JsonObject);
		}
	}

	// Add execution hints
	const summary = generateExecutionSummary(this, returnData.length, undefined);
	this.addExecutionHints({
		message: summary,
		location: 'outputPane',
	});

	return [returnData];
}

export { execute as get };
