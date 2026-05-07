/**
 * Load Options - Auto-populate resource locator dropdown options for:
 * Transactions, Listings, Users.
 *
 * Data is auto populated by querying and learning from 100 recent
 * transactions, listings and users. Categories and listing types come from asset data.
 *
 * Data learned includes:
 *
 * Transaction: states, transition names, process names, searchable protected and metadata attributes.
 * Listing: Listing types, searchable public, private and metadata attributes.
 * User: User types, searchable public, private, protected and metadata attributes.
 *
 */

import type {
	IDataObject,
	ILoadOptionsFunctions,
	INodePropertyOptions,
	INodeListSearchResult,
} from 'n8n-workflow';
import {
	PREDEFINED_PUBLIC_DATA_FIELDS,
	CurrencyCode,
	listSearchAssetCall,
	applyFilterToResults,
	toSortedOptions,
	fieldsToOptions,
	fieldsToOptionsWithLabels,
	getCategoryIdFromFilterOptions,
	categoriesToOptions,
	getCategoriesAtLevel,
	discoverAndValidateFields,
	discoverListingExtendedDataFields,
	discoverTransactionExtendedDataFields,
	discoverTransactionProcessInfo,
	discoverUserExtendedDataFields,
	getIndexedListingFieldsFromAsset,
	getNumberFieldsFromListingAsset,
	getNumberFieldsFromUserAsset,
	getUserFieldsFromAsset,
	type Category,
	type ListingTypesAssetResponse,
	type ListingCategoriesAssetResponse,
	type UserTypesAssetResponse,
} from '../helpers/Sharetribe';

export async function getProcessNames(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	const processes = await discoverTransactionProcessInfo(this, 'processes');
	return toSortedOptions(processes, undefined, filter);
}

export async function getTransactionStates(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	const states = await discoverTransactionProcessInfo(this, 'states');
	return toSortedOptions(states, 'state/', filter);
}

const DEFAULT_OPERATOR_TRANSITIONS = new Set([
	'transition/operator-accept',
	'transition/operator-decline',
	'transition/operator-complete',
	'transition/cancel',
	'transition/operator-reject-request',
	'transition/operator-accept-update',
	'transition/operator-reject-offer',
	'transition/operator-reject-from-customer-counter-offer',
	'transition/operator-mark-delivered',
	'transition/operator-request-changes',
	'transition/operator-mark-changes-delivered',
	'transition/operator-cancel-from-changes-requested',
	'transition/operator-cancel-from-delivered',
	'transition/operator-accept-deliverable',
	'transition/operator-dispute',
	'transition/mark-received-from-disputed',
	'transition/cancel-from-disputed',
]);

export async function getTransitions(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	return toSortedOptions(DEFAULT_OPERATOR_TRANSITIONS, 'transition/', filter);
}


export async function getSortableMetadataAttributes(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	const resource = this.getNodeParameter('resource', 0) as string;
	const asset =
		resource === 'listing' || resource === 'transaction'
			? await getNumberFieldsFromListingAsset(this, 'metadata')
			: await getNumberFieldsFromUserAsset(this, 'public'); // user metadata not in asset; fall through
	if (asset.fields.size === 0) {
		return fieldsToOptions(new Set(), 'metadata.', filter);
	}
	return fieldsToOptionsWithLabels(asset.fields, 'metadata.', asset.labels, filter);
}

export async function getSortablePublicDataAttributes(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	const resource = this.getNodeParameter('resource', 0) as string;
	const asset =
		resource === 'listing'
			? await getNumberFieldsFromListingAsset(this, 'public')
			: await getNumberFieldsFromUserAsset(this, 'public');
	if (asset.fields.size === 0) {
		return fieldsToOptions(new Set(), 'publicData.', filter);
	}
	return fieldsToOptionsWithLabels(asset.fields, 'publicData.', asset.labels, filter);
}

export async function getSortablePrivateDataAttributes(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	const resource = this.getNodeParameter('resource', 0) as string;
	const asset =
		resource === 'listing'
			? await getNumberFieldsFromListingAsset(this, 'private')
			: await getNumberFieldsFromUserAsset(this, 'private');
	if (asset.fields.size === 0) {
		return fieldsToOptions(new Set(), 'privateData.', filter);
	}
	return fieldsToOptionsWithLabels(asset.fields, 'privateData.', asset.labels, filter);
}

export async function getSortableProtectedDataAttributes(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	const resource = this.getNodeParameter('resource', 0) as string;
	const asset =
		resource === 'user'
			? await getNumberFieldsFromUserAsset(this, 'protected')
			: { fields: new Set<string>(), labels: new Map<string, string>() };
	if (asset.fields.size === 0) {
		return fieldsToOptions(new Set(), 'protectedData.', filter);
	}
	return fieldsToOptionsWithLabels(asset.fields, 'protectedData.', asset.labels, filter);
}

