import type { IDataObject } from 'n8n-workflow';
import { DateTime } from 'luxon';
import { BaseQueryBuilder } from '../../../helpers/builders/BaseQueryBuilder';
import { API_RESOURCES, type ResultOptions } from '../../../helpers/Sharetribe.types';

/**
 * Fluent builder for availability exceptions query parameters
 */
export class AvailabilityExceptionsQueryBuilder extends BaseQueryBuilder {
	withQueryParams(params: { listingId: string; start: DateTime; end: DateTime }): this {
		this.qs.listingId = params.listingId;

		const startUtc = params.start.setZone('utc', { keepLocalTime: true });
		const endUtc = params.end.setZone('utc', { keepLocalTime: true });

		this.qs.start = startUtc.toISO();
		this.qs.end = endUtc.toISO();
		return this;
	}

	withOptions(options: {
		nodeOptions: IDataObject;
		simplify: boolean;
		returnAll: boolean;
		limit: number;
	}): this {
		this.simplify = options.simplify;
		this.returnAll = options.returnAll;
		this.limit = options.limit;
		this.deferredApiResource = API_RESOURCES.AVAILABILITY_EXCEPTIONS;
		this.deferredFieldsKey = 'availabilityExceptionFields';
		this.deferredOptions = options.nodeOptions;
		return this;
	}

	build(): { qs: IDataObject; resultOptions: ResultOptions } {
		this.applyDeferredOutputModeParams();
		const resultOptions = this.buildResultOptions();
		return { qs: this.qs, resultOptions };
	}
}
