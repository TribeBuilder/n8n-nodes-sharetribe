import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { Sharetribe, generateExecutionSummary, hintMultipleInputItems, ENDPOINTS } from '../../../helpers/Sharetribe';

export async function execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
	const items = this.getInputData();
	const returnData: INodeExecutionData[] = [];
	const qs = {};
	const sharetribe = new Sharetribe(this);
	const { data: result } = await sharetribe.request({ method: 'GET', endpoint: ENDPOINTS.MARKETPLACE_GET, qs: qs });

	returnData.push(...result);

	const summary = generateExecutionSummary(this, result.length, undefined);
	this.addExecutionHints({
		message: summary,
		location: 'outputPane',
	});

	hintMultipleInputItems(this, items.length);

	return [returnData];
}

export { execute as get };
