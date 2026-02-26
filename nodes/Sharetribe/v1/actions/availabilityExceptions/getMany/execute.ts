import type { IDataObject, IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import {
	Sharetribe,
	validateValidUuid,
	validateAvailabilityExceptionTimeRange,
	generateExecutionSummary,
	ENDPOINTS,
	UI_RESOURCES,
	DEFAULT_QUERY_LIMIT,
} from '../../../helpers/Sharetribe';
import { DateTime } from 'luxon';
import { AvailabilityExceptionsQueryBuilder } from './Builder';

export async function execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
	const items = this.getInputData();
	const returnData: INodeExecutionData[] = [];
	const sharetribe = new Sharetribe(this);
	let summaryMeta: IDataObject | undefined;

	for (let i = 0; i < items.length; i++) {
		try {
			const simplify = this.getNodeParameter('simplify', i, true) as boolean;
			const availabilityExceptionFields = simplify
				? []
				: (this.getNodeParameter('availabilityExceptionFields', i, []) as string[]);
			const listingFields = simplify
				? []
				: (this.getNodeParameter('listingFields', i, []) as string[]);
			const listingId = this.getNodeParameter('listingId', i) as string;
			const start = this.getNodeParameter('start', i) as DateTime;
			const end = this.getNodeParameter('end', i) as DateTime;

			validateValidUuid(this, i, listingId, UI_RESOURCES.LISTING);

			if (!start?.isValid || !end?.isValid) {
				throw new NodeOperationError(this.getNode(), "Both 'Start' and 'End' must be provided");
			}

			const startUtc = start.setZone('utc', { keepLocalTime: true });
			const endUtc = end.setZone('utc', { keepLocalTime: true });
			validateAvailabilityExceptionTimeRange(this, i, startUtc, endUtc);

			const { qs, resultOptions } = new AvailabilityExceptionsQueryBuilder(this)
				.withOptions({
					nodeOptions: { outputFields: { availabilityExceptionFields, listingFields } },
					simplify,
					returnAll: this.getNodeParameter('returnAll', i, false) as boolean,
					limit: this.getNodeParameter('limit', i, DEFAULT_QUERY_LIMIT) as number,
				})
				.withQueryParams({
					listingId,
					start,
					end,
				})
				.build();

			const { data, meta } = await sharetribe.query(
				ENDPOINTS.AVAILABILITY_EXCEPTIONS_QUERY,
				qs,
				resultOptions,
			);
			if (meta?.totalItems != null) {
				summaryMeta = items.length === 1
					? meta
					: { totalItems: ((summaryMeta?.totalItems as number) ?? 0) + (meta.totalItems as number) };
			}
			data.forEach((item) => {
				item.pairedItem = { item: i };
			});
			returnData.push(...data);
		} catch (error) {
			if (this.continueOnFail()) {
				returnData.push({ json: { error: error.message }, pairedItem: { item: i } });
				continue;
			}
			throw error;
		}
	}

	this.addExecutionHints({
		message: generateExecutionSummary(this, returnData.length, summaryMeta),
		location: 'outputPane',
	});

	return [returnData];
}

export { execute as getMany };
