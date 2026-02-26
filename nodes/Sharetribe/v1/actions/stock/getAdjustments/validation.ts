import type { IExecuteFunctions } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { DateTime } from 'luxon';

/**
 * Validates time range for stock adjustments query.
 * According to Sharetribe API:
 * - Start must be between 366 days in the past and 1 day in the future
 * - End must be after start
 * - End must be at most 1 day in the future
 * - End must be at most 366 days from start
 */
export function validateStockAdjustmentTimeRange(
	context: IExecuteFunctions,
	itemIndex: number,
	createdAfter: DateTime,
	createdBefore: DateTime,
): void {
	// Validate start is between 366 days past and 1 day future
	const past366Days = createdAfter.minus({ days: 366 });
	const future1Day = DateTime.now().setZone('utc', { keepLocalTime: true }).plus({ days: 1 });

	if (createdAfter < past366Days || createdAfter > future1Day) {
		const allowedRange = `${past366Days.toFormat('yyyy-MM-dd HH:mm:ss')} to ${future1Day.toFormat('yyyy-MM-dd HH:mm:ss')} UTC`;
		throw new NodeOperationError(
			context.getNode(),
			'Invalid start time for stock adjustments query',
			{
				itemIndex,
				description: `Start time must be between 366 days in the past and 1 day in the future.<br><br>Received: ${createdAfter.toFormat('yyyy-MM-dd HH:mm:ss')} UTC<br>Allowed range: ${allowedRange}`,
			},
		);
	}

	// Validate end is after start
	if (createdBefore <= createdAfter) {
		throw new NodeOperationError(
			context.getNode(),
			'Invalid time range: End time must be after start time',
			{
				itemIndex,
				description: `Start: ${createdAfter.toFormat('yyyy-MM-dd HH:mm:ss')} UTC<br>End: ${createdBefore.toFormat('yyyy-MM-dd HH:mm:ss')} UTC<br><br>The end time must be later than the start time.`,
			},
		);
	}

	// Validate end is at most 1 day in future
	if (createdBefore >= future1Day) {
		throw new NodeOperationError(
			context.getNode(),
			'Invalid end time for stock adjustments query',
			{
				itemIndex,
				description: `End time must be at most 1 day in the future.<br><br>Received: ${createdBefore.toFormat('yyyy-MM-dd HH:mm:ss')} UTC<br>Maximum allowed: ${future1Day.toFormat('yyyy-MM-dd HH:mm:ss')} UTC`,
			},
		);
	}

	// Validate end is at most 366 days from start
	const max366DaysFromStart = createdAfter.plus({ days: 366 });

	if (createdBefore > max366DaysFromStart) {
		const rangeInDays = Math.floor(createdBefore.diff(createdAfter, 'days').days);
		throw new NodeOperationError(
			context.getNode(),
			'Time range too large: Maximum 366 days allowed',
			{
				itemIndex,
				description: `The time range between start and end cannot exceed 366 days.<br><br>Start: ${createdAfter.toFormat('yyyy-MM-dd HH:mm:ss')} UTC<br>End: ${createdBefore.toFormat('yyyy-MM-dd HH:mm:ss')} UTC<br>Range: ${rangeInDays} days<br><br>Maximum allowed: 366 days`,
			},
		);
	}
}
