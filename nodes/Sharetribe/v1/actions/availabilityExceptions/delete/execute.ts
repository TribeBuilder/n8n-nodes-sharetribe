import type { IExecuteFunctions, INodeExecutionData, JsonObject } from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';
import {
	Sharetribe,
	generateExecutionSummary,
	ENDPOINTS,
} from '../../../helpers/Sharetribe';
import { AvailabilityExceptionDeleteBuilder } from './Builder';

export async function execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
	const items = this.getInputData();
	const returnData: INodeExecutionData[] = [];

	for (let i = 0; i < items.length; i++) {
		try {
			const exceptionId = this.getNodeParameter('exceptionId', i) as string;
			const simplify = this.getNodeParameter('simplify', i, true) as boolean;

			const body = new AvailabilityExceptionDeleteBuilder(this, i)
				.withExceptionId(exceptionId)
				.build();

			const sharetribe = new Sharetribe(this);
			const { data: result } = await sharetribe.request({
				method: 'POST',
				endpoint: ENDPOINTS.AVAILABILITY_EXCEPTIONS_DELETE,
				body: body,
			});

			if (simplify) {
				// Return simplified confirmation
				returnData.push({
					json: { deleted: true },
					pairedItem: { item: i },
				});
			} else {
				// Return raw API response
				result.forEach((item) => {
					item.pairedItem = { item: i };
				});
				returnData.push(...result);
			}
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

export { execute as deleteException };
