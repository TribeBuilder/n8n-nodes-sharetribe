/**
 * Load Options - Auto-populate static dropdown options list
 *
 */

import {
	ILoadOptionsFunctions,
	INodePropertyOptions,
	IDataObject,
} from 'n8n-workflow';
import {
	BookingStates,
	CurrencyCode,
	LISTING_FILTER_METADATA,
	TRANSACTION_FILTER_METADATA,
	USER_FILTER_METADATA,
	SHARETRIBE_EVENT_TYPES,
} from '../helpers/Sharetribe.types';
import { assetRequest, getAnonymousToken } from '../transport';
import { flattenSharetribeResponse, resolveAssetReferences } from '../helpers/Sharetribe.utils';

export async function getBookingStates(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	const arr = Array.from(BookingStates).sort((a, b) => a.localeCompare(b));
	return arr.map((v) => ({
		name: v
			.replace(/^(state\/|transition\/)/, '')
			.split('-')
			.map((s) => s.charAt(0).toUpperCase() + s.slice(1))
			.join(' '),
		value: v,
	}));
}

export async function getCurrencyCodes(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	return Object.values(CurrencyCode).map((code) => ({
		name: code,
		value: code,
	}));
}

/**
 * Fetch keys from a specific asset for filtering
 */
async function getAssetKeys(
	ctx: ILoadOptionsFunctions,
	assetPath: string,
): Promise<INodePropertyOptions[]> {
	try {
		const response = await assetRequest.call(ctx, 'alias', [assetPath], 'latest');
		const included = (response.included as IDataObject[]) || [];
		const normalizedAssets = flattenSharetribeResponse(response as unknown as IDataObject);

		const resolvedAssets = normalizedAssets.map((asset) =>
			resolveAssetReferences(asset, included),
		) as IDataObject[];

		if (!resolvedAssets || resolvedAssets.length === 0) {
			return [];
		}

		const assetData = resolvedAssets[0].data as IDataObject;
		if (!assetData || typeof assetData !== 'object') {
			return [];
		}

		return Object.keys(assetData)
			.sort()
			.map((key) => ({
				name: key,
				value: key,
			}));
	} catch (error) {
		ctx.logger.error(`[Sharetribe] Failed to fetch asset keys from ${assetPath}: ${error}`);
		return [];
	}
}

export async function getTranslationsKeys(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	return getAssetKeys(this, '/content/translations.json');
}

export async function getEmailTextsKeys(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	return getAssetKeys(this, '/content/email-texts.json');
}

export async function getContentPageNames(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	try {
		const credentials = await this.getCredentials('sharetribeOAuth2Api');
		const marketplaceApiBaseUrl = credentials.marketplaceApiBaseUrl as string;
		const accessToken = await getAnonymousToken(this);
		const sitemapResponse = await this.helpers.httpRequest({
			method: 'GET',
			url: `${marketplaceApiBaseUrl}/v1/api/sitemap_data/query_assets?pathPrefix=/content/pages/`,
			headers: {
				Accept: 'application/json',
				Authorization: `Bearer ${accessToken}`,
			},
		});

		const pages = new Set<string>();

		// Extract page names from sitemap data
		if (sitemapResponse && Array.isArray(sitemapResponse.data)) {
			for (const item of sitemapResponse.data) {
				const assetPath = item.attributes?.assetPath as string;
				if (assetPath && assetPath.startsWith('/content/pages/')) {
					// Extract page name from path like "/content/pages/about.json"
					const pageName = assetPath.replace('/content/pages/', '').replace(/\.json$/, '');
					if (pageName) {
						pages.add(pageName);
					}
				}
			}
		}

		if (pages.size === 0) {
			const defaultPages = ['about', 'landing-page', 'privacy-policy', 'terms-of-service', 'faq'];
			defaultPages.forEach((page) => pages.add(page));
		}

		const pageArray = Array.from(pages).sort();
		return pageArray.map((page) => ({
			name: page
				.split('-')
				.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
				.join(' '),
			value: page,
			description: `Content page: ${page}`,
		}));
	} catch (error) {
		this.logger.warn(
			`[Sharetribe] Failed to fetch content pages from Marketplace API, returning defaults: ${error}`,
		);
		const defaultPages = ['about', 'landing-page', 'privacy-policy', 'terms-of-service', 'faq'];
		return defaultPages.map((page) => ({
			name: page
				.split('-')
				.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
				.join(' '),
			value: page,
			description: `Content page: ${page}`,
		}));
	}
}

