import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
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
			const lookUpBy = this.getNodeParameter('lookUpBy', i, 'id') as string;
			const simplify = this.getNodeParameter('simplify', i, true) as boolean;
			const fieldsToReturn = simplify
				? []
				: (this.getNodeParameter('userFields', i, []) as string[]);
			const outputMode = simplify ? OUTPUT_MODES.SIMPLIFIED : OUTPUT_MODES.SELECTED_FIELDS;

			// Build query params using fluent builder
			const builder = new FieldsetBuilder(
				this,
				API_RESOURCES.USER,
				UI_RESOURCES.USER,
				ENDPOINTS.USERS_GET,
			);

			if (lookUpBy === 'email') {
				const userEmail = this.getNodeParameter('userEmail', i) as string;
				builder.withEmail(userEmail);
			} else {
				const userId = this.getNodeParameter('userId', i) as string;
				builder.withResourceId(userId, i);
			}

			const { qs, endpoint } = builder
				.withFields(fieldsToReturn, outputMode)
				.withOptions({ outputFields: { userFields: fieldsToReturn } })
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
			if (this.continueOnFail() || error.httpCode === '404') {
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

export { execute as get };
