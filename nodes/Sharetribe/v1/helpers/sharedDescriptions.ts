/**
 * Shared factory functions for generating n8n node property definitions.
 * Eliminates duplication across description files for common field patterns.
 */
import type { INodeProperties } from 'n8n-workflow';
import { EXTENDED_DATA_TYPES } from './Sharetribe.types';
import type { ExtendedDataType } from './Sharetribe.types';

/**
 * Creates a "Simplify" boolean toggle that controls whether the API response is simplified.
 * @param resource - The UI resource identifier (e.g. `UI_RESOURCES.USER`)
 * @param operation - The UI operation identifier (e.g. `UI_OPERATIONS.GET`)
 */
export function makeSimplifyField(resource: string, operation: string): INodeProperties {
	return {
		displayName: 'Simplify',
		name: 'simplify',
		type: 'boolean',
		default: true,
		displayOptions: { show: { resource: [resource], operation: [operation] } },
		description: 'Whether to return a simplified version of the response',
	};
}

/**
 * Creates a "Return All" boolean toggle for paginated endpoints.
 * When enabled, all pages are fetched automatically.
 * @param resource - The UI resource identifier
 * @param operation - The UI operation identifier
 */
export function makeReturnAllField(resource: string, operation: string): INodeProperties {
	return {
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		displayOptions: { show: { resource: [resource], operation: [operation] } },
		description: 'Whether to return all results or only up to a given limit',
	};
}

/**
 * Creates a "Count Only" boolean toggle shown when "Return All" is off.
 * Returns just the count of matching records instead of the records themselves.
 * @param resource - The UI resource identifier
 * @param operation - The UI operation identifier
 * @param resourceLabel - Human-readable resource name used in the description (e.g. `'transaction'`)
 */
export function makeCountOnlyField(
	resource: string,
	operation: string,
	resourceLabel: string,
): INodeProperties {
	return {
		displayName: 'Count Only',
		name: 'countOnly',
		type: 'boolean',
		default: false,
		displayOptions: { show: { resource: [resource], operation: [operation], returnAll: [false] } },
		description: `Whether to return only the count of matching ${resourceLabel}s`,
	};
}

/**
 * Creates a "Limit" number field shown when "Return All" is off.
 * Conditionally also requires "Count Only" to be off when `showCountOnly` is true.
 * @param resource - The UI resource identifier
 * @param operation - The UI operation identifier
 * @param opts - Optional overrides
 * @param opts.default - Default limit value (defaults to `50`)
 * @param opts.showCountOnly - Whether to add a `countOnly: [false]` display condition (defaults to `true`)
 */
export function makeLimitField(
	resource: string,
	operation: string,
	opts?: { default?: number; showCountOnly?: boolean },
): INodeProperties {
	const defaultVal = opts?.default ?? 50;
	const showCountOnly = opts?.showCountOnly ?? true;

	const show: Record<string, string[] | boolean[]> = {
		resource: [resource],
		operation: [operation],
		returnAll: [false],
	};
	if (showCountOnly) {
		show.countOnly = [false];
	}

	return {
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		typeOptions: { minValue: 1, numberPrecision: 0 },
		// eslint-disable-next-line n8n-nodes-base/node-param-default-wrong-for-limit
		default: defaultVal,
		displayOptions: { show },
		description: 'Max number of results to return',
	};
}

/**
 * Creates a required string field for capturing a Sharetribe UUID resource identifier.
 * @param resource - The UI resource identifier
 * @param operation - The UI operation identifier
 * @param config - Field configuration
 * @param config.displayName - Label shown in the UI (e.g. `'Listing ID'`)
 * @param config.name - Parameter name used in code (e.g. `'listingId'`)
 * @param config.description - Help text shown beneath the field
 */
export function makeResourceIdField(
	resource: string,
	operation: string,
	config: { displayName: string; name: string; description: string },
): INodeProperties {
	return {
		displayName: config.displayName,
		name: config.name,
		type: 'string',
		required: true,
		displayOptions: { show: { resource: [resource], operation: [operation] } },
		default: '',
		placeholder: 'e.g. 550e8400-e29b-41d4-a716-446655440000',
		description: config.description,
	};
}

/**
 * Creates a "Speculative" boolean toggle for write operations that support dry-run previews.
 * When enabled, the API returns what the result would look like without persisting changes.
 * @param resource - The UI resource identifier
 * @param operation - The UI operation identifier
 * @param description - Optional custom description (overrides the default)
 */