export async function getAssetPaths(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const commonAssets: Array<{ path: string; name: string; description?: string }> = [
		{
			path: '/content/email-texts.json',
			name: 'Content - Email Texts',
			description: 'Email template texts',
		},
		{
			path: '/content/footer.json',
			name: 'Content - Footer',
			description: 'Footer content and links',
		},
		{
			path: '/content/top-bar.json',
			name: 'Content - Top Bar',
			description: 'Top bar navigation configuration',
		},
		{
			path: '/content/translations.json',
			name: 'Content - Translations',
			description: 'Custom text translations',
		},
		{
			path: '/design/branding.json',
			name: 'Design - Branding',
			description: 'Brand colors, logos, and visual identity',
		},
		{
			path: '/design/layout.json',
			name: 'Design - Layout',
			description: 'Layout configuration',
		},
		{
			path: '/general/access-control.json',
			name: 'General - Access Control',
			description: 'Access control configuration',
		},
		{
			path: '/general/localization.json',
			name: 'General - Localization',
			description: 'Marketplace locale and currency settings',
		},
		{
			path: '/integrations/analytics.json',
			name: 'Integrations - Analytics',
			description: 'Analytics integration settings',
		},
		{
			path: '/integrations/google-search-console.json',
			name: 'Integrations - Google Search Console',
			description: 'Google Search Console verification',
		},
		{
			path: '/integrations/map.json',
			name: 'Integrations - Map',
			description: 'Map integration settings',
		},
		{
			path: '/listings/listing-categories.json',
			name: 'Listings - Categories',
			description: 'Listing category hierarchy',
		},
		{
			path: '/listings/listing-fields.json',
			name: 'Listings - Listing Fields',
			description: 'Custom listing field definitions',
		},
		{
			path: '/listings/listing-search.json',
			name: 'Listings - Search',
			description: 'Listing search configuration',
		},
		{
			path: '/listings/listing-types.json',
			name: 'Listings - Listing Types',
			description: 'Available listing types',
		},
		{
			path: '/transactions/commission.json',
			name: 'Transactions - Commission',
			description: 'Commission configuration',
		},
		{
			path: '/transactions/minimum-transaction-size.json',
			name: 'Transactions - Minimum Size',
			description: 'Minimum transaction size configuration',
		},
		{
			path: '/users/user-fields.json',
			name: 'Users - User Fields',
			description: 'Custom user field definitions',
		},
		{
			path: '/users/user-types.json',
			name: 'Users - User Types',
			description: 'User type definitions',
		},
	];

	return commonAssets.map((asset) => ({
		name: asset.name,
		value: asset.path,
		description: asset.description,
	}));
}

/**
 * Returns listing sort field options
 * - When origin filter is active, returns empty array since sorting is auto-applied by distance
 */
export async function getListingSortFields(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	const filterOptions = this.getNodeParameter('filterOptions', 0, {}) as IDataObject;
	const filters = (filterOptions.filters as IDataObject[]) || [];
	const hasOriginFilter = filters.some((filter) => filter.filterType === 'origin');

	// If origin filter is active, return empty array (sorting auto-applied by distance)
	if (hasOriginFilter) {
		return [];
	}

	// Check for availability filters that don't support pagination
	const availabilityFilter = filters.find((f) => f.filterType === 'availability');
	if (availabilityFilter) {
		const planType = availabilityFilter.availabilityPlanType as string;
		const settings = availabilityFilter.availabilitySettings as string[] | undefined;
		const partialMatch = !(settings && settings.includes('fullRangeMatch'));
		const minDuration = availabilityFilter.availabilityMinDuration as number;

		// Time-based queries or day-partial with minDuration don't support pagination
		// Only createdAt sorting is allowed
		if (
			planType === 'hourly-fixed' ||
			(planType === 'daily-nightly' && partialMatch && minDuration && minDuration > 0)
		) {
			return [
				{
					name: 'Created At',
					value: 'createdAt',
					description: 'Sort by listing creation time (only option for availability queries)',
				},
			];
		}
	}

	const sortOptions: INodePropertyOptions[] = [
		{
			name: 'Created At',
			value: 'createdAt',
			description: 'Sort by listing creation time',
		},
		{
			name: 'Metadata',
			value: 'metadata',
			description: 'Sort by a top level metadata field',
		},
		{
			name: 'Price',
			value: 'price',
			description: 'Sort by listing price',
		},
		{
			name: 'Public Data',
			value: 'publicData',
			description: 'Sort by a top level public data field',
		},
	];

	return sortOptions;
}

