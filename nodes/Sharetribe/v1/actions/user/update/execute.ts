import type { IExecuteFunctions, IDataObject, INodeExecutionData } from 'n8n-workflow';
import get from 'lodash/get';
import cloneDeep from 'lodash/cloneDeep';
import {
	Sharetribe,
	ExtendedDataManager,
	validateValidUuid,
	generateExecutionSummary,
	buildOutputConfig,
	ENDPOINTS,
	UI_RESOURCES,
} from '../../../helpers/Sharetribe';

export async function execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
	const items = this.getInputData();
	const returnData: INodeExecutionData[] = [];
	let fieldNameWarnings: string[] = [];

	for (let i = 0; i < items.length; i++) {
		try {
			const userId = this.getNodeParameter('userId', i) as string;
			validateValidUuid(this, i, userId, UI_RESOURCES.USER);

			const profileFields = this.getNodeParameter('profileFields', i, {}) as IDataObject;

			const fieldDeletionsConfig = this.getNodeParameter('fieldDeletions', i, {}) as IDataObject;
			const speculative = this.getNodeParameter('speculative', i, false) as boolean;
			const { outputMode, fieldsToReturn, outputFields } = buildOutputConfig(this, 'userFields', i);

			const sharetribe = new Sharetribe(this);
			const manager = ExtendedDataManager.for(this, sharetribe)
				.resource(userId, 'user', i)
				.withCoreFields(profileFields)
				.withExtendedDataUpdates(profileFields, ['publicData', 'protectedData', 'privateData', 'metadata'])
				.withExtendedDataDeletions(fieldDeletionsConfig)
				.withOutput(fieldsToReturn, outputMode, { outputFields });

			if (i === 0) {
				fieldNameWarnings = manager.getFieldNameWarnings();
			}

			// Fetch existing data if needed for nested updates/deletions
			const nestedInfo = manager.getNestedDataTypes();
			const existingData: Record<string, IDataObject> = {};

			if (nestedInfo) {
				const sparseFields = nestedInfo.extendedDataTypes.map((type) =>
					nestedInfo.fieldPrefix ? `${nestedInfo.fieldPrefix}.${type}` : type,
				);

				const { data } = await sharetribe.request({
					method: 'GET',
					endpoint: nestedInfo.endpoint,
					qs: {
						id: userId,
						[`fields.${nestedInfo.resourceKey}`]: sparseFields,
					},
				});

				const resource = get(data, '[0].json', {});
				const container = nestedInfo.fieldPrefix ? get(resource, nestedInfo.fieldPrefix, {}) : resource;

				for (const extendedDataType of nestedInfo.extendedDataTypes) {
					existingData[extendedDataType] = cloneDeep(get(container, extendedDataType, {}));
				}
			}

			if (speculative) {
				// Build speculative preview without making update
				const preview = await manager.buildSpeculative(existingData);
				returnData.push({
					json: preview,
					pairedItem: { item: i },
				} as INodeExecutionData);
			} else {
				// Build and execute real update
				const { body, qs } = manager.build(ENDPOINTS.USERS_UPDATE_PROFILE, existingData);
				const { data } = await sharetribe.request({
					method: 'POST',
					endpoint: ENDPOINTS.USERS_UPDATE_PROFILE,
					body,
					qs,
				});

				data.forEach((item) => {
					item.pairedItem = { item: i };
				});
				returnData.push(...data);
			}
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

	// Check if any items were speculative
	const hasSpeculative = returnData.some(
		(item) => item.json && typeof item.json === 'object' && '_speculative' in item.json,
	);

	let summary = generateExecutionSummary(this, returnData.length, undefined);
	if (hasSpeculative) {
		summary +=
			' - SPECULATIVE: No actual changes were saved. This shows what the update would look like.';
	}

	this.addExecutionHints({
		message: summary,
		location: 'outputPane',
	});

	for (const warning of fieldNameWarnings) {
		this.addExecutionHints({
			message: warning,
			type: 'danger',
			location: 'outputPane',
		});
	}

	return [returnData];
}

export { execute as updateProfile };