export function makeSpeculativeField(
	resource: string,
	operation: string,
	description?: string,
): INodeProperties {
	return {
		displayName: 'Speculative',
		name: 'speculative',
		type: 'boolean',
		default: false,
		displayOptions: { show: { resource: [resource], operation: [operation] } },
		description:
			description ??
			'Whether to preview the changes without actually updating. Returns what the result would look like.',
	};
}

/**
 * Creates a "Fields to Return" multiOptions field for sparse fieldset selection.
 * Only shown when "Simplify" is off. Supports either static options or dynamic loading.
 * @param resource - The UI resource identifier
 * @param operation - The UI operation identifier
 * @param config - Field configuration
 * @param config.name - Parameter name (e.g. `'userFields'`, `'listingFields'`)
 * @param config.defaults - Default selected field values
 * @param config.options - Static options array (mutually exclusive with `loadOptionsMethod`)
 * @param config.loadOptionsMethod - Method name for dynamic option loading
 * @param config.description - Optional custom description
 */
export function makeFieldsToReturnField(
	resource: string,
	operation: string,
	config: {
		name: string;
		defaults: string[];
		options?: Array<{ name: string; value: string; description?: string }>;
		loadOptionsMethod?: string;
		description?: string;
	},
): INodeProperties {
	// eslint-disable-next-line n8n-nodes-base/node-param-default-missing
	const field: INodeProperties = {
		displayName: 'Fields to Return',
		name: config.name,
		type: 'multiOptions',
		default: config.defaults,
		displayOptions: {
			show: { resource: [resource], operation: [operation], simplify: [false] },
		},
		description:
			config.description ??
			'Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
	};

	if (config.options) {
		field.options = config.options;
	}
	if (config.loadOptionsMethod) {
		field.typeOptions = { loadOptionsMethod: config.loadOptionsMethod };
	}

	return field;
}

/**
 * Creates a multiOptions field for selecting attributes of a related resource (e.g. listing
 * fields on a transaction). Only shown when "Simplify" is off and the parent relationship
 * field includes the related resource.
 * @param resource - The UI resource identifier
 * @param operation - The UI operation identifier
 * @param config - Field configuration
 * @param config.displayName - Label shown in the UI (e.g. `'Listing Fields to Return'`)
 * @param config.name - Parameter name (e.g. `'listingFields'`)
 * @param config.defaults - Default selected field values
 * @param config.loadOptionsMethod - Method name for dynamic option loading
 * @param config.options - Static options array (mutually exclusive with `loadOptionsMethod`)
 * @param config.conditionalOn - Parent field and values that must be selected for this field to appear
 * @param config.description - Optional custom description
 * @param config.hide - Optional `displayOptions.hide` conditions to suppress the field
 */
export function makeRelatedFieldsToReturn(
	resource: string,
	operation: string,
	config: {
		displayName: string;
		name: string;
		defaults: string[];
		loadOptionsMethod?: string;
		options?: Array<{ name: string; value: string; description?: string }>;
		conditionalOn: { field: string; values: string[] };
		description?: string;
		hide?: Record<string, string[]>;
	},
): INodeProperties {
	const show: Record<string, string[] | boolean[]> = {
		resource: [resource],
		operation: [operation],
		simplify: [false],
		[config.conditionalOn.field]: config.conditionalOn.values,
	};

	const displayOptions: NonNullable<INodeProperties['displayOptions']> = { show };
	if (config.hide) {
		displayOptions.hide = config.hide;
	}

	// eslint-disable-next-line n8n-nodes-base/node-param-default-missing
	const field: INodeProperties = {
		displayName: config.displayName,
		name: config.name,
		type: 'multiOptions',
		default: config.defaults,
		displayOptions,
		description:
			config.description ??
			'Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
	};

	if (config.loadOptionsMethod) {
		field.typeOptions = { loadOptionsMethod: config.loadOptionsMethod };
	}
	if (config.options) {
		field.options = config.options;
	}

	return field;
}

/**
 * Creates a "Delete Fields" fixedCollection for removing extended data fields by setting them
 * to null. Each entry specifies a data type and a field path (via resource locator).
 * @param resource - The UI resource identifier
 * @param operation - The UI operation identifier
 * @param config - Field configuration
 * @param config.dataTypes - Available extended data type options (e.g. metadata, publicData)
 * @param config.searchListMethod - Method name for the field path resource locator search
 * @param config.placeholder - Placeholder text for the "By Name" input mode
 */