/**
 * Returns listing filter types, excluding incompatible combinations and non-repeatable filters
 * Uses centralized LISTING_FILTER_METADATA configuration for repeatability and mutual exclusivity
 */
export async function getListingFilterTypes(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	const filterOptions = this.getNodeParameter('filterOptions', 0, {}) as IDataObject;
	const filters = (filterOptions.filters as IDataObject[]) || [];

	const filterTypeCounts = new Map<string, number>();
	for (const filter of filters) {
		const type = filter.filterType as string;
		filterTypeCounts.set(type, (filterTypeCounts.get(type) || 0) + 1);
	}

	const selectedFilterTypes = filters.map((f) => f.filterType as string);

	const allFilterTypes: INodePropertyOptions[] = [
		{
			name: 'Author',
			value: 'authorId',
			description: 'Listings by specific author/user ID',
		},
		{
			name: 'Availability',
			value: 'availability',
			description:
				'Listings available for specified dates, seats, and duration (published listings only)',
		},
		{
			name: 'Category',
			value: 'category',
			description: 'Listings in specific category',
		},
		{
			name: 'Created Before',
			value: 'createdAtEnd',
			description: 'Listings created before specified date and time',
		},
		{
			name: 'Created On or After',
			value: 'createdAtStart',
			description: 'Listings created on or after specified date and time',
		},
		{
			name: 'Keywords',
			value: 'keywords',
			description:
				"Listings matching keywords in title, description, or public data. Cannot be combined with 'Origin' filter.",
		},
		{
			name: 'List of IDs',
			value: 'ids',
			description: 'Listings with specific IDs (up to 100, comma-separated)',
		},
		{
			name: 'Origin',
			value: 'origin',
			description:
				"Listings by distance from coordinates. Results auto-sorted by distance (custom sorts ignored). Cannot be combined with 'Keywords' filter.",
		},
		{
			name: 'Location Bounds',
			value: 'bounds',
			description: 'Listings within geographic bounding box',
		},
		{
			name: 'Metadata',
			value: 'metadata',
			description: 'Listings with specific <code>metadata</code> field values',
		},
		{
			name: 'Price',
			value: 'price',
			description: 'Listings by price range (in currency minor units, e.g. cents)',
		},
		{
			name: 'Public Data',
			value: 'publicData',
			description: 'Listings with specific <code>publicData</code> field values',
		},
		{
			name: 'State',
			value: 'states',
			description: 'Listings in specific states (published, draft, etc.)',
		},
		{
			name: 'Stock',
			value: 'stock',
			description: 'Listings by stock quantity and mode',
		},
		{
			name: 'Type',
			value: 'listingType',
			description: 'Listings of specific type',
		},
	];

	// Filter out incompatible and non-repeatable options using centralized metadata
	return allFilterTypes.filter((option) => {
		const filterType = option.value as string;
		const metadata = LISTING_FILTER_METADATA[filterType];

		// If no metadata, allow by default
		if (!metadata) {
			return true;
		}

		// For non-repeatable filters, only exclude if used 2+ times (keeps current filter editable)
		if (metadata.repeatable === false) {
			const count = filterTypeCounts.get(filterType) || 0;
			if (count >= 2) {
				return false;
			}
		}

		// Check mutual exclusivity - if any mutually exclusive filter is selected, exclude this one
		if (metadata.mutuallyExclusive) {
			const hasConflict = selectedFilterTypes.some((selected) =>
				metadata.mutuallyExclusive?.includes(selected),
			);
			if (hasConflict) {
				return false;
			}
		}

		return true;
	});
}