export async function getMetadataAttributes(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	const resource = this.getNodeParameter('resource', 0) as 'listing' | 'transaction' | 'user';
	const fields = await discoverAndValidateFields(this, resource, 'metadata');
	return fieldsToOptions(fields, 'metadata.', filter);
}

export async function getPublicDataAttributes(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	const resource = this.getNodeParameter('resource', 0) as 'listing' | 'user';
	const predefinedFields = new Set(PREDEFINED_PUBLIC_DATA_FIELDS);
	let labelMap = new Map<string, string>();

	if (resource === 'listing') {
		const assetData = await getIndexedListingFieldsFromAsset(this, 'public');
		labelMap = assetData.all;

		// Discovery + binary validation for live data fields
		const fields = await discoverAndValidateFields(this, resource, 'publicData');

		// Add indexed asset fields directly — pre-validated, no binary search needed
		for (const [fieldValue] of assetData.indexed) {
			if (!predefinedFields.has(fieldValue)) {
				fields.add(fieldValue);
			}
		}

		return fieldsToOptionsWithLabels(
			fields,
			'publicData.',
			labelMap,
			filter,
			predefinedFields,
			assetData.descriptions,
		);
	} else {
		// User: asset provides field names but no filterability info
		const assetFields = await getUserFieldsFromAsset(this, 'public');
		labelMap = assetFields.labels;

		// Pass asset field names as preKnownFields so they enter binary validation
		const preKnown = new Set(assetFields.labels.keys());
		const fields = await discoverAndValidateFields(this, resource, 'publicData', preKnown);

		return fieldsToOptionsWithLabels(
			fields,
			'publicData.',
			labelMap,
			filter,
			predefinedFields,
			assetFields.descriptions,
		);
	}
}

export async function getPrivateDataAttributes(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	const resource = this.getNodeParameter('resource', 0) as 'listing' | 'user';

	if (resource === 'listing') {
		const assetData = await getIndexedListingFieldsFromAsset(this, 'private');
		const fields = await discoverAndValidateFields(this, resource, 'privateData');

		// Add indexed asset fields directly — pre-validated
		for (const [fieldValue] of assetData.indexed) {
			fields.add(fieldValue);
		}

		return fieldsToOptionsWithLabels(
			fields,
			'privateData.',
			assetData.all,
			filter,
			undefined,
			assetData.descriptions,
		);
	} else {
		// User: asset provides field names for binary validation
		const assetFields = await getUserFieldsFromAsset(this, 'private');
		const preKnown = new Set(assetFields.labels.keys());
		const fields = await discoverAndValidateFields(this, resource, 'privateData', preKnown);

		return fieldsToOptionsWithLabels(
			fields,
			'privateData.',
			assetFields.labels,
			filter,
			undefined,
			assetFields.descriptions,
		);
	}
}

export async function getProtectedDataAttributes(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	const resource = this.getNodeParameter('resource', 0) as 'transaction' | 'user';
	const fields = await discoverAndValidateFields(this, resource, 'protectedData');
	return fieldsToOptions(fields, 'protectedData.', filter);
}

export async function getUserTypes(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	const response = await listSearchAssetCall<UserTypesAssetResponse>(this, 'users/user-types.json');

	const userTypes = response.data[0]?.attributes?.data?.userTypes || [];

	const results: INodePropertyOptions[] = userTypes.map((type) => {
		const value = type.id;
		let name = type.label;

		// If label looks like an identifier (snake_case/kebab-case), format it
		if (name === value && /^[a-z0-9_-]+$/.test(name)) {
			name = name
				.split(/[_-]/)
				.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
				.join(' ');
		}

		return { name, value };
	});

	results.sort((a, b) => a.name.localeCompare(b.name));

	return { results: applyFilterToResults(results, filter) };
}

export async function getListingTypes(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	const response = await listSearchAssetCall<ListingTypesAssetResponse>(
		this,
		'listings/listing-types.json',
	);

	// Response structure: { data: [{ attributes: { data: { listingTypes: [...] } } }] }
	const listingTypes = response.data[0]?.attributes?.data?.listingTypes || [];

	const results: INodePropertyOptions[] = listingTypes.map((type) => {
		const value = type.id;
		let name = type.label;

		// If label looks like an identifier (snake_case/kebab-case), format it
		if (name === value && /^[a-z0-9_-]+$/.test(name)) {
			name = name
				.split(/[_-]/)
				.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
				.join(' ');
		}

		return { name, value };
	});

	results.sort((a, b) => a.name.localeCompare(b.name));

	return { results: applyFilterToResults(results, filter) };
}

export async function getCategoryLevel1(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	const categories = await getCategoriesAtLevel(this, []);
	const results = categoriesToOptions(categories);
	return { results: applyFilterToResults(results, filter) };
}

