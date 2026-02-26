import type { INodeProperties } from 'n8n-workflow';

export const assetGetDescription: INodeProperties[] = [
	{
		displayName: 'Asset Category',
		name: 'assetCategory',
		type: 'options',
		required: true,
		displayOptions: {
			show: {
				resource: ['asset'],
				operation: ['get'],
			},
		},
		options: [
			{
				name: 'Content - Email Texts',
				value: '/content/email-texts.json',
				description: 'Email template texts',
			},
			{
				name: 'Content - Footer',
				value: '/content/footer.json',
				description: 'Footer content and links',
			},
			{
				name: 'Content - Pages',
				value: 'content-pages',
				description: 'Custom marketplace pages (about, landing-page, etc.)',
			},
			{
				name: 'Content - Top Bar',
				value: '/content/top-bar.json',
				description: 'Top bar navigation configuration',
			},
			{
				name: 'Content - Translations',
				value: '/content/translations.json',
				description: 'Custom text translations',
			},
			{
				name: 'Design - Branding',
				value: '/design/branding.json',
				description: 'Brand colors, logos, and visual identity',
			},
			{
				name: 'Design - Layout',
				value: '/design/layout.json',
				description: 'Layout configuration',
			},
			{
				name: 'General - Access Control',
				value: '/general/access-control.json',
				description: 'Access control configuration',
			},
			{
				name: 'General - Localization',
				value: '/general/localization.json',
				description: 'Marketplace locale and currency settings',
			},
			{
				name: 'Integrations - Analytics',
				value: '/integrations/analytics.json',
				description: 'Analytics integration settings',
			},
			{
				name: 'Integrations - Google Search Console',
				value: '/integrations/google-search-console.json',
				description: 'Google Search Console verification',
			},
			{
				name: 'Integrations - Map',
				value: '/integrations/map.json',
				description: 'Map integration settings',
			},
			{
				name: 'Listings - Categories',
				value: '/listings/listing-categories.json',
				description: 'Listing category hierarchy',
			},
			{
				name: 'Listings - Listing Fields',
				value: '/listings/listing-fields.json',
				description: 'Custom listing field definitions',
			},
			{
				name: 'Listings - Listing Types',
				value: '/listings/listing-types.json',
				description: 'Available listing types',
			},
			{
				name: 'Listings - Search',
				value: '/listings/listing-search.json',
				description: 'Listing search configuration',
			},
			{
				name: 'Transactions - Commission',
				value: '/transactions/commission.json',
				description: 'Commission configuration',
			},
			{
				name: 'Transactions - Minimum Size',
				value: '/transactions/minimum-transaction-size.json',
				description: 'Minimum transaction size configuration',
			},
			{
				name: 'Users - User Fields',
				value: '/users/user-fields.json',
				description: 'Custom user field definitions',
			},
			{
				name: 'Users - User Types',
				value: '/users/user-types.json',
				description: 'User type definitions',
			},
		],
		default: '/content/email-texts.json',
		description: 'The category of asset to retrieve',
	},
	{
		displayName: 'Page Name or ID',
		name: 'assetPage',
		type: 'options',
		required: true,
		displayOptions: {
			show: {
				resource: ['asset'],
				operation: ['get'],
				assetCategory: ['content-pages'],
			},
		},
		typeOptions: {
			loadOptionsMethod: 'getContentPageNames',
		},
		default: '',
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
	},
	{
		displayName: 'Options',
		name: 'accessType',
		type: 'options',
		displayOptions: {
			show: {
				resource: ['asset'],
				operation: ['get'],
			},
		},
		options: [
			{
				name: 'Latest Version',
				value: 'alias',
				description:
					'Get the latest asset version. Updates may take up to 5 min in live, 10 secs in dev/test.',
			},
			{
				name: 'By Version ID',
				value: 'version',
				description: 'Get the asset by a specific version ID. Cache: up to 1 year (immutable).',
			},
		],
		default: 'alias',
		description:
			'Choose which version of the asset to retrieve. <a href="https://www.sharetribe.com/docs/references/assets/" target="_blank">Learn more</a>.',
	},
	{
		displayName: 'Version ID',
		name: 'versionOrAlias',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['asset'],
				operation: ['get'],
				accessType: ['version'],
			},
		},
		default: '',
		placeholder: 'e.g. 8oxjntPCtFlM0w8OXZzA9Q',
		description: 'The specific version ID of the asset to retrieve',
	},
	{
		displayName: 'Filter Email Texts',
		name: 'enableEmailTextsFilter',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: ['asset'],
				operation: ['get'],
				assetCategory: ['/content/email-texts.json'],
			},
		},
		default: false,
		description: 'Whether to filter email texts by field name',
		hint: 'Filter the large email texts asset to specific fields',
	},
	{
		// eslint-disable-next-line n8n-nodes-base/node-param-display-name-wrong-for-dynamic-multi-options
		displayName: 'Field Names',
		name: 'emailTextsFilterKeys',
		noDataExpression: true,
		type: 'multiOptions',
		displayOptions: {
			show: {
				resource: ['asset'],
				operation: ['get'],
				assetCategory: ['/content/email-texts.json'],
				enableEmailTextsFilter: [true],
			},
		},
		typeOptions: {
			loadOptionsMethod: 'getEmailTextsKeys',
		},
		default: [],

		description:
							'Which fields to return. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
	},
	{
		displayName: 'Partial Field Names to Match',
		name: 'emailTextsCustomFilter',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['asset'],
				operation: ['get'],
				assetCategory: ['/content/email-texts.json'],
				enableEmailTextsFilter: [true],
			},
		},
		default: '',
		placeholder: 'e.g. booking,cancel',
		description: 'Comma-separated text patterns for case-insensitive partial matching',
		hint: 'Optional: Partial patterns to match field names',
	},
	{
		displayName: 'Filter Translations',
		name: 'enableTranslationsFilter',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: ['asset'],
				operation: ['get'],
				assetCategory: ['/content/translations.json'],
			},
		},
		default: false,
		description: 'Whether to filter translations by field names',
		hint: 'Filter the large translations asset to specific fields',
	},
	{
		// eslint-disable-next-line n8n-nodes-base/node-param-display-name-wrong-for-dynamic-multi-options
		displayName: 'Field Names',
		name: 'translationsFilterKeys',
		noDataExpression: true,
		type: 'multiOptions',
		displayOptions: {
			show: {
				resource: ['asset'],
				operation: ['get'],
				assetCategory: ['/content/translations.json'],
				enableTranslationsFilter: [true],
			},
		},
		typeOptions: {
			loadOptionsMethod: 'getTranslationsKeys',
		},
		default: [],

		description:
							'Which fields to return. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
	},
	{
		displayName: 'Partial Field Names to Match',
		name: 'translationsCustomFilter',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['asset'],
				operation: ['get'],
				assetCategory: ['/content/translations.json'],
				enableTranslationsFilter: [true],
			},
		},
		default: '',
		placeholder: 'e.g. inbox,checkout',
		description: 'Comma-separated text patterns for case-insensitive partial matching',
		hint: 'Optional: Partial patterns to match field names',
	},
];