/**
 * Returns transaction filter types, excluding non-repeatable filters that are already selected
 * Uses centralized TRANSACTION_FILTER_METADATA configuration
 */
export async function getTransactionFilterTypes(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	const filterOptions = this.getNodeParameter('filterOptions', 0, {}) as IDataObject;
	const filters = (filterOptions.filters as IDataObject[]) || [];

	const filterTypeCounts = new Map<string, number>();
	for (const filter of filters) {
		const type = filter.filterType as string;
		filterTypeCounts.set(type, (filterTypeCounts.get(type) || 0) + 1);
	}

	const selectedFilterTypes = filters.map((f) => f.filterType as string);

	const allFilterTypes: INodePropertyOptions[] = [
		{
			name: 'Booking End',
			value: 'bookingEnd',
			description: 'Transactions with booking end date in specified range',
		},
		{
			name: 'Booking Start',
			value: 'bookingStart',
			description: 'Transactions with booking start date in specified range',
		},
		{
			name: 'Booking States',
			value: 'bookingStates',
			description: 'Transactions with specific booking states (accepted, pending, etc.)',
		},
		{
			name: 'Created On or After',
			value: 'createdAtStart',
			description: 'Transactions created on or after specified date and time',
		},
		{
			name: 'Created Before',
			value: 'createdAtEnd',
			description: 'Transactions created before specified date and time',
		},
		{
			name: 'Customer ID',
			value: 'customerId',
			description: 'Transactions by specific customer/buyer ID',
		},
		{
			name: 'Has Booking',
			value: 'hasBooking',
			description: 'Transactions with or without bookings',
		},
		{
			name: 'Has Message',
			value: 'hasMessage',
			description: 'Transactions with or without messages',
		},
		{
			name: 'Has Payin',
			value: 'hasPayin',
			description: 'Transactions with or without payins',
		},
		{
			name: 'Has Stock Reservation',
			value: 'hasStockReservation',
			description: 'Transactions with or without stock reservations',
		},
		{
			name: 'Last Transition',
			value: 'lastTransition',
			description: 'Transactions by last transition',
		},
		{
			name: 'Listing ID',
			value: 'listingId',
			description: 'Transactions for specific listing ID',
		},
		{
			name: 'Metadata',
			value: 'metadata',
			description: 'Transactions with specific metadata field values',
		},
		{
			name: 'Private Data',
			value: 'privateData',
			description: 'Transactions with specific private data field values',
		},
		{
			name: 'Process Names',
			value: 'processNames',
			description: 'Transactions using specific process names',
		},
		{
			name: 'Protected Data',
			value: 'protectedData',
			description: 'Transactions with specific protected data field values',
		},
		{
			name: 'Provider ID',
			value: 'providerId',
			description: 'Transactions by specific provider/seller ID',
		},
		{
			name: 'Public Data',
			value: 'publicData',
			description: 'Transactions with specific public data field values',
		},
		{
			name: 'States',
			value: 'states',
			description: 'Transactions in specific states (confirmed, paid, etc.)',
		},
	];

	// Filter out non-repeatable options that are already selected
	return allFilterTypes.filter((option) => {
		const filterType = option.value as string;
		const metadata = TRANSACTION_FILTER_METADATA[filterType];

		// If no metadata, allow by default
		if (!metadata) {
			return true;
		}

		// For non-repeatable filters, only exclude if used 2+ times (keeps current filter editable)
		if (metadata.repeatable === false) {
			const count = filterTypeCounts.get(filterType) || 0;
			if (count >= 2) {
				return false;
			}
		}

		// Check mutual exclusivity
		if (metadata.mutuallyExclusive) {
			const hasConflict = selectedFilterTypes.some((selected) =>
				metadata.mutuallyExclusive?.includes(selected),
			);
			if (hasConflict) {
				return false;
			}
		}

		return true;
	});
}