export function makeDeleteFieldsCollection(
	resource: string,
	operation: string,
	config: {
		dataTypes: Array<{ name: string; value: string }>;
		searchListMethod: string;
		placeholder: string;
	},
): INodeProperties {
	return {
		displayName: 'Delete Fields',
		name: 'fieldDeletions',
		type: 'fixedCollection',
		placeholder: 'Add field to delete',
		default: {},
		displayOptions: { show: { resource: [resource], operation: [operation] } },
		typeOptions: { multipleValues: true },
		options: [
			{
				displayName: 'Field',
				name: 'deletions',
				values: [
					{
						displayName: 'Extended Data Type',
						name: 'dataType',
						type: 'options',
						options: config.dataTypes,
						// eslint-disable-next-line n8n-nodes-base/node-param-default-wrong-for-options
						default: 'metadata',
						description:
							'The extended data type to delete a field from. <a href="https://www.sharetribe.com/docs/concepts/extended-data/extended-data-introduction/#types-of-extended-data" target="_blank">Learn more</a>.',
					},
					{
						displayName: 'Field Path',
						name: 'fieldPath',
						type: 'resourceLocator',
						default: { mode: 'list', value: '' },
						required: true,
						modes: [
							{
								displayName: 'From List',
								name: 'list',
								type: 'list',
								placeholder: 'Select a field...',
								typeOptions: {
									searchListMethod: config.searchListMethod,
									searchable: true,
								},
							},
							{
								displayName: 'By Name',
								name: 'name',
								type: 'string',
								placeholder: config.placeholder,
								validation: [],
							},
						],
						description:
							'The field to delete. Dot-notation is always supported in the field path.<br><br>' +
							'For this sample extended data:' +
							'<pre>{ "a": { "b": true, "c": "to_delete" }, "d": false }</pre><br>' +
							"Using the 'Field Path' <pre>a.c</pre><br>Results in:" +
							'<pre>{ "a": { "b": true }, "d": false }</pre>',
					},
				],
			},
		],
	};
}

/**
 * Creates a "Fields to Add or Update" collection that groups optional writable fields
 * (e.g. profile fields, listing attributes) under a single expandable section.
 * @param resource - The UI resource identifier
 * @param operation - The UI operation identifier
 * @param config - Field configuration
 * @param config.name - Parameter name for the collection (e.g. `'profileFields'`)
 * @param config.options - Array of `INodeProperties` that appear inside the collection
 */
export function makeFieldsToAddOrUpdate(
	resource: string,
	operation: string,
	config: { name: string; options: INodeProperties[] },
): INodeProperties {
	return {
		displayName: 'Fields to Add or Update',
		name: config.name,
		type: 'collection',
		placeholder: 'Add field',
		displayOptions: { show: { resource: [resource], operation: [operation] } },
		default: {},
		options: config.options,
	};
}

/**
 * Creates a fixedCollection for editing Sharetribe extended data (metadata, publicData, etc.).
 * Supports two modes: manual field-by-field assignment with optional dot-notation, or raw JSON merge.
 * @param config - Field configuration
 * @param config.dataType - The extended data key (e.g. `'metadata'`, `'publicData'`)
 * @param config.displayName - Label shown in the UI (e.g. `'Metadata'`, `'Public Data'`)
 * @param config.fieldHint - Optional example path shown in the assignment hint (e.g. `'address.city'`)
 */
