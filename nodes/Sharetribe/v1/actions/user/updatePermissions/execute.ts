import type { IExecuteFunctions, IDataObject, INodeExecutionData } from 'n8n-workflow';
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
			const userId = this.getNodeParameter('userId', i) as string;
			const permissionsToUpdate = this.getNodeParameter('permissionsToUpdate', i, [
				'canCreateListings',
				'canInitiateTransactions',
				'canRead',
			]) as string[];

			const simplify = this.getNodeParameter('simplify', i, true) as boolean;
			const fieldsToReturn = simplify
				? []
				: (this.getNodeParameter('userFields', i, []) as string[]);
			const outputMode = simplify ? OUTPUT_MODES.SIMPLIFIED : OUTPUT_MODES.SELECTED_FIELDS;

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

			const permissionValue = (flag: boolean) => (flag ? 'permission/allow' : 'permission/deny');
			const body: IDataObject = { id: userId };

			if (permissionsToUpdate.includes('canCreateListings')) {
				body.postListings = permissionValue(
					this.getNodeParameter('canCreateListings', i, true) as boolean,
				);
			}
			if (permissionsToUpdate.includes('canInitiateTransactions')) {
				body.initiateTransactions = permissionValue(
					this.getNodeParameter('canInitiateTransactions', i, true) as boolean,
				);
			}
			if (permissionsToUpdate.includes('canRead')) {
				body.read = permissionValue(this.getNodeParameter('canRead', i, true) as boolean);
			}

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

export { execute as updatePermissions };