/**
 * Returns user filter types, excluding non-repeatable filters that are already selected
 * Uses centralized USER_FILTER_METADATA configuration
 */
export async function getUserFilterTypes(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	const filterOptions = this.getNodeParameter('filterOptions', 0, {}) as IDataObject;
	const filters = (filterOptions.filters as IDataObject[]) || [];

	// Count occurrences of each filter type
	const filterTypeCounts = new Map<string, number>();
	for (const filter of filters) {
		const type = filter.filterType as string;
		filterTypeCounts.set(type, (filterTypeCounts.get(type) || 0) + 1);
	}

	const selectedFilterTypes = filters.map((f) => f.filterType as string);

	// All user filter types with resource-specific descriptions
	const allFilterTypes: INodePropertyOptions[] = [
		{
			name: 'Created On or After',
			value: 'createdAtStart',
			description: 'Users created on or after specified date and time',
		},
		{
			name: 'Created Before',
			value: 'createdAtEnd',
			description: 'Users created before specified date and time',
		},
		{
			name: 'Metadata',
			value: 'metadata',
			description: 'Users with specific metadata field values',
		},
		{
			name: 'Private Data',
			value: 'privateData',
			description: 'Users with specific private data field values',
		},
		{
			name: 'Protected Data',
			value: 'protectedData',
			description: 'Users with specific protected data field values',
		},
		{
			name: 'Public Data',
			value: 'publicData',
			description: 'Users with specific public data field values',
		},
	];

	// Filter out non-repeatable options that are already selected
	return allFilterTypes.filter((option) => {
		const filterType = option.value as string;
		const metadata = USER_FILTER_METADATA[filterType];

		// If no metadata, allow by default
		if (!metadata) {
			return true;
		}

		// For non-repeatable filters, only exclude if used 2+ times (keeps current filter editable)
		if (metadata.repeatable === false) {
			const count = filterTypeCounts.get(filterType) || 0;
			if (count >= 2) {
				return false;
			}
		}

		// Check mutual exclusivity
		if (metadata.mutuallyExclusive) {
			const hasConflict = selectedFilterTypes.some((selected) =>
				metadata.mutuallyExclusive?.includes(selected),
			);
			if (hasConflict) {
				return false;
			}
		}

		return true;
	});
}

/**
 * Returns listing field options based on the context
 *
 * Relationship support based on context (from relationships.txt):
 * - transaction.listing: images, currentStock, author, author.profileImage
 * - stockAdjustment.listing: currentStock, author (NO images)
 * - stockReservation.listing: author, currentStock (NO images)
 * - listing (direct): all fields including marketplace
 */
export async function getListingFieldOptions(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	const resource = this.getNodeParameter('resource', 0) as string;

	// All listing field options
	const allOptions: INodePropertyOptions[] = [
		{ name: 'Author', value: 'author', description: 'Listing author' },
		{
			name: 'Availability Plan',
			value: 'availabilityPlan',
			description: 'Listing availability plan with type and timezone',
		},
		{
			name: 'Categories',
			value: 'categories',
			description: 'Categories for the listing - all levels',
		},
		{
			name: 'Created At',
			value: 'createdAt',
			description: 'Date and time the listing was created',
		},
		{
			name: 'Current Stock',
			value: 'currentStock',
			description: "The listing's currently available stock",
		},
		{ name: 'Description', value: 'description', description: 'Listing description' },
		{ name: 'Geolocation', value: 'geolocation', description: 'Listing location coordinates' },
		{ name: 'Images', value: 'images', description: 'Listing images' },
		{ name: 'Marketplace', value: 'marketplace', description: 'The marketplace of the listing' },
		{ name: 'Metadata', value: 'metadata', description: 'Listing metadata' },
		{ name: 'Price', value: 'price', description: 'Listing price' },
		{ name: 'Private Data', value: 'privateData', description: 'Private extended data' },
		{ name: 'Public Data', value: 'publicData', description: 'Public extended data' },
		{ name: 'State', value: 'state', description: 'Listing state' },
		{ name: 'Timezone', value: 'timezone', description: 'Availability plan timezone' },
		{ name: 'Title', value: 'title', description: 'Listing title' },
		{
			name: 'Type',
			value: 'listingType',
			description: 'Listing type (from <code>publicData.listingType</code>)',
		},
	];

	// When accessing listing from transaction: exclude marketplace, include images
	if (resource === 'transaction') {
		return allOptions.filter((opt) => opt.value !== 'marketplace');
	}

	// When accessing listing from stock operations: exclude marketplace AND images
	// (stockAdjustment.listing and stockReservation.listing don't support images per relationships.txt)
	if (resource === 'stock') {
		return allOptions.filter((opt) => opt.value !== 'marketplace' && opt.value !== 'images');
	}

	// Direct listing context - all options available
	return allOptions;
}

