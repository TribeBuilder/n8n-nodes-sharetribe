import type { IDataObject } from 'n8n-workflow';
import { DateTime } from 'luxon';
import {
	convertToUtcIso8601,
	normalizeBounds,
	normalizeOrigin,
	getResourceLocatorValue,
} from '../../../helpers/Sharetribe.utils';
import { LISTING_FILTER_METADATA } from '../../../helpers/Sharetribe.types';

/**
 * Builds filter array from listing filterOptions
 */
export function buildListingFilters(filterOptions: IDataObject): IDataObject[] {
	const filters: IDataObject[] = [];

	if (filterOptions.authorId) {
		filters.push({ filterType: 'authorId', authorId: filterOptions.authorId });
	}
	if (filterOptions.createdAtStartTime) {
		filters.push({
			filterType: 'createdAtStart',
			createdAtStartTime: filterOptions.createdAtStartTime,
		});
	}
	if (filterOptions.createdAtEndTime) {
		filters.push({ filterType: 'createdAtEnd', createdAtEndTime: filterOptions.createdAtEndTime });
	}
	if (filterOptions.keywords) {
		filters.push({ filterType: 'keywords', keywords: filterOptions.keywords });
	}
	if (filterOptions.ids) {
		filters.push({ filterType: 'ids', ids: filterOptions.ids });
	}
	if (filterOptions.states) {
		filters.push({ filterType: 'states', states: filterOptions.states });
	}
	if (filterOptions.listingType) {
		filters.push({ filterType: 'listingType', listingType: filterOptions.listingType });
	}
	if (filterOptions.origin) {
		filters.push({ filterType: 'origin', origin: filterOptions.origin });
	}

	if (filterOptions.availability) {
		const availData = filterOptions.availability as IDataObject;
		const availFilter = availData.availabilityFilter as IDataObject;
		if (availFilter) {
			filters.push({ filterType: 'availability', ...availFilter });
		}
	}
	if (filterOptions.bounds) {
		const boundsData = filterOptions.bounds as IDataObject;
		const boundsFilter = boundsData.boundsFilter as IDataObject;
		if (boundsFilter) {
			filters.push({ filterType: 'bounds', ...boundsFilter });
		}
	}
	if (filterOptions.category) {
		const catData = filterOptions.category as IDataObject;
		const catFilter = catData.categoryFilter as IDataObject;
		if (catFilter) {
			if (catFilter.categoryLevel1) {
				filters.push({ filterType: 'categoryLevel1', categoryLevel1: catFilter.categoryLevel1 });
			}
			if (catFilter.categoryLevel2) {
				filters.push({ filterType: 'categoryLevel2', categoryLevel2: catFilter.categoryLevel2 });
			}
			if (catFilter.categoryLevel3) {
				filters.push({ filterType: 'categoryLevel3', categoryLevel3: catFilter.categoryLevel3 });
			}
		}
	}
	if (filterOptions.metadata) {
		const metaData = filterOptions.metadata as IDataObject;
		const metaFilter = metaData.metadataFilter as IDataObject;
		if (metaFilter) {
			filters.push({ filterType: 'metadata', ...metaFilter });
		}
	}
	if (filterOptions.price) {
		const priceData = filterOptions.price as IDataObject;
		const priceFilter = priceData.priceFilter as IDataObject;
		if (priceFilter) {
			filters.push({ filterType: 'price', ...priceFilter });
		}
	}
	if (filterOptions.privateData) {
		const privData = filterOptions.privateData as IDataObject;
		const privFilter = privData.privateDataFilter as IDataObject;
		if (privFilter) {
			filters.push({ filterType: 'privateData', ...privFilter });
		}
	}
	if (filterOptions.publicData) {
		const pubData = filterOptions.publicData as IDataObject;
		const pubFilter = pubData.publicDataFilter as IDataObject;
		if (pubFilter) {
			filters.push({ filterType: 'publicData', ...pubFilter });
		}
	}
	if (filterOptions.stock) {
		const stockData = filterOptions.stock as IDataObject;
		const stockSettings = stockData.settings as IDataObject;
		if (stockSettings) {
			filters.push({ filterType: 'stock', ...stockSettings });
		}
	}

	return filters;
}

/**
 * Applies a single listing filter
 */
