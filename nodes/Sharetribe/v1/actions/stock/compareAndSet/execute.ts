import type { IExecuteFunctions, IDataObject, INodeExecutionData, JsonObject } from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';
import {
	Sharetribe,
	validateValidUuid,
	validatePositiveInteger,
	generateExecutionSummary,
	ENDPOINTS,
	UI_RESOURCES,
} from '../../../helpers/Sharetribe';

export async function execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
	const items = this.getInputData();
	const returnData: INodeExecutionData[] = [];

	for (let i = 0; i < items.length; i++) {
		try {
			const listingId = this.getNodeParameter('listingId', i) as string;

			validateValidUuid(this, i, listingId, UI_RESOURCES.LISTING);

			const oldTotal = this.getNodeParameter('oldTotal', i, null) as number | null;
			const newTotal = this.getNodeParameter('newTotal', i) as number;

			// oldTotal can be null (for listings with no stock defined), but if it's a number, must be non-negative integer
			if (oldTotal !== null) {
				validatePositiveInteger(this, i, { value: oldTotal, fieldName: 'current total stock' });
			}

			// newTotal must always be non-negative integer
			validatePositiveInteger(this, i, { value: newTotal, fieldName: 'new total stock' });

			const body: IDataObject = {
				listingId,
				oldTotal,
				newTotal,
			};

			const sharetribe = new Sharetribe(this);
			const { data: result } = await sharetribe.request({
				method: 'POST',
				endpoint: ENDPOINTS.STOCK_COMPARE_AND_SET,
				body: body,
			});

			result.forEach((item) => {
				item.pairedItem = { item: i };
			});
			returnData.push(...result);
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

	const summary = generateExecutionSummary(this, returnData.length, undefined);
	this.addExecutionHints({
		message: summary,
		location: 'outputPane',
	});

	return [returnData];
}

export { execute as compareAndSet };