/**
 * Returns transaction field options based on the context
 *
 * Per API doc, transaction has these ATTRIBUTES (always available):
 * - createdAt, processName, processVersion, lastTransition, lastTransitionedAt, state
 * - lineItems, payinTotal, payoutTotal, protectedData, metadata, transitions
 *
 * And these RELATIONSHIPS (context-dependent):
 * - stockReservation.transaction: customer, provider only
 * - transaction (direct): all relationships
 */
export async function getTransactionFieldOptions(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	const resource = this.getNodeParameter('resource', 0) as string;

	// Transaction ATTRIBUTES (always available)
	const attributeOptions: INodePropertyOptions[] = [
		{
			name: 'Created At',
			value: 'createdAt',
			description: 'Date and time the transaction was created',
		},
		{ name: 'Last Transition', value: 'lastTransition', description: 'Last state transition' },
		{
			name: 'Last Transitioned At',
			value: 'lastTransitionedAt',
			description: 'Date and time of last transition',
		},
		{ name: 'Line Items', value: 'lineItems', description: 'Transaction line items' },
		{ name: 'Metadata', value: 'metadata', description: 'Transaction metadata' },
		{ name: 'Payin Total', value: 'payinTotal', description: 'Total payin amount' },
		{ name: 'Payout Total', value: 'payoutTotal', description: 'Total payout amount' },
		{ name: 'Process Name', value: 'processName', description: 'Transaction process name' },
		{
			name: 'Process Version',
			value: 'processVersion',
			description: 'Transaction process version',
		},
		{ name: 'Protected Data', value: 'protectedData', description: 'Protected extended data' },
		{ name: 'State', value: 'state', description: 'Transaction state' },
		{ name: 'Transitions', value: 'transitions', description: 'Transaction transition history' },
	];

	// Transaction RELATIONSHIPS (context-dependent)
	const stockRelationshipOptions: INodePropertyOptions[] = [
		{ name: 'Customer', value: 'customer', description: 'Transaction customer' },
		{ name: 'Provider', value: 'provider', description: 'Transaction provider' },
	];

	const allRelationshipOptions: INodePropertyOptions[] = [
		...stockRelationshipOptions,
		{ name: 'Booking', value: 'booking', description: 'Transaction booking details' },
		{ name: 'Listing', value: 'listing', description: 'Transaction listing' },
		{
			name: 'Marketplace',
			value: 'marketplace',
			description: 'The marketplace of the transaction',
		},
		{ name: 'Messages', value: 'messages', description: 'Transaction messages' },
		{ name: 'Reviews', value: 'reviews', description: 'Transaction reviews' },
		{
			name: 'Stock Reservation',
			value: 'stockReservation',
			description: 'Transaction stock reservation',
		},
	];

	// When accessed from stock operations, only customer and provider relationships are supported
	// Per API doc: stockReservation.transaction supports nested: transaction.customer, transaction.provider
	if (resource === 'stock') {
		// Return in alphabetical order
		return [
			{
				name: 'Created At',
				value: 'createdAt',
				description: 'Date and time the transaction was created',
			},
			{ name: 'Customer', value: 'customer', description: 'Transaction customer' },
			{ name: 'Last Transition', value: 'lastTransition', description: 'Last state transition' },
			{
				name: 'Last Transitioned At',
				value: 'lastTransitionedAt',
				description: 'Date and time of last transition',
			},
			{ name: 'Line Items', value: 'lineItems', description: 'Transaction line items' },
			{ name: 'Metadata', value: 'metadata', description: 'Transaction metadata' },
			{ name: 'Payin Total', value: 'payinTotal', description: 'Total payin amount' },
			{ name: 'Payout Total', value: 'payoutTotal', description: 'Total payout amount' },
			{ name: 'Process Name', value: 'processName', description: 'Transaction process name' },
			{
				name: 'Process Version',
				value: 'processVersion',
				description: 'Transaction process version',
			},
			{ name: 'Protected Data', value: 'protectedData', description: 'Protected extended data' },
			{ name: 'Provider', value: 'provider', description: 'Transaction provider' },
			{ name: 'State', value: 'state', description: 'Transaction state' },
			{ name: 'Transitions', value: 'transitions', description: 'Transaction transition history' },
		];
	}

	// Direct transaction context - all attributes and relationships available
	return [...attributeOptions, ...allRelationshipOptions];
}

