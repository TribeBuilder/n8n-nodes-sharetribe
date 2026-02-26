import type { IDataObject } from 'n8n-workflow';

/**
 * Builds filter array from transaction filterOptions
 * Handles all transaction-specific filters
 */
export function buildTransactionFilters(filterOptions: IDataObject): IDataObject[] {
	const filters: IDataObject[] = [];

	if (filterOptions.customerId) {
		filters.push({ filterType: 'customerId', customerId: filterOptions.customerId });
	}
	if (filterOptions.providerId) {
		filters.push({ filterType: 'providerId', providerId: filterOptions.providerId });
	}
	if (filterOptions.listingId) {
		filters.push({ filterType: 'listingId', listingId: filterOptions.listingId });
	}

	if (filterOptions.createdAtStart) {
		filters.push({
			filterType: 'createdAtStart',
			createdAtStartTime: filterOptions.createdAtStart,
		});
	}
	if (filterOptions.createdAtEnd) {
		filters.push({ filterType: 'createdAtEnd', createdAtEndTime: filterOptions.createdAtEnd });
	}

	if (filterOptions.bookingStart) {
		const bookingStartData = filterOptions.bookingStart as IDataObject;
		const bookingStartFilter = bookingStartData.bookingStartFilter as IDataObject;
		if (bookingStartFilter) {
			filters.push({ filterType: 'bookingStart', ...bookingStartFilter });
		}
	}
	if (filterOptions.bookingEnd) {
		const bookingEndData = filterOptions.bookingEnd as IDataObject;
		const bookingEndFilter = bookingEndData.bookingEndFilter as IDataObject;
		if (bookingEndFilter) {
			filters.push({ filterType: 'bookingEnd', ...bookingEndFilter });
		}
	}

	if (filterOptions.bookingStates) {
		filters.push({ filterType: 'bookingStates', bookingStates: filterOptions.bookingStates });
	}
	if (filterOptions.states) {
		filters.push({ filterType: 'states', states: filterOptions.states });
	}

	if (typeof filterOptions.hasBooking === 'boolean') {
		filters.push({ filterType: 'hasBooking', hasBooking: filterOptions.hasBooking });
	}
	if (typeof filterOptions.hasMessage === 'boolean') {
		filters.push({ filterType: 'hasMessage', hasMessage: filterOptions.hasMessage });
	}
	if (typeof filterOptions.hasPayin === 'boolean') {
		filters.push({ filterType: 'hasPayin', hasPayin: filterOptions.hasPayin });
	}
	if (typeof filterOptions.hasStockReservation === 'boolean') {
		filters.push({
			filterType: 'hasStockReservation',
			hasStockReservation: filterOptions.hasStockReservation,
		});
	}

	if (filterOptions.lastTransitions) {
		filters.push({ filterType: 'lastTransition', lastTransitions: filterOptions.lastTransitions });
	}
	if (filterOptions.processNames) {
		filters.push({ filterType: 'processNames', processNames: filterOptions.processNames });
	}

	if (filterOptions.metadata) {
		const metaData = filterOptions.metadata as IDataObject;
		const metaFilter = metaData.metadataFilter as IDataObject;
		if (metaFilter) {
			filters.push({ filterType: 'metadata', ...metaFilter });
		}
	}
	if (filterOptions.protectedData) {
		const protData = filterOptions.protectedData as IDataObject;
		const protFilter = protData.protectedDataFilter as IDataObject;
		if (protFilter) {
			filters.push({ filterType: 'protectedData', ...protFilter });
		}
	}

	return filters;
}
