import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import {
	FieldsetBuilder,
	Sharetribe,
	buildSparseFieldsList,
	generateExecutionSummary,
	API_RESOURCES,
	ENDPOINTS,
	UI_RESOURCES,
	STOCK_RELATIONSHIPS,
	OUTPUT_MODES,
} from '../../../helpers/Sharetribe';

const STOCK_RESERVATION_ATTRIBUTE_KEYS = ['quantity', 'state'];

export async function execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
	const items = this.getInputData();
	const returnData: INodeExecutionData[] = [];

	for (let i = 0; i < items.length; i++) {
		try {
			const stockReservationId = this.getNodeParameter('stockReservationId', i) as string;
			const simplify = this.getNodeParameter('simplify', i, true) as boolean;
			const stockFields = simplify
				? [...STOCK_RESERVATION_ATTRIBUTE_KEYS]
				: (this.getNodeParameter('stockFields', i, []) as string[]);
			const listingFields = simplify
				? []
				: (this.getNodeParameter('listingFields', i, []) as string[]);
			const transactionFields = simplify
				? []
				: (this.getNodeParameter('transactionFields', i, []) as string[]);
			const userFields = simplify ? [] : (this.getNodeParameter('userFields', i, []) as string[]);

			// Build sparse fields list for stock reservation
			const stockAttributeFields = stockFields.filter(
				(f) =>
					!f.includes('.') &&
					f !== STOCK_RELATIONSHIPS.LISTING &&
					f !== STOCK_RELATIONSHIPS.TRANSACTION &&
					f !== STOCK_RELATIONSHIPS.STOCK_ADJUSTMENTS,
			);
			const sparseFields = buildSparseFieldsList(
				stockAttributeFields,
				STOCK_RESERVATION_ATTRIBUTE_KEYS,
			);

			// Build query params using fluent builder
			const { qs, endpoint } = new FieldsetBuilder(
				this,
				API_RESOURCES.STOCK_ADJUSTMENT,
				UI_RESOURCES.STOCK_RESERVATION,
				ENDPOINTS.STOCK_RESERVATIONS_GET,
			)
				.withResourceId(stockReservationId, i)
				.withFields(stockFields, OUTPUT_MODES.SELECTED_FIELDS)
				.withOptions({
					outputFields: { stockFields, listingFields, transactionFields, userFields },
					'fields.stockReservation': sparseFields,
				})
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

	// Add execution hints
	const summary = generateExecutionSummary(this, returnData.length, undefined);
	this.addExecutionHints({
		message: summary,
		location: 'outputPane',
	});

	return [returnData];
}

export { execute as getReservation };