export function makeExtendedDataCollectionField(config: {
	dataType: string;
	displayName: string;
	fieldHint?: string;
}): INodeProperties {
	const { dataType, displayName, fieldHint } = config;
	const valuesKey = `${dataType}Values`;
	const label = displayName.toLowerCase();

	return {
		displayName,
		name: dataType,
		type: 'fixedCollection',
		default: {
			[valuesKey]: {
				mode: 'manual',
				fields: {},
			},
		},
		placeholder: `Add ${displayName}`,
		description: `${displayName} for this resource. In JSON mode: top-level shallow merge only — set a key to <code>null</code> to remove it. In manual mode: supports dot-notation (e.g. <code>address.city</code>) to set nested keys. <a href="https://www.sharetribe.com/docs/references/extended-data/" target="_blank">Learn more</a>.`,
		options: [
			{
				displayName,
				name: valuesKey,
				values: [
					{
						displayName: 'Mode',
						name: 'mode',
						type: 'options',
						noDataExpression: true,
						options: [
							{
								name: 'Manual Mapping',
								value: 'manual',
								description: `Add or update ${label} fields one by one`,
								action: `Add or update ${label} fields one by one`,
							},
							{
								name: 'JSON',
								value: 'json',
								description: 'Merge full JSON object at the top level',
								action: 'Merge full JSON object at the top level',
							},
						],
						default: 'manual',
					},
					{
						displayName: 'Support Dot Notation',
						name: 'dotNotation',
						type: 'boolean',
						default: true,
						// eslint-disable-next-line n8n-nodes-base/node-param-description-boolean-without-whether
						description:
							'By default, dot-notation is used in field names.<br><br>This means that "a.b" will set the property "b" underneath "a" so <pre>{ "a": { "b": value} }</pre><br>If that is not intended this can be deactivated, it will then set <pre>{ "a.b": value }</pre>',
						displayOptions: { show: { mode: ['manual'] } },
					},
					{
						displayName: 'Fields',
						name: 'fields',
						type: 'assignmentCollection',
						default: {},
						hint: fieldHint
							? `Supports dot-notation for nested objects (e.g., "${fieldHint}")`
							: 'Supports dot-notation for nested objects',
						displayOptions: { show: { mode: ['manual'] } },
					},
					{
						displayName: 'JSON',
						name: 'json',
						type: 'json',
						default: '{}',
						hint: 'Given object is merged on the top level (i.e. non-deep merge). Nested values are set as given. Top level keys set as <code>null</code> are removed.',
						displayOptions: { show: { mode: ['json'] } },
					},
				],
			},
		],
	};
}

/**
 * Creates an options field for selecting a filter condition type (eq, gteq, lt, includesAll, includesAny, isOneOf, range).
 * Used internally by {@link createExtendedDataFilter}.
 * @param includeRange - Whether to include the "Range" option (defaults to `true`)
 */
function createFilterConditionTypeField(includeRange: boolean = true): INodeProperties {
	const options: Array<{ name: string; value: string; hint?: string; description?: string }> = [
		{
			name: 'Equals',
			value: 'eq',
			description:
				'Exact match — works for "Number", true/false, and "Dropdown" (single enum) fields',
		},
		{
			name: 'Greater Than or Equal',
			value: 'gteq',
			description: 'For "Number" fields only',
		},
		{
			name: 'Includes All',
			value: 'includesAll',
			description: 'For "Checkbox" (multi-enum) fields — must include ALL given values',
		},
		{
			name: 'Includes Any',
			value: 'includesAny',
			description: 'For "Checkbox" (multi-enum) fields — must include at least ONE value',
		},
		{
			name: 'Is One Of',
			value: 'isOneOf',
			description:
				'For "Dropdown" (single enum) fields — matches if value is any of the given values',
		},
		{
			name: 'Less Than',
			value: 'lt',
			description: 'For "Number" fields only',
		},
	];

	if (includeRange) {
		options.push({
			name: 'Range',
			value: 'range',
			description: 'For "Number" fields only — specify min and max values',
		});
	}

	return {
		displayName: 'Condition',
		name: 'condition_type',
		type: 'options',
		options,
		default: 'eq',
		description: 'Condition the field must meet to be included in results',
	};
}

/**
 * Creates a fixedCollection for filtering query results by an extended data field.
 * Includes a resource locator for field name, a condition type selector, and value inputs
 * (single value or min/max range depending on condition).
 * @param dataType - The extended data type to create a filter for (e.g. `EXTENDED_DATA_TYPES.METADATA`)
 */
