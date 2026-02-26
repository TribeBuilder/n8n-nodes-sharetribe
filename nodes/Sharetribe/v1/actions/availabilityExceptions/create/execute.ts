import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { DateTime } from 'luxon';
import {
	FieldsetBuilder,
	Sharetribe,
	API_RESOURCES,
	ENDPOINTS,
	UI_RESOURCES,
	OUTPUT_MODES,
	generateExecutionSummary,
} from '../../../helpers/Sharetribe';
import { AvailabilityExceptionCreateBuilder } from './Builder';

export async function execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
	const items = this.getInputData();
	const returnData: INodeExecutionData[] = [];

	for (let i = 0; i < items.length; i++) {
		try {
			const listingId = this.getNodeParameter('listingId', i) as string;
			const allDay = this.getNodeParameter('allDay', i, true) as boolean;
			const available = this.getNodeParameter('available', i, false) as boolean;
			const date = allDay ? (this.getNodeParameter('date', i) as DateTime) : undefined;
			const start = !allDay ? (this.getNodeParameter('start', i) as DateTime) : undefined;
			const end = !allDay ? (this.getNodeParameter('end', i) as DateTime) : undefined;
			const seats = available ? (this.getNodeParameter('seats', i, 1) as number) : undefined;

			const simplify = this.getNodeParameter('simplify', i, true) as boolean;
			const availabilityExceptionFields = simplify
				? []
				: (this.getNodeParameter('availabilityExceptionFields', i, []) as string[]);
			const listingFields = simplify
				? []
				: (this.getNodeParameter('listingFields', i, []) as string[]);
			const outputMode = simplify ? OUTPUT_MODES.SIMPLIFIED : OUTPUT_MODES.SELECTED_FIELDS;

			const body = new AvailabilityExceptionCreateBuilder(this, i)
				.withListingId(listingId)
				.withDateTime({ allDay, date, start, end })
				.withAvailability(available, seats)
				.build();

			// Build query params for sparse fieldsets
			const { qs } = new FieldsetBuilder(
				this,
				API_RESOURCES.AVAILABILITY_EXCEPTIONS,
				UI_RESOURCES.AVAILABILITY_EXCEPTIONS,
				ENDPOINTS.AVAILABILITY_EXCEPTIONS_CREATE,
			)
				.withFields(availabilityExceptionFields, outputMode)
				.withOptions({ outputFields: { availabilityExceptionFields, listingFields } })
				.build();

			const sharetribe = new Sharetribe(this);
			const { data: result } = await sharetribe.request({
				method: 'POST',
				endpoint: ENDPOINTS.AVAILABILITY_EXCEPTIONS_CREATE,
				body: body,
				qs,
			});

			result.forEach((item) => {
				item.pairedItem = { item: i };
			});
			returnData.push(...result);
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

export { execute as create };
