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
			const transactionId = this.getNodeParameter('transactionId', i) as string;
			validateValidUuid(this, i, transactionId, UI_RESOURCES.TRANSACTION);

			const transactionFields = this.getNodeParameter('transactionFields', i, {}) as IDataObject;
			const fieldDeletions = this.getNodeParameter('fieldDeletions', i, {}) as IDataObject;
			const speculative = this.getNodeParameter('speculative', i, false) as boolean;
			const { outputMode, fieldsToReturn, outputFields } = buildOutputConfig(
				this,
				'fieldsToReturn',
				i,
			);
			const listingFields = (this.getNodeParameter('listingFields', i, []) as string[]) || [];
			const userFields = (this.getNodeParameter('userFields', i, []) as string[]) || [];

			const sharetribe = new Sharetribe(this);
			const manager = ExtendedDataManager.for(this, sharetribe)
				.resource(transactionId, 'transaction', i)
				.withExtendedDataUpdates(transactionFields, ['metadata', 'protectedData'])
				.withExtendedDataDeletions(fieldDeletions)
				.withOutput(fieldsToReturn, outputMode, { outputFields: { ...outputFields, listingFields, userFields } });

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
						id: transactionId,
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
				const { body, qs } = manager.build(ENDPOINTS.TRANSACTIONS_UPDATE_METADATA, existingData);
				const { data } = await sharetribe.request({
					method: 'POST',
					endpoint: ENDPOINTS.TRANSACTIONS_UPDATE_METADATA,
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

export { execute as updateMetadata };
