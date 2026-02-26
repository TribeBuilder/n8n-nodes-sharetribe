import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import {
	Sharetribe,
	validateValidUuid,
	validateAvailabilityExceptionTimeRange,
	generateExecutionSummary,
	ENDPOINTS,
	UI_RESOURCES,
	DEFAULT_QUERY_LIMIT,
	hintMultipleInputItems,
} from '../../../helpers/Sharetribe';
import { DateTime } from 'luxon';
import { AvailabilityExceptionsQueryBuilder } from './Builder';

export async function execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
	const items = this.getInputData();
	const returnData: INodeExecutionData[] = [];

	const simplify = this.getNodeParameter('simplify', 0, true) as boolean;
	const availabilityExceptionFields = simplify
		? []
		: (this.getNodeParameter('availabilityExceptionFields', 0, []) as string[]);
	const listingFields = simplify ? [] : (this.getNodeParameter('listingFields', 0, []) as string[]);
	const listingId = this.getNodeParameter('listingId', 0) as string;
	const start = this.getNodeParameter('start', 0) as DateTime;
	const end = this.getNodeParameter('end', 0) as DateTime;

	validateValidUuid(this, 0, listingId, UI_RESOURCES.LISTING);

	if (!start?.isValid || !end?.isValid) {
		throw new NodeOperationError(this.getNode(), "Both 'Start' and 'End' must be provided");
	}

	// Convert to UTC for validation - preserve time value with keepLocalTime
	const startUtc = start.setZone('utc', { keepLocalTime: true });
	const endUtc = end.setZone('utc', { keepLocalTime: true });
	validateAvailabilityExceptionTimeRange(this, 0, startUtc, endUtc);

	// Build query params using fluent builder - pass raw DateTime, builder handles UTC conversion
	const { qs, resultOptions } = new AvailabilityExceptionsQueryBuilder(this)
		.withOptions({
			nodeOptions: { outputFields: { availabilityExceptionFields, listingFields } },
			simplify,
			returnAll: this.getNodeParameter('returnAll', 0, false) as boolean,
			limit: this.getNodeParameter('limit', 0, DEFAULT_QUERY_LIMIT) as number,
		})
		.withQueryParams({
			listingId,
			start,
			end,
		})
		.build();

	const sharetribe = new Sharetribe(this);
	const { data, meta } = await sharetribe.query(
		ENDPOINTS.AVAILABILITY_EXCEPTIONS_QUERY,
		qs,
		resultOptions,
	);

	returnData.push(...data);

	const summary = generateExecutionSummary(this, returnData.length, meta);
	this.addExecutionHints({
		message: summary,
		location: 'outputPane',
	});

	hintMultipleInputItems(this, items.length);

	return [returnData];
}

export { execute as getMany };
