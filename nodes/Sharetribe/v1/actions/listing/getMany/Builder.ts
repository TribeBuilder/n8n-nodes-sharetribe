import type { IDataObject } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { DateTime } from 'luxon';
import { BaseQueryBuilder } from '../../../helpers/builders/BaseQueryBuilder';
import { API_RESOURCES, type ResultOptions } from '../../../helpers/Sharetribe.types';
import { buildListingFilters, applyListingSpecificFilters } from './filters';
import { validateListingAvailabilityFilterRange } from '../../../helpers/Sharetribe.utils';

/**
 * Fluent builder for building listing query parameters
 * Each method builds its part of the query
 */
export class ListingQueryBuilder extends BaseQueryBuilder {
	private filterOptions: IDataObject = {};
	private useAvailabilityCursor: boolean = false;

	static requiresAvailabilityCursor(filterOptions: IDataObject): boolean {
		const availabilityFilter = (filterOptions.availability as IDataObject | undefined)
			?.availabilityFilter as IDataObject | undefined;
		if (!availabilityFilter) return false;
		const planType = availabilityFilter.availabilityPlanType as string;
		const minDuration = availabilityFilter.availabilityMinDuration as number;
		const settings = availabilityFilter.availabilitySettings as string[] | undefined;
		const partialMatch = !(settings && settings.includes('fullRangeMatch'));
		// When no plan type is specified, defaults to time-partial (same cursor requirement as hourly-fixed)
		const isTimeBased = !planType || planType === 'hourly-fixed';
		return isTimeBased || (planType === 'daily-nightly' && partialMatch && minDuration > 0);
	}

	withFilters(filterOptions: IDataObject): this {
		this.filterOptions = filterOptions;

		// Validate filters
		const hasKeywordsFilter =
			filterOptions.keywords !== undefined &&
			filterOptions.keywords !== null &&
			filterOptions.keywords !== '';
		const hasOriginFilter =
			filterOptions.origin !== undefined &&
			filterOptions.origin !== null &&
			filterOptions.origin !== '';

		if (hasKeywordsFilter && hasOriginFilter) {
			throw new NodeOperationError(
				this.context.getNode(),
				'Cannot use both origin and keyword filters together.',
			);
		}

		// Build and add filters to qs
		const filters = buildListingFilters(filterOptions);
		if (filters.length > 0) {
			this.addFiltersToQueryParams(filters, this.qs, this.context.getNode());
			applyListingSpecificFilters(filters, this.qs);
		}

		// Check for availability-based pagination requirements
		const availabilityData = filterOptions.availability as IDataObject | undefined;
		const availabilityFilter = availabilityData?.availabilityFilter as IDataObject | undefined;

		if (availabilityFilter) {
			const startRaw = availabilityFilter.availabilityStart as DateTime | string | undefined;
			const endRaw = availabilityFilter.availabilityEnd as DateTime | string | undefined;

			const startDt = typeof startRaw === 'string' ? DateTime.fromISO(startRaw) : startRaw;
			const endDt = typeof endRaw === 'string' ? DateTime.fromISO(endRaw) : endRaw;

			if (!startDt?.isValid || !endDt?.isValid) {
				throw new NodeOperationError(
					this.context.getNode(),
					"Both availability 'Start' and 'End' must be provided for availability filtering.",
				);
			}

			const startUtc = startDt.setZone('utc', { keepLocalTime: true });
			const endUtc = endDt.setZone('utc', { keepLocalTime: true });
			validateListingAvailabilityFilterRange(this.context, startUtc, endUtc);

			if (ListingQueryBuilder.requiresAvailabilityCursor(filterOptions)) {
				this.useAvailabilityCursor = true;
				this.qs.sort = '-createdAt';
			}
		}

		return this;
	}

	withSort(sortOptions: IDataObject): this {
		if (!this.useAvailabilityCursor) {
			const sortArray = this.buildSortArray(sortOptions, this.filterOptions);
			if (sortArray) {
				this.qs.sort = sortArray;
			}
		}
		return this;
	}

	withOptions(options: {
		nodeOptions: IDataObject;
		simplify: boolean;
		countOnly: boolean;
		returnAll: boolean;
		limit: number;
	}): this {
		this.simplify = options.simplify;
		this.countOnly = options.countOnly;
		this.returnAll = options.returnAll;
		this.limit = options.limit;
		this.deferredApiResource = API_RESOURCES.LISTING;
		this.deferredFieldsKey = 'listingFields';
		this.deferredOptions = options.nodeOptions;
		return this;
	}

	build(): { qs: IDataObject; resultOptions: ResultOptions; useAvailabilityCursor: boolean } {
		this.applyDeferredOutputModeParams();
		const resultOptions = this.buildResultOptions();
		return { qs: this.qs, resultOptions, useAvailabilityCursor: this.useAvailabilityCursor };
	}
}
