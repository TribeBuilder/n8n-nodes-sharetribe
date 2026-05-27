import type { IExecuteFunctions, IDataObject, INodeExecutionData, JsonObject } from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';
import {
	addExtendedDataFields,
	addStringField,
	FieldsetBuilder,
	Sharetribe,
	normalizeGeolocation,
	normalizeImages,
	normalizePrice,
	parseJsonFields,
	generateExecutionSummary,
	API_RESOURCES,
	ENDPOINTS,
	UI_RESOURCES,
	OUTPUT_MODES,
} from '../../../helpers/Sharetribe';

const JSON_FIELDS = ['publicData', 'privateData', 'metadata', 'images', 'availabilityPlan'];

export async function execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
	const items = this.getInputData();
	const returnData: INodeExecutionData[] = [];

	for (let i = 0; i < items.length; i++) {
		try {
			const title = this.getNodeParameter('title', i) as string;
			const authorId = this.getNodeParameter('authorId', i) as string;
			const state = this.getNodeParameter('state', i) as string;

			const listingFields = this.getNodeParameter('listingFields', i, {}) as IDataObject;

			const parsedFields = parseJsonFields(listingFields, JSON_FIELDS);

			const body: IDataObject = {
				title,
				authorId,
				state,
			};

			addStringField(body, parsedFields, 'description');

			const geolocation = normalizeGeolocation(parsedFields.geolocation);
			if (geolocation) {
				body.geolocation = geolocation;
			}

			const price = normalizePrice(parsedFields.price);
			if (price) {
				body.price = price;
			}

			const images = normalizeImages(parsedFields.images);
			if (images !== undefined) {
				body.images = images;
			}

			if (parsedFields.availabilityPlan) {
				body.availabilityPlan = parsedFields.availabilityPlan;
			}

			addExtendedDataFields(body, parsedFields);

			const simplify = this.getNodeParameter('simplify', i, true) as boolean;
			const fieldsToReturn = simplify
				? []
				: (this.getNodeParameter('fieldsToReturn', i, []) as string[]);
			const authorFields = simplify
				? []
				: (this.getNodeParameter('authorFields', i, []) as string[]);
			const outputMode = simplify ? OUTPUT_MODES.SIMPLIFIED : OUTPUT_MODES.SELECTED_FIELDS;

			// Build query params using fluent builder
			// Note: CREATE operations don't need withResourceId since we're creating a new resource
			const { qs } = new FieldsetBuilder(
				this,
				API_RESOURCES.LISTING,
				UI_RESOURCES.LISTING,
				ENDPOINTS.LISTINGS_CREATE,
			)
				.withFields(fieldsToReturn, outputMode)
				.withOptions({ outputFields: { fieldsToReturn, authorFields } })
				.build();

			const sharetribe = new Sharetribe(this);
			const { data } = await sharetribe.request({
				method: 'POST',
				endpoint: ENDPOINTS.LISTINGS_CREATE,
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

export { execute as create };
