import type { IExecuteFunctions, IDataObject, INodeExecutionData } from 'n8n-workflow';
import {
	Sharetribe,
	validateValidUuid,
	validateStockAdjustmentQuantity,
	generateExecutionSummary,
	sparseListingAttributesFromNodeParameter,
	ENDPOINTS,
	UI_RESOURCES,
	STOCK_RELATIONSHIPS,
	LISTING_RELATIONSHIPS,
	USER_ATTRIBUTE_FIELD_MAP,
	USER_RELATIONSHIP_VALUES,
	OUTPUT_MODES,
	type OutputMode,
} from '../../../helpers/Sharetribe';

export async function execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
	const items = this.getInputData();
	const returnData: INodeExecutionData[] = [];

	for (let i = 0; i < items.length; i++) {
		try {
			const listingId = this.getNodeParameter('listingId', i) as string;
			validateValidUuid(this, i, listingId, UI_RESOURCES.LISTING);

			const quantity = this.getNodeParameter('quantity', i) as number;
			validateStockAdjustmentQuantity(this, i, quantity);

			const simplify = this.getNodeParameter('simplify', i, true) as boolean;
			const stockFields = simplify ? [STOCK_RELATIONSHIPS.LISTING] : (this.getNodeParameter('stockFields', i, []) as string[]);
			const listingFields = simplify ? [] : (this.getNodeParameter('listingFields', i, []) as string[]);
			const userFields = simplify ? [] : (this.getNodeParameter('userFields', i, []) as string[]);

			const body: IDataObject = {
				listingId,
				quantity,
			};

			// Determine output mode and fields
			const outputMode: OutputMode = simplify ? OUTPUT_MODES.SIMPLIFIED : OUTPUT_MODES.SELECTED_FIELDS;

			const includeRelationships: string[] = [];
			const qs: IDataObject = {};

			// Handle listing relationship
			if (stockFields.includes(STOCK_RELATIONSHIPS.LISTING)) {
				includeRelationships.push(STOCK_RELATIONSHIPS.LISTING);

				if (outputMode === OUTPUT_MODES.SIMPLIFIED) {
					// In simplified mode, always include currentStock to see updated quantity
					includeRelationships.push('listing.currentStock');
					// Only return listing ID to minimize response size
					qs['fields.listing'] = ['id'];
				} else if (listingFields.length > 0) {
					// Filter out relationship fields from listing attributes
					const listingRelationshipValues = Object.values(LISTING_RELATIONSHIPS) as string[];
					const regularFields = listingFields.filter(
						(attr) => !listingRelationshipValues.includes(attr),
					);
					if (regularFields.length > 0) {
						const mappedFields = sparseListingAttributesFromNodeParameter(regularFields);
						if (mappedFields && mappedFields.length > 0) {
							qs['fields.listing'] = mappedFields;
						}
					}

					// Handle listing.currentStock relationship
					if (listingFields.includes('currentStock')) {
						includeRelationships.push('listing.currentStock');
					}

					// Handle listing.author relationship
					if (listingFields.includes('author')) {
						includeRelationships.push('listing.author');

						if (userFields.length > 0) {
							const mappedAttributes = userFields.map(
								(attr) => USER_ATTRIBUTE_FIELD_MAP[attr] || attr,
							);

							// Filter out ALL user relationships - only attributes go in fields.user
							// Stock adjustments don't support nested user relationships like profileImage
							const userAttributeFields = mappedAttributes.filter(
								(attr) => !USER_RELATIONSHIP_VALUES.includes(attr),
							);
							if (userAttributeFields.length > 0) {
								qs['fields.user'] = ['id', ...userAttributeFields];
							}
						}
					}
				} else {
					qs['fields.listing'] = ['id'];
				}
			}

			if (includeRelationships.length > 0) {
				qs.include = includeRelationships;
			}

			const sharetribe = new Sharetribe(this);
			const { data: result } = await sharetribe.request({
				method: 'POST',
				endpoint: ENDPOINTS.STOCK_ADJUSTMENTS_CREATE,
				body: body,
				qs: qs,
			});

			result.forEach((item) => {
				item.pairedItem = { item: i };
			});
			returnData.push(...result);
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

export { execute as adjust };
