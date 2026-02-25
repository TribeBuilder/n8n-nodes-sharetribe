import type { IDataObject, IExecuteFunctions } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { DateTime } from 'luxon';
import { validateValidUuid, validateTimeslotTimeRange } from '../../../helpers/Sharetribe.utils';
import { UI_RESOURCES } from '../../../helpers/Sharetribe.types';

export class TimeslotQueryBuilder {
	private context: IExecuteFunctions;
	private qs: IDataObject = {};
	private returnAll: boolean = false;
	private limit: number = 50;

	constructor(context: IExecuteFunctions) {
		this.context = context;
	}

	withListingId(listingId: string): this {
		validateValidUuid(this.context, 0, listingId, UI_RESOURCES.LISTING);
		this.qs.listingId = listingId;
		return this;
	}

	withDateRange(start: DateTime | string, end: DateTime | string): this {
		// Handle both DateTime objects and ISO strings
		const startDt = typeof start === 'string' ? DateTime.fromISO(start) : start;
		const endDt = typeof end === 'string' ? DateTime.fromISO(end) : end;

		if (!startDt?.isValid || !endDt?.isValid) {
			throw new NodeOperationError(
				this.context.getNode(),
				"Both 'Start' and 'End' dates must be provided",
			);
		}

		const startUtc = startDt.setZone('utc', { keepLocalTime: true });
		const endUtc = endDt.setZone('utc', { keepLocalTime: true });

		validateTimeslotTimeRange(this.context, startUtc, endUtc);

		this.qs.start = startUtc.toISO();
		this.qs.end = endUtc.toISO();
		return this;
	}

	withOptions(options: IDataObject): this {
		if (options.timeSlotGrouping) {
			const timeSlotGrouping = options.timeSlotGrouping as IDataObject;
			const duration = timeSlotGrouping.duration as IDataObject | undefined;
			if (duration) {
				const value = duration.value as number;
				const unit = duration.unit as string;

				// Convert to proper ISO 8601 period format
				let iso8601Duration: string;
				if (unit === 'minutes') {
					iso8601Duration = `PT${value}M`;
				} else if (unit === 'hours') {
					iso8601Duration = `PT${value}H`;
				} else if (unit === 'days') {
					iso8601Duration = `P${value}D`;
				} else if (unit === 'weeks') {
					iso8601Duration = `P${value}W`;
				} else {
					// Fallback to minutes
					iso8601Duration = `PT${value}M`;
				}

				this.qs.intervalDuration = iso8601Duration;
			}

			// Handle intervalAlign (alignment options)
			const alignmentOptions = timeSlotGrouping.alignmentOptions as IDataObject | undefined;
			if (alignmentOptions?.intervalAlign != undefined) {
				const intervalAlign = DateTime.fromISO(alignmentOptions.intervalAlign as string);
				const intervalAlignUtc = intervalAlign.setZone('utc', { keepLocalTime: true });
				this.qs.intervalAlign = intervalAlignUtc.toISO();
			}

			// Handle maxPerInterval (limit options)
			const limitOptions = timeSlotGrouping.limitOptions as IDataObject | undefined;
			if (limitOptions?.maxPerInterval && (limitOptions.maxPerInterval as number) > 0) {
				this.qs.maxPerInterval = limitOptions.maxPerInterval;
			}
		}

		// Handle expandTimeSlots - controls whether to include minDurationStartingInInterval
		if (options.expandTimeSlots === true) {
			// If user provided explicit minimum duration, use that
			if (options.minDurationStartingInInterval) {
				const minDurationStartingInInterval = options.minDurationStartingInInterval as IDataObject;
				const duration = minDurationStartingInInterval.duration as IDataObject | undefined;
				if (duration) {
					const value = duration.value as number;
					const unit = duration.unit as string;

					let minutes: number;
					if (unit === 'minutes') {
						minutes = value;
					} else if (unit === 'hours') {
						minutes = value * 60;
					} else if (unit === 'days') {
						minutes = value * 1440;
					} else if (unit === 'weeks') {
						minutes = value * 10080;
					} else {
						minutes = value;
					}

					this.qs.minDurationStartingInInterval = minutes;
				}
			} else {
				// Default to 5 minutes when expanding but no explicit duration provided
				this.qs.minDurationStartingInInterval = 5;
			}
		}

		return this;
	}

	withPagination(returnAll: boolean, limit: number): this {
		this.returnAll = returnAll;
		this.limit = limit;
		return this;
	}

	build(): { qs: IDataObject; returnAll: boolean; limit: number } {
		return {
			qs: this.qs,
			returnAll: this.returnAll,
			limit: this.limit,
		};
	}
}
