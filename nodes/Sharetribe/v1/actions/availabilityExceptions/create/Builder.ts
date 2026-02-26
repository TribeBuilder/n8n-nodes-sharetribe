import type { IDataObject, IExecuteFunctions } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { DateTime } from 'luxon';
import {
	validateValidUuid,
	validateAvailabilityExceptionTimeRange,
	validatePositiveInteger,
} from '../../../helpers/Sharetribe.utils';
import { validateSeatsGreaterThanZero } from './validation';
import { UI_RESOURCES } from '../../../helpers/Sharetribe.types';

/**
 * Fluent builder for creating availability exceptions
 */
export class AvailabilityExceptionCreateBuilder {
	private context: IExecuteFunctions;
	private itemIndex: number;
	private listingId?: string;
	private start?: DateTime;
	private end?: DateTime;
	private seats: number = 1;

	constructor(context: IExecuteFunctions, itemIndex: number) {
		this.context = context;
		this.itemIndex = itemIndex;
	}

	withListingId(listingId: string): this {
		validateValidUuid(this.context, this.itemIndex, listingId, UI_RESOURCES.LISTING);
		this.listingId = listingId;
		return this;
	}

	withDateTime(params: {
		allDay: boolean;
		date?: DateTime;
		start?: DateTime;
		end?: DateTime;
	}): this {
		if (params.allDay) {
			if (!params.date?.isValid) {
				throw new NodeOperationError(
					this.context.getNode(),
					'Date is required when allDay is true',
					{ itemIndex: this.itemIndex },
				);
			}
			// Set to 00:00:00 UTC through to next day 00:00:00 UTC
			const startUtc = params.date.startOf('day').setZone('utc', { keepLocalTime: true });
			const endUtc = startUtc.plus({ days: 1 });
			validateAvailabilityExceptionTimeRange(this.context, this.itemIndex, startUtc, endUtc);

			this.start = startUtc;
			this.end = endUtc;
		} else {
			if (!params.start?.isValid || !params.end?.isValid) {
				throw new NodeOperationError(
					this.context.getNode(),
					'Start and end are required when allDay is false',
					{ itemIndex: this.itemIndex },
				);
			}
			// Convert to UTC and validate
			const startUtc = params.start.setZone('utc', { keepLocalTime: true });
			const endUtc = params.end.setZone('utc', { keepLocalTime: true });
			validateAvailabilityExceptionTimeRange(this.context, this.itemIndex, startUtc, endUtc);

			this.start = startUtc;
			this.end = endUtc;
		}
		return this;
	}

	withAvailability(available: boolean, seats?: number): this {
		if (available && seats !== undefined) {
			validatePositiveInteger(this.context, this.itemIndex, { value: seats, fieldName: 'seats' });
			validateSeatsGreaterThanZero(this.context, this.itemIndex, seats);
			this.seats = seats;
		} else {
			this.seats = 0;
		}
		return this;
	}

	build(): IDataObject {
		if (!this.listingId || !this.start || !this.end) {
			throw new NodeOperationError(
				this.context.getNode(),
				'Missing required parameters for availability exception',
				{
					itemIndex: this.itemIndex,
					description: 'listingId, start, and end are required to create an availability exception',
				},
			);
		}

		return {
			listingId: this.listingId,
			start: this.start.toISO(),
			end: this.end.toISO(),
			seats: this.seats,
		};
	}
}