export async function getCategoryLevel2(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	const filterOptions = this.getNodeParameter('filterOptions', undefined, {
		extractValue: true,
	}) as IDataObject;

	const level1Id = getCategoryIdFromFilterOptions(filterOptions, 'categoryLevel1');

	let categories: Category[];
	if (level1Id) {
		// Filter by parent category
		categories = await getCategoriesAtLevel(this, [level1Id]);
	} else {
		// No parent selected - show all level 2 categories from all level 1 parents
		const response = await listSearchAssetCall<ListingCategoriesAssetResponse>(
			this,
			'listings/listing-categories.json',
		);
		const allLevel1 = response.data[0]?.attributes?.data?.categories || [];
		categories = allLevel1.flatMap((cat) => cat.subcategories || []);
	}

	const results = categoriesToOptions(categories);
	return { results: applyFilterToResults(results, filter) };
}

export async function getCategoryLevel3(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	const filterOptions = this.getNodeParameter('filterOptions', undefined, {
		extractValue: true,
	}) as IDataObject;

	const level1Id = getCategoryIdFromFilterOptions(filterOptions, 'categoryLevel1');
	const level2Id = getCategoryIdFromFilterOptions(filterOptions, 'categoryLevel2');

	let categories: Category[];
	if (level1Id && level2Id) {
		// Both parents selected - show filtered subcategories
		categories = await getCategoriesAtLevel(this, [level1Id, level2Id]);
	} else if (level1Id) {
		// Only level 1 selected - show all level 3 from that level 1's subcategories
		const level2Categories = await getCategoriesAtLevel(this, [level1Id]);
		categories = level2Categories.flatMap((cat) => cat.subcategories || []);
	} else {
		// No parents selected - show all level 3 categories from everywhere
		const response = await listSearchAssetCall<ListingCategoriesAssetResponse>(
			this,
			'listings/listing-categories.json',
		);
		const allLevel1 = response.data[0]?.attributes?.data?.categories || [];
		categories = allLevel1.flatMap((l1) =>
			(l1.subcategories || []).flatMap((l2) => l2.subcategories || []),
		);
	}

	const results = categoriesToOptions(categories);
	return { results: applyFilterToResults(results, filter) };
}

export async function getCurrencyCodes(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	const results: INodePropertyOptions[] = Object.values(CurrencyCode).map((code) => ({
		name: code,
		value: code,
	}));

	return { results: applyFilterToResults(results, filter) };
}

// Get user extended data fields - unified method that reads dataType from context
export async function getUserExtendedDataFields(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	// Get the dataType from the current parameter context
	const dataType = (this.getNodeParameter('fieldDeletions.deletions[0].dataType', 0, {
		extractValue: true,
	}) || 'metadata') as string;

	let scope: 'metadata' | 'publicData' | 'privateData' | 'protectedData';
	switch (dataType) {
		case 'publicData':
			scope = 'publicData';
			break;
		case 'privateData':
			scope = 'privateData';
			break;
		case 'protectedData':
			scope = 'protectedData';
			break;
		case 'metadata':
		default:
			scope = 'metadata';
			break;
	}

	const fields = await discoverUserExtendedDataFields(this, scope);

	const predefinedFields =
		scope === 'publicData' ? new Set(PREDEFINED_PUBLIC_DATA_FIELDS) : undefined;
	return fieldsToOptions(fields, `${scope}.`, filter, predefinedFields);
}
// Get listing extended data fields - unified method that reads dataType from context
export async function getListingExtendedDataFields(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	const dataType = (this.getNodeParameter('fieldDeletions.deletions[0].dataType', 0, {
		extractValue: true,
	}) || 'metadata') as string;

	let scope: 'metadata' | 'publicData' | 'privateData';
	switch (dataType) {
		case 'publicData':
			scope = 'publicData';
			break;
		case 'privateData':
			scope = 'privateData';
			break;
		case 'metadata':
		default:
			scope = 'metadata';
			break;
	}

	const fields = await discoverListingExtendedDataFields(this, scope);
	return fieldsToOptions(fields, `${scope}.`, filter);
}
// Get transaction extended data fields - unified method that reads dataType from context
export async function getTransactionExtendedDataFields(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	const dataType = (this.getNodeParameter('fieldDeletions.deletions[0].dataType', 0, {
		extractValue: true,
	}) || 'metadata') as string;

	let scope: 'metadata' | 'protectedData';
	switch (dataType) {
		case 'protectedData':
			scope = 'protectedData';
			break;
		case 'metadata':
		default:
			scope = 'metadata';
			break;
	}

	const fields = await discoverTransactionExtendedDataFields(this, scope);
	return fieldsToOptions(fields, `${scope}.`, filter);
}
