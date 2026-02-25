import type { IExecuteFunctions, IDataObject, INodeExecutionData } from 'n8n-workflow';
import {
	FieldsetBuilder,
	Sharetribe,
	validateValidUuid,
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
			const userId = this.getNodeParameter('userId', i) as string;

			validateValidUuid(this, i, userId, UI_RESOURCES.USER);

			const body: IDataObject = { id: userId };

			const permissionValue = (flag: boolean) => (flag ? 'permission/allow' : 'permission/deny');

			const canCreateListings = this.getNodeParameter('canCreateListings', i, undefined);
			if (canCreateListings !== undefined) {
				body.postListings = permissionValue(canCreateListings as boolean);
			}

			const canInitiateTransactions = this.getNodeParameter(
				'canInitiateTransactions',
				i,
				undefined,
			);
			if (canInitiateTransactions !== undefined) {
				body.initiateTransactions = permissionValue(canInitiateTransactions as boolean);
			}

			const canRead = this.getNodeParameter('canRead', i, undefined);
			if (canRead !== undefined) {
				body.read = permissionValue(canRead as boolean);
			}

			const simplify = this.getNodeParameter('simplify', i, true) as boolean;
			const fieldsToReturn = simplify
				? []
				: (this.getNodeParameter('userFields', i, []) as string[]);
			const outputMode = simplify ? OUTPUT_MODES.SIMPLIFIED : OUTPUT_MODES.SELECTED_FIELDS;

			// Build query params using fluent builder
			const { qs } = new FieldsetBuilder(
				this,
				API_RESOURCES.USER,
				UI_RESOURCES.USER,
				ENDPOINTS.USERS_UPDATE_PERMISSIONS,
			)
				.withResourceId(userId, i)
				.withFields(fieldsToReturn, outputMode)
				.withOptions({ outputFields: { userFields: fieldsToReturn } })
				.build();

			// Always include permissions in the sparse fields so the response shows the updated values
			const fieldsKey = 'fields.user';
			const sparseFields = (qs[fieldsKey] as string[]) || [];
			if (!sparseFields.includes('permissions')) {
				sparseFields.push('permissions');
			}
			qs[fieldsKey] = sparseFields;

			const sharetribe = new Sharetribe(this);
			const { data } = await sharetribe.request({
				method: 'POST',
				endpoint: ENDPOINTS.USERS_UPDATE_PERMISSIONS,
				body: body,
				qs: qs,
			});

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

export { execute as updatePermissions };
