import { INodeProperties } from 'n8n-workflow';
import { createExtendedDataFilter, UI_OPERATIONS, UI_RESOURCES } from '../../helpers/Sharetribe';

export const filterDescriptionListing: INodeProperties[] = [
	{
		displayName: 'Filters',
		name: 'filterOptions',
		type: 'collection',
		placeholder: 'Add Filter',
		displayOptions: {
			show: {
				resource: [UI_RESOURCES.LISTING],
				operation: [UI_OPERATIONS.GET_MANY],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Author ID',
				name: 'authorId',
				type: 'string',
				default: '',
				description: 'ID of the listing author/user',
			},
			{
				displayName: 'Availability',
				name: 'availability',
				type: 'fixedCollection',
				default: {},
				placeholder: 'Add Availability Filter',
				description: 'Filter listings by availability in a date/time range',
				typeOptions: {
					multipleValues: false,
				},
				options: [
					{
						displayName: 'Availability Filter',
						name: 'availabilityFilter',
						// eslint-disable-next-line n8n-nodes-base/node-param-fixed-collection-type-unsorted-items
						values: [
							{
								displayName: 'Start',
								name: 'availabilityStart',
								type: 'dateTime',
								validateType: 'dateTime',
								default: '',
								placeholder: 'Date and time in UTC',
								description:
									'Start time of the availability interval to match listings against.<br><br>To handle all timezones and match the behavior of the Sharetribe template, set \'Start\' 14 hours earlier and \'End\' 12 hours later. <a href="https://www.sharetribe.com/docs/template/availability/availability-management/#listing-search-and-timezone-coverage" target="_blank">Learn more</a>.',
								hint: 'Between 1 day past and 365 days future',
							},
							{
								displayName: 'End',
								name: 'availabilityEnd',
								type: 'dateTime',
								validateType: 'dateTime',
								default: '',
								placeholder: 'Date and time in UTC',
								description:
									'End time of the availability interval to match listings against (exclusive).<br><br>To handle all timezones and match the behavior of the Sharetribe template, set \'Start\' 14 hours earlier and \'End\' 12 hours later. <a href="https://www.sharetribe.com/docs/template/availability/availability-management/#listing-search-and-timezone-coverage" target="_blank">Learn more</a>.',
								hint: 'After start. Max 365 days future or max 90 days from start (whichever comes sooner)',
							},
							{
								displayName: 'Options',
								name: 'availabilitySettings',
								noDataExpression: true,
								placeholder: 'Availability filter options',
								type: 'multiOptions',
								default: [],
								description: 'Which optional availability filters to apply',
								options: [
									{
										name: 'Minimum Interval Duration',
										value: 'minDuration',
										description:
											"Match listings with availability of a minimum available interval duration in the range set by 'Start' and 'End'. Cannot be used with 'Full Range Match'.",
									},
									{
										name: 'Minimum Seats',
										value: 'seats',
										description: 'Match listings with a minimum number of seats available',
									},
									{
										name: 'Plan Type',
										value: 'planType',
										description: 'Match listings with a specific availability plan type ()',
									},
									{
										name: 'Full Range Match',
										value: 'fullRangeMatch',
										description:
											"Match listings with availability for the entire time range. Can't be used with 'Minimum Interval Duration'.",
									},
								],
							},
							{
								displayName: 'Minimum Seats',
								name: 'availabilitySeats',
								type: 'number',
								default: 1,
								description: 'Minimum available seats for a listing',
								displayOptions: {
									show: {
										availabilitySettings: ['seats'],
									},
								},
							},

							{
								displayName: 'Interval in Days',
								name: 'availabilityMinDuration',
								type: 'number',
								noDataExpression: true,
								default: null,
								placeholder: 'e.g. 2',
								description:
									"Match only listings with an availability interval of at least this many days within the range specified by 'Start Time' and 'End Time'. Can't be used will 'Full Range Match'.",
								displayOptions: {
									show: {
										availabilitySettings: ['minDuration'],
										availabilityPlanType: ['daily-nightly'],
									},
									hide: {
										availabilitySettings: ['fullRangeMatch'],
									},
								},
							},
							{
								displayName: 'Interval in Mins',
								name: 'availabilityMinDuration',
								type: 'number',
								default: null,
								placeholder: 'e.g. 60',
								description:
									"Match only listings with an availability interval of at least this many minutes within the range specified by 'Start Time' and 'End Time'. Can't be used will 'Full Range Match'.",
								displayOptions: {
									show: {
										availabilitySettings: ['minDuration'],
									},
									hide: {
										availabilitySettings: ['fullRangeMatch'],
										availabilityPlanType: ['daily-nightly'],
									},
								},
							},
							{
								displayName: 'Plan Type',
								name: 'availabilityPlanType',
								noDataExpression: true,
								default: 'hourly-fixed',
								description:
									'Only match listings with specific availability plan type. <a href="https://www.sharetribe.com/docs/template/availability/availability-management/#availability-plan-types-and-timezone-support" target="_blank">Learn more</a>.',
								type: 'options',
								displayOptions: { show: { availabilitySettings: ['planType'] } },
								options: [
									{
										name: 'Day',
										value: 'daily-nightly',
										description:
											'Match listings with plan type <code>availabilityPlan/day</code>. Includes Daily and Nightly unit types.',
									},
									{
										name: 'Time',
										value: 'hourly-fixed',
										description:
											"Match listings with plan type <code>availabilityPlan/time</code>. Includes Hourly and Fixed unit types. By default all listings use the 'Time' plan type.",
									},
								],
							},
						],
					},
				],
			},
			{
				displayName: 'Bounding Box Coords',
				name: 'bounds',
				type: 'fixedCollection',
				default: {},
				placeholder: 'Add Bounding Box Filter',
				description: 'Filter listings within a geographic bounding box',
				typeOptions: {
					multipleValues: false,
				},
				options: [
					{
						displayName: 'Bounding Box',
						name: 'boundsFilter',
						values: [
							{
								displayName: 'Northeast Corner',
								name: 'boundsNE',
								type: 'string',
								default: '',
								placeholder: '37.8049,-122.3994',
								description:
									'Northeast corner coordinates. Accepts string "lat,lng" or JSON object { "lat": 37.8049, "lng": -122.3994 }.',
							},
							{
								displayName: 'Southwest Corner',
								name: 'boundsSW',
								type: 'string',
								default: '',
								placeholder: '37.7449,-122.4394',
								description:
									'Southwest corner coordinates. Accepts string "lat,lng" or JSON object { "lat": 37.7449, "lng": -122.4394 }.',
							},
						],
					},
				],
			},
			{
				displayName: 'Category',
				name: 'category',
				type: 'fixedCollection',
				default: {},
				placeholder: 'Add Category Filter',
				description: 'Filter listings by category (up to 3 levels)',
				typeOptions: {
					multipleValues: false,
				},
				options: [
					{
						displayName: 'Category Filter',
						name: 'categoryFilter',
						values: [
							{
								displayName: 'Level 1',
								name: 'categoryLevel1',
								noDataExpression: true,
								type: 'resourceLocator',
								default: { mode: 'list', value: '' },
								description: 'Select the top-level category to filter by',
								modes: [
									{
										displayName: 'From List',
										name: 'list',
										type: 'list',
										placeholder: 'Select category',
										typeOptions: {
											searchListMethod: 'getCategoryLevel1',
											searchable: true,
										},
									},
									{
										displayName: 'By Name',
										name: 'name',
										type: 'string',
										placeholder: 'categoryName',
										hint: 'Enter the category name',
									},
								],
							},
							{
								displayName: 'Level 2',
								name: 'categoryLevel2',
								noDataExpression: true,
								type: 'resourceLocator',
								default: { mode: 'list', value: '' },
								description: 'Select the second-level category to filter by',
								typeOptions: {
									loadOptionsDependsOn: ['categoryLevel1.value'],
								},
								modes: [
									{
										displayName: 'From List',
										name: 'list',
										type: 'list',
										placeholder: 'Select category',
										typeOptions: {
											searchListMethod: 'getCategoryLevel2',
											searchable: true,
										},
									},
									{
										displayName: 'By Name',
										name: 'name',
										type: 'string',
										placeholder: 'subcategoryName',
										hint: 'Enter the subcategory name',
									},
								],
							},
							{
								displayName: 'Level 3',
								name: 'categoryLevel3',
								noDataExpression: true,
								type: 'resourceLocator',
								default: { mode: 'list', value: '' },
								description: 'Select the third-level category to filter by',
								typeOptions: {
									loadOptionsDependsOn: ['categoryLevel1.value', 'categoryLevel2.value'],
								},
								modes: [
									{
										displayName: 'From List',
										name: 'list',
										type: 'list',
										placeholder: 'Select category',
										typeOptions: {
											searchListMethod: 'getCategoryLevel3',
											searchable: true,
										},
									},
									{
										displayName: 'By Name',
										name: 'name',
										type: 'string',
										placeholder: 'subSubcategoryName',
										hint: 'Enter the sub-subcategory name',
									},
								],
							},
						],
					},
				],
			},
			{
				displayName: 'Created After',
				name: 'createdAtStartTime',
				type: 'dateTime',
				validateType: 'dateTime',
				default: '',
				placeholder: 'Date and time in UTC',
				description: 'Only listings created on or after the given time are returned',
			},
			{
				displayName: 'Created Before',
				name: 'createdAtEndTime',
				type: 'dateTime',
				validateType: 'dateTime',
				default: '',
				placeholder: 'Date and time in UTC',
				description: 'Only listings created before the given time are returned',
			},
			{
				displayName: 'Keywords',
				name: 'keywords',
				type: 'string',
				default: '',
				description: 'Keywords to search in title, description, or public data',
				hint: "Results will be automatically sorted by relevance (keywords). Adding other sort options will override this default. Cannot be combined with 'Origin' filter.",
			},
			{
				displayName: 'Listing IDs',
				name: 'ids',
				type: 'string',
				default: '',
				description: 'Comma-separated list of listing IDs (max 100)',
				placeholder:
					'e.g. 550e8400-e29b-41d4-a716-446655440000,660e8400-e29b-41d4-a716-446655440001',
			},

			createExtendedDataFilter('metadata'),
			{
				displayName: 'Origin (Distance Search)',
				name: 'origin',
				type: 'string',
				default: '',
				placeholder: 'lat,lng (e.g., 37.7749,-122.4194)',
				description:
					'Coordinates for distance-based search. Accepts string "lat,lng" or JSON object { "lat": 37.7749, "lng": -122.4194 }.',
				hint: "Results will be automatically sorted by distance (origin). No other sort options can be used. Cannot be combined with 'Keywords' filter.",
			},
			{
				displayName: 'Price',
				name: 'price',
				type: 'fixedCollection',
				default: {},
				placeholder: 'Add Price Filter',
				description: 'Filter listings by price',
				typeOptions: {
					multipleValues: false,
				},
				options: [
					{
						displayName: 'Price Filter',
						name: 'priceFilter',
						values: [
							{
								displayName: 'Filter Type',
								name: 'priceRangeType',
								noDataExpression: true,
								type: 'options',
								options: [
									{
										name: 'Exact Price',
										value: 'exact',
									},
									{
										name: 'Maximum Price',
										value: 'maximum',
									},
									{
										name: 'Minimum Price',
										value: 'minimum',
									},
									{
										name: 'Price Range',
										value: 'range',
									},
								],
								default: 'exact',
								description: 'Type of price filtering',
							},
							{
								displayName: 'Maximum Price',
								name: 'priceMax',
								type: 'number',
								default: '',
								description: "Maximum price in the currency's minor unit (e.g. cents for USD)",
								displayOptions: {
									show: { priceRangeType: ['range', 'maximum'] },
								},
							},
							{
								displayName: 'Minimum Price',
								name: 'priceMin',
								type: 'number',
								default: '',
								description: "Minimum price in the currency's minor unit (e.g. cents for USD)",
								displayOptions: {
									show: { priceRangeType: ['range', 'minimum'] },
								},
							},
							{
								displayName: 'Price',
								name: 'price',
								type: 'number',
								default: '',
								description: "In the currency's minor unit (e.g. cents for USD)",
								displayOptions: {
									show: { priceRangeType: ['exact'] },
								},
							},
						],
					},
				],
			},
			createExtendedDataFilter('publicData'),
			{
				displayName: 'States',
				name: 'states',
				type: 'multiOptions',
				noDataExpression: true,
				options: [
					{
						name: 'Closed',
						value: 'closed',
						description: 'Listing closed by author or marketplace operator',
					},
					{
						name: 'Draft',
						value: 'draft',
						description: 'Listing is in draft state and has not been published yet',
					},
					{
						name: 'Pending Approval',
						value: 'pendingApproval',
						description: 'Listing is pending operator approval',
					},
					{
						name: 'Published',
						value: 'published',
						description: 'Listing is published and discoverable',
					},
				],
				default: [],
				description: 'Listing states to filter by',
			},
			{
				displayName: 'Stock',
				name: 'stock',
				type: 'fixedCollection',
				placeholder: 'Add Stock Filter',
				description: 'Filter listings by stock availability',
				typeOptions: {
					multipleValues: false,
				},
				default: {},
				options: [
					{
						displayName: 'Stock Settings',
						name: 'settings',
						values: [
							{
								displayName: 'Minimum Stock Quantity',
								name: 'minStock',
								type: 'number',
								default: 1,
								description: 'Minimum stock quantity to match',
							},
							{
								displayName: 'Stock Mode',
								name: 'stockMode',
								noDataExpression: true,
								type: 'options',
								options: [
									{
										name: 'Match Undefined',
										value: 'match-undefined',
										description: 'Match listings with undefined stock',
									},
									{
										name: 'Strict',
										value: 'strict',
										description: 'Strict stock matching (default)',
									},
								],
								default: 'strict',
								description: 'Type of stock query',
							},
						],
					},
				],
			},
			{
				displayName: 'Type',
				name: 'listingType',
				noDataExpression: true,
				type: 'resourceLocator',
				default: { mode: 'list', value: '' },
				description: 'Select the listing type to filter by',
				modes: [
					{
						displayName: 'From List',
						name: 'list',
						type: 'list',
						placeholder: 'Select listing type',
						typeOptions: {
							searchListMethod: 'getListingTypes',
							searchable: true,
						},
					},
					{
						displayName: 'By Name',
						name: 'name',
						type: 'string',
						placeholder: 'listingTypeName',
						hint: 'Enter the listing type name',
					},
				],
			},
		],
	},
];
