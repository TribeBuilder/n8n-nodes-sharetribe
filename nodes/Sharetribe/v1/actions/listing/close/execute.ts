import type { IExecuteFunctions, IDataObject, INodeExecutionData, JsonObject } from 'n8n-workflow';
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
			const listingId = this.getNodeParameter('listingId', i) as string;
			const simplify = this.getNodeParameter('simplify', i, true) as boolean;
			const fieldsToReturn = simplify
				? []
				: (this.getNodeParameter('fieldsToReturn', i, []) as string[]);
			const authorFields = simplify
				? []
				: (this.getNodeParameter('authorFields', i, []) as string[]);
			const outputMode = simplify ? OUTPUT_MODES.SIMPLIFIED : OUTPUT_MODES.SELECTED_FIELDS;

			// Build query params using fluent builder
			const { qs, endpoint } = new FieldsetBuilder(
				this,
				API_RESOURCES.LISTING,
				UI_RESOURCES.LISTING,
				ENDPOINTS.LISTINGS_CLOSE,
			)
				.withResourceId(listingId, i)
				.withFields(fieldsToReturn, outputMode)
				.withOptions({ outputFields: { fieldsToReturn, authorFields } })
				.build();

			// Execute API request with POST body
			const body: IDataObject = { id: listingId };
			const sharetribe = new Sharetribe(this);
			const { data } = await sharetribe.request({
				method: 'POST',
				endpoint: endpoint,
				body: body,
				qs: qs,
			});

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

export { execute as close };
