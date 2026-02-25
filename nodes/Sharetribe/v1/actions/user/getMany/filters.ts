import type { IDataObject } from 'n8n-workflow';

/**
 * Builds filter array from user filterOptions
 * Handles all user-specific filters
 */
export function buildUserFilters(filterOptions: IDataObject): IDataObject[] {
	const filters: IDataObject[] = [];

	// Simple filters (direct values)
	if (filterOptions.createdAtStart) {
		filters.push({
			filterType: 'createdAtStart',
			createdAtStartTime: filterOptions.createdAtStart,
		});
	}
	if (filterOptions.createdAtEnd) {
		filters.push({ filterType: 'createdAtEnd', createdAtEndTime: filterOptions.createdAtEnd });
	}
	if (filterOptions.userType) {
		filters.push({ filterType: 'userType', userType: filterOptions.userType });
	}

	// FixedCollection filters - extract nested properties
	if (filterOptions.metadata) {
		const metaData = filterOptions.metadata as IDataObject;
		const metaFilter = metaData.metadataFilter as IDataObject;
		if (metaFilter) {
			filters.push({ filterType: 'metadata', ...metaFilter });
		}
	}
	if (filterOptions.privateData) {
		const privData = filterOptions.privateData as IDataObject;
		const privFilter = privData.privateDataFilter as IDataObject;
		if (privFilter) {
			filters.push({ filterType: 'privateData', ...privFilter });
		}
	}
	if (filterOptions.protectedData) {
		const protData = filterOptions.protectedData as IDataObject;
		const protFilter = protData.protectedDataFilter as IDataObject;
		if (protFilter) {
			filters.push({ filterType: 'protectedData', ...protFilter });
		}
	}
	if (filterOptions.publicData) {
		const pubData = filterOptions.publicData as IDataObject;
		const pubFilter = pubData.publicDataFilter as IDataObject;
		if (pubFilter) {
			filters.push({ filterType: 'publicData', ...pubFilter });
		}
	}

	return filters;
}
