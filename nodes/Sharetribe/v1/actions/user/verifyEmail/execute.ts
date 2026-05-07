import type { IExecuteFunctions, IDataObject, INodeExecutionData } from 'n8n-workflow';
import {
	FieldsetBuilder,
	Sharetribe,
	generateExecutionSummary,
	validateValidEmail,
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
			const userId = this.getNodeParameter('userId', i) as string;
			const userEmail = this.getNodeParameter('userEmail', i) as string;
			validateValidEmail(this, i, userEmail);
			const simplify = this.getNodeParameter('simplify', i, true) as boolean;
			const fieldsToReturn = simplify
				? []
				: (this.getNodeParameter('userFields', i, []) as string[]);
			const outputMode = simplify ? OUTPUT_MODES.SIMPLIFIED : OUTPUT_MODES.SELECTED_FIELDS;

			const { qs } = new FieldsetBuilder(
				this,
				API_RESOURCES.USER,
				UI_RESOURCES.USER,
				ENDPOINTS.USERS_VERIFY_EMAIL,
			)
				.withResourceId(userId, i)
				.withFields(fieldsToReturn, outputMode)
				.withOptions({ outputFields: { userFields: fieldsToReturn } })
				.build();

			const body: IDataObject = { id: userId, email: userEmail };
			const sharetribe = new Sharetribe(this);
			const { data } = await sharetribe.request({
				method: 'POST',
				endpoint: ENDPOINTS.USERS_VERIFY_EMAIL,
				body: body,
				qs: qs,
			});

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
			throw error;
		}
	}

	const summary = generateExecutionSummary(this, returnData.length, undefined);
	this.addExecutionHints({
		message: summary,
		location: 'outputPane',
	});

	return [returnData];
}

export { execute as verifyEmail };