/**
 * Returns user field options for customer, provider, and author relationships
 * Per relationships.txt:
 * - Transactions/Listings: Support nested user.profileImage
 * - Stock operations: Do NOT support nested user.profileImage
 */
export async function getUserFieldOptions(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	const resource = this.getNodeParameter('resource', 0) as string;

	// All user field options (attributes + profileImage relationship)
	const allOptions: INodePropertyOptions[] = [
		{ name: 'Banned', value: 'banned', description: 'Whether the user is banned' },
		{ name: 'Bio', value: 'bio', description: 'User bio' },
		{ name: 'Created At', value: 'createdAt', description: 'Date and time the user was created' },
		{ name: 'Deleted', value: 'deleted', description: 'Whether the user is deleted' },
		{ name: 'Display Name', value: 'displayName', description: 'User display name' },
		{ name: 'Email', value: 'email', description: 'User email address' },
		{ name: 'Email Verified', value: 'emailVerified', description: 'Whether email is verified' },
		{ name: 'First Name', value: 'firstName', description: 'User first name' },
		{ name: 'Last Name', value: 'lastName', description: 'User last name' },
		{ name: 'Metadata', value: 'metadata', description: 'User metadata' },
		{ name: 'Private Data', value: 'privateData', description: 'Private extended data' },
		{ name: 'Profile Image', value: 'profileImage', description: 'User profile image' },
		{ name: 'Protected Data', value: 'protectedData', description: 'Protected extended data' },
		{ name: 'Public Data', value: 'publicData', description: 'Public extended data' },
	];

	// Stock operations don't support nested user.profileImage per relationships.txt
	// stockAdjustment: listing.author (no profileImage), stockReservation.transaction.customer/provider (no profileImage)
	// stockReservation: listing.author (no profileImage), transaction.customer/provider (no profileImage)
	if (resource === 'stock') {
		return allOptions.filter((opt) => opt.value !== 'profileImage');
	}

	// Transactions and listings support nested user.profileImage
	return allOptions;
}

export async function getEventTypes(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const resources = this.getNodeParameter('resources', 0) as string[];

	if (!resources || resources.length === 0 || resources.includes('all')) {
		return SHARETRIBE_EVENT_TYPES.all;
	}

	const eventTypes: INodePropertyOptions[] = [];

	if (resources.length > 1) {
		const resourceNames = resources.map((r) => r.charAt(0).toUpperCase() + r.slice(1)).join(', ');
		eventTypes.push({
			name: `All Events`,
			value: '',
			description: `Trigger on all events for ${resourceNames} resources`,
		});
	}

	for (const resource of resources) {
		const resourceEvents = SHARETRIBE_EVENT_TYPES[resource];
		if (resourceEvents) {
			eventTypes.push(...resourceEvents);
		}
	}

	return eventTypes;
}

export async function getEventTypesForQuery(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	return SHARETRIBE_EVENT_TYPES.all;
}
