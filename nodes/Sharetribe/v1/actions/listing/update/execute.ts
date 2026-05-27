import type { IExecuteFunctions, IDataObject, INodeExecutionData, JsonObject } from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';
import get from 'lodash/get';
import cloneDeep from 'lodash/cloneDeep';
import {
	Sharetribe,
	ExtendedDataManager,
	validateValidUuid,
	generateExecutionSummary,
	buildOutputConfig,
	parseJsonFields,
	ENDPOINTS,
	UI_RESOURCES,
} from '../../../helpers/Sharetribe';

const JSON_FIELDS = ['publicData', 'privateData', 'metadata', 'availabilityPlan'];

export async function execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
	const items = this.getInputData();
	const returnData: INodeExecutionData[] = [];
	let fieldNameWarnings: string[] = [];

	for (let i = 0; i < items.length; i++) {
		try {
			const listingId = this.getNodeParameter('listingId', i) as string;
			validateValidUuid(this, i, listingId, UI_RESOURCES.LISTING);

			const listingFields = this.getNodeParameter('listingFields', i, {}) as IDataObject;
			const fieldDeletionsConfig = this.getNodeParameter('fieldDeletions', i, {}) as IDataObject;
			const speculative = this.getNodeParameter('speculative', i, false) as boolean;
			const { outputMode, fieldsToReturn, outputFields } = buildOutputConfig(this, 'fieldsToReturn', i);
			const authorFields = (this.getNodeParameter('authorFields', i, []) as string[]) || [];

			// Parse JSON fields
			const parsedFields = parseJsonFields(listingFields, JSON_FIELDS);

			// Parse images: accept plain UUID, comma-separated list, or JSON array
			if (parsedFields.images !== undefined) {
				const raw = parsedFields.images;
				if (Array.isArray(raw)) {
					// already an array, use as-is
				} else if (typeof raw === 'string') {
					const trimmed = (raw as string).trim();
					if (trimmed.startsWith('[')) {
						parsedFields.images = JSON.parse(trimmed);
					} else if (trimmed === '') {
						parsedFields.images = [];
					} else {
						parsedFields.images = trimmed.split(',').map((id) => id.trim()).filter(Boolean);
					}
				}
			}

			const sharetribe = new Sharetribe(this);
			const manager = ExtendedDataManager.for(this, sharetribe)
				.resource(listingId, 'listing', i)
				.withCoreFields(parsedFields)
				.withExtendedDataUpdates(parsedFields, ['publicData', 'privateData', 'metadata'])
				.withExtendedDataDeletions(fieldDeletionsConfig)
				.withOutput(fieldsToReturn, outputMode, { outputFields: { ...outputFields, authorFields } });

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
						id: listingId,
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
				const { body, qs } = manager.build(ENDPOINTS.LISTINGS_UPDATE, existingData);
				const { data } = await sharetribe.request({
					method: 'POST',
					endpoint: ENDPOINTS.LISTINGS_UPDATE,
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
			throw new NodeApiError(this.getNode(), error as JsonObject);
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

export { execute as update };