export function createExtendedDataFilter(dataType: ExtendedDataType): INodeProperties {
	const displayNameMap: Record<string, string> = {
		[EXTENDED_DATA_TYPES.METADATA]: 'Metadata',
		[EXTENDED_DATA_TYPES.PUBLIC_DATA]: 'Public Data',
		[EXTENDED_DATA_TYPES.PRIVATE_DATA]: 'Private Data',
		[EXTENDED_DATA_TYPES.PROTECTED_DATA]: 'Protected Data',
	};

	const searchMethodMap: Record<string, string> = {
		[EXTENDED_DATA_TYPES.METADATA]: 'getMetadataAttributes',
		[EXTENDED_DATA_TYPES.PUBLIC_DATA]: 'getPublicDataAttributes',
		[EXTENDED_DATA_TYPES.PRIVATE_DATA]: 'getPrivateDataAttributes',
		[EXTENDED_DATA_TYPES.PROTECTED_DATA]: 'getProtectedDataAttributes',
	};

	const displayName = displayNameMap[dataType];
	const label = displayName.toLowerCase();
	const conditionField = createFilterConditionTypeField();

	return {
		displayName,
		name: dataType,
		type: 'fixedCollection',
		default: {},
		placeholder: `Add ${displayName} Filter`,
		description: `Filter by ${label} fields`,
		typeOptions: {
			multipleValues: false,
		},
		options: [
			{
				displayName: `${displayName} Filter`,
				name: `${dataType}Filter`,
				// eslint-disable-next-line n8n-nodes-base/node-param-fixed-collection-type-unsorted-items
				values: [
					{
						displayName: 'Field Name',
						name: `${dataType}AttributeName`,
						noDataExpression: true,
						type: 'resourceLocator',
						default: { mode: 'list', value: '' },
						description: `Select the ${label} field to filter by. Only top level fields are supported. <a href="https://www.sharetribe.com/api-reference/integration.html#extended-data-filtering" target="_blank">Learn more</a>.`,
						modes: [
							{
								displayName: 'From List',
								name: 'list',
								type: 'list',
								placeholder: 'Select field',
								typeOptions: {
									searchListMethod: searchMethodMap[dataType],
									searchable: true,
								},
							},
							{
								displayName: 'By Name',
								name: 'name',
								type: 'string',
								placeholder: 'e.g. fieldName',
								hint: `Enter the top-level ${label} field name`,
							},
						],
					},
					{
						...conditionField,
						noDataExpression: true,
					},
					{
						displayName: 'Minimum Value',
						name: 'extendedDataMinValue',
						type: 'string',
						default: '',
						placeholder: 'e.g. 10',
						validateType: 'number',
						displayOptions: { show: { condition_type: [{ _cnd: { eq: 'range' } }] } },
						description: 'Minimum value for range filtering',
					},
					{
						displayName: 'Maximum Value',
						name: 'extendedDataMaxValue',
						type: 'string',
						default: '',
						placeholder: 'e.g. 100',
						validateType: 'number',
						displayOptions: { show: { condition_type: [{ _cnd: { eq: 'range' } }] } },
						description: 'Maximum value for range filtering',
					},
					{
						displayName: 'Value',
						name: 'extendedDataValue',
						type: 'number',
						default: null,
						placeholder: 'e.g. 10',
						validateType: 'number',
						displayOptions: {
							show: {
								condition_type: [{ _cnd: { eq: 'gteq' } }, { _cnd: { eq: 'lt' } }],
							},
						},
						description: 'Value to filter by',
					},
					{
						displayName: 'Value',
						name: 'extendedDataValue',
						type: 'string',
						default: '',
						placeholder: 'e.g. red,blue,green',
						displayOptions: {
							show: {
								condition_type: [
									{ _cnd: { eq: 'includesAll' } },
									{ _cnd: { eq: 'includesAny' } },
									{ _cnd: { eq: 'isOneOf' } },
								],
							},
						},
						description: 'Comma-separated list of values',
					},
					{
						displayName: 'Value',
						name: 'extendedDataValue',
						type: 'string',
						default: '',
						placeholder: 'e.g. active or 10 or true',
						displayOptions: { show: { condition_type: [{ _cnd: { eq: 'eq' } }] } },
						description: 'Value to filter by',
					},
				],
			},
		],
	};
}

/**
 * Creates an array of multiOptions fields for selecting event types, one per trigger resource.
 * Each field is conditionally shown when its corresponding resource is selected.
 * @param resources - List of trigger resource identifiers (e.g. `['listing', 'user', 'transaction']`)
 * @param eventTypes - Map of resource to its available event type options
 */
export function createEventTypeFields(
	resources: string[],
	eventTypes: Record<string, Array<{ name: string; value: string }>>,
): INodeProperties[] {
	return resources.map((resource, index) => {
		const capitalized = resource.charAt(0).toUpperCase() + resource.slice(1);
		return {
			displayName: `Trigger On ${' '.repeat(index)}`, // Hack to ensure a unique display name, but not to the user.
			name: `eventTypes${capitalized}`,
			type: 'multiOptions',
			displayOptions: { show: { resource: [resource] } },
			options: eventTypes[resource] || [],
			default: [],
			required: true,
		} as INodeProperties;
	});
}