function applySingleListingFilter(filter: IDataObject, qs: IDataObject): void {
	const filterType = filter.filterType as string;

	if (filterType === 'availability') {
		if (filter.availabilityStart) {
			qs.start = convertToUtcIso8601(filter.availabilityStart as DateTime | string);
		}
		if (filter.availabilityEnd) {
			qs.end = convertToUtcIso8601(filter.availabilityEnd as DateTime | string);
		}

		// Default to partial match; check if user wants full range match
		const settings = filter.availabilitySettings as string[] | undefined;
		const partialMatch = !(settings && settings.includes('fullRangeMatch'));
		const planType = filter.availabilityPlanType as string;

		if (planType === 'daily-nightly') {
			qs.availability = partialMatch ? 'day-partial' : 'day-full';
		} else if (planType === 'hourly-fixed') {
			qs.availability = partialMatch ? 'time-partial' : 'time-full';
		} else {
			// Default: if no plan type specified, default to time-partial (or time-full if fullRangeMatch)
			qs.availability = partialMatch ? 'time-partial' : 'time-full';
		}

		if (filter.availabilitySeats) {
			qs.seats = filter.availabilitySeats;
		}

		if (filter.availabilityMinDuration) {
			qs.minDuration = filter.availabilityMinDuration;
		}
	}

	if (filterType === 'bounds') {
		const normalizedBounds = normalizeBounds(filter.boundsNE, filter.boundsSW);
		if (normalizedBounds) {
			qs.bounds = normalizedBounds;
		}
	}

	if (filterType === 'ids' && filter.ids) {
		qs.ids = filter.ids;
	}

	if (filterType === 'keywords' && filter.keywords) {
		qs.keywords = filter.keywords;
	}

	if (filterType === 'origin' && filter.origin) {
		const normalizedOrigin = normalizeOrigin(filter.origin);
		if (normalizedOrigin) {
			qs.origin = normalizedOrigin;
		}
	}

	if (filterType === 'stock' && filter.stockOptions) {
		const stockOptions = filter.stockOptions as IDataObject;
		const settings = stockOptions.settings as IDataObject;

		if (settings) {
			if (settings.stockMode) {
				qs.stockMode = settings.stockMode;
			}
			if (settings.minStock) {
				qs.minStock = settings.minStock;
			}
		}
	}

	if (filterType === 'price') {
		const rangeType = filter.priceRangeType || 'exact';

		if (rangeType === 'exact' && filter.price) {
			qs.price = filter.price;
		} else if (rangeType === 'range' && (filter.priceMin || filter.priceMax)) {
			const min = filter.priceMin || '';
			const max = filter.priceMax || '';
			qs.price = `${min},${max}`;
		} else if (rangeType === 'minimum' && filter.priceMin) {
			qs.price = `${filter.priceMin},`;
		} else if (rangeType === 'maximum' && filter.priceMax) {
			qs.price = `,${filter.priceMax}`;
		}
	}

	const categories = ['categoryLevel1', 'categoryLevel2', 'categoryLevel3'];
	for (const category of categories) {
		if (filterType === category && filter[category]) {
			const categoryValue = getResourceLocatorValue(filter[category]);
			if (categoryValue) qs[`pub_${category}`] = categoryValue;
		}
	}

	if (filterType === 'listingType' && filter.listingType) {
		const listingTypeValue = getResourceLocatorValue(filter.listingType);
		if (listingTypeValue) qs.pub_listingType = listingTypeValue;
	}

	// Extended data filters (metadata, publicData, etc.) are handled by BaseQueryBuilder.addFiltersToQueryParams()
}

/**
 * Applies repeatable listing filters by combining multiple values with commas
 */
function applyRepeatableListingFilters(
	filterType: string,
	filterGroup: IDataObject[],
	qs: IDataObject,
): void {
	// Handle category filters
	const categories = ['categoryLevel1', 'categoryLevel2', 'categoryLevel3'];
	if (categories.includes(filterType)) {
		const values = filterGroup
			.map((filter) => getResourceLocatorValue(filter[filterType]))
			.filter((v): v is string => Boolean(v));
		if (values.length > 0) {
			qs[`pub_${filterType}`] = values;
		}
		return;
	}

	// Handle listing type filter
	if (filterType === 'listingType') {
		const values = filterGroup
			.map((filter) => getResourceLocatorValue(filter.listingType))
			.filter((v): v is string => Boolean(v));
		if (values.length > 0) {
			qs.pub_listingType = values;
		}
		return;
	}

	// Extended data filters - each can have different attribute names, so process individually
	const extendedDataTypes = ['metadata', 'privateData', 'protectedData', 'publicData'];
	if (extendedDataTypes.includes(filterType)) {
		for (const filter of filterGroup) {
			applySingleListingFilter(filter, qs);
		}
		return;
	}

	// For other repeatable filters, apply each individually
	for (const filter of filterGroup) {
		applySingleListingFilter(filter, qs);
	}
}

/**
 * Apply listing-specific filters to query string
 * Groups filters by type and handles repeatable vs non-repeatable filters
 */
export function applyListingSpecificFilters(filters: IDataObject[], qs: IDataObject): void {
	// Group filters by filterType
	const groupedFilters: Record<string, IDataObject[]> = {};
	for (const filter of filters) {
		const filterType = filter.filterType as string;
		if (!groupedFilters[filterType]) {
			groupedFilters[filterType] = [];
		}
		groupedFilters[filterType].push(filter);
	}

	// Process each filter type
	for (const [filterType, filterGroup] of Object.entries(groupedFilters)) {
		const isRepeatable = LISTING_FILTER_METADATA[filterType]?.repeatable ?? true;

		// For repeatable filters with multiple instances, combine values with commas
		if (isRepeatable && filterGroup.length > 1) {
			applyRepeatableListingFilters(filterType, filterGroup, qs);
		} else {
			// For non-repeatable or single instance, process normally
			applySingleListingFilter(filterGroup[0], qs);
		}
	}
}
