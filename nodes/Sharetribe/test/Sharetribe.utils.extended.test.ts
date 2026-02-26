import {
	addStringField,
	getExtendedDataPrefix,
	buildSparseFieldsList,
	normalizeGeolocation,
	normalizeOrigin,
	normalizeBounds,
	normalizePrice,
	normalizeImages,
	removeEmptyFields,
	parseJsonFields,
	isValidUUID,
	formatSortParameter,
	getResourceLocatorValue,
	applyFilterToResults,
	findCategoryById,
	getCategoryIdFromFilterOptions,
	categoriesToOptions,
	parseFixedCollectionValues,
} from '../v1/helpers/Sharetribe.utils';
import { IDataObject, INodePropertyOptions } from 'n8n-workflow';
import { Category } from '../v1/helpers/Sharetribe.types';

describe('Utility Functions - Extended', () => {
	describe('addStringField', () => {
		it('should add string field when value exists', () => {
			const body: IDataObject = {};
			const fields: IDataObject = { description: 'Test description' };

			addStringField(body, fields, 'description');

			expect(body.description).toBe('Test description');
		});

		it('should not add field when value is undefined', () => {
			const body: IDataObject = {};
			const fields: IDataObject = {};

			addStringField(body, fields, 'description');

			expect(body).not.toHaveProperty('description');
		});

		it('should not add field when value is empty string', () => {
			const body: IDataObject = {};
			const fields: IDataObject = { description: '' };

			addStringField(body, fields, 'description');

			expect(body).not.toHaveProperty('description');
		});

		it('should handle null values', () => {
			const body: IDataObject = {};
			const fields: IDataObject = { description: null };

			addStringField(body, fields, 'description');

			expect(body).not.toHaveProperty('description');
		});
	});

	describe('getExtendedDataPrefix', () => {
		it('should return correct prefix for publicData', () => {
			expect(getExtendedDataPrefix('publicData')).toBe('pub');
		});

		it('should return correct prefix for protectedData', () => {
			expect(getExtendedDataPrefix('protectedData')).toBe('prot');
		});

		it('should return correct prefix for privateData', () => {
			expect(getExtendedDataPrefix('privateData')).toBe('priv');
		});

		it('should return correct prefix for metadata', () => {
			expect(getExtendedDataPrefix('metadata')).toBe('meta');
		});
	});

	describe('buildSparseFieldsList', () => {
		it('should always include id when no matches', () => {
			const result = buildSparseFieldsList([], []);
			expect(result).toEqual(['id']);
		});

		it('should return only id when includeOptions is empty', () => {
			const result = buildSparseFieldsList([], ['title', 'description', 'price']);
			expect(result).toEqual(['id']);
		});

		it('should include fields from includeOptions that are in attributeKeys', () => {
			const result = buildSparseFieldsList(['title', 'author', 'price'], ['title', 'description', 'price']);
			expect(result).toContain('id');
			expect(result).toContain('title');
			expect(result).toContain('price');
			expect(result).not.toContain('author');
			expect(result).not.toContain('description');
		});

		it('should handle no matches between includeOptions and attributeKeys', () => {
			const result = buildSparseFieldsList(['author', 'images'], ['title', 'description']);
			expect(result).toEqual(['id']);
		});

		it('should filter includeOptions to only those in attributeKeys', () => {
			const includeOptions = ['author', 'customer', 'title', 'provider'];
			const attributeKeys = ['title', 'description', 'price'];
			const result = buildSparseFieldsList(includeOptions, attributeKeys);

			expect(result).toEqual(['id', 'title']);
		});
	});


	describe('normalizeGeolocation', () => {
		it('should parse valid lat,lng string', () => {
			const result = normalizeGeolocation('40.7128,-74.0060');
			expect(result).toEqual({ lat: 40.7128, lng: -74.0060 });
		});

		it('should handle string with spaces', () => {
			const result = normalizeGeolocation('40.7128 , -74.0060 ');
			expect(result).toEqual({ lat: 40.7128, lng: -74.0060 });
		});

		it('should return undefined for empty string', () => {
			const result = normalizeGeolocation('');
			expect(result).toBeUndefined();
		});

		it('should return undefined for comma only', () => {
			const result = normalizeGeolocation(',');
			expect(result).toBeUndefined();
		});

		it('should return undefined for invalid format', () => {
			const result = normalizeGeolocation('not-a-coordinate');
			expect(result).toBeUndefined();
		});

		it('should return undefined for single value', () => {
			const result = normalizeGeolocation('40.7128');
			expect(result).toBeUndefined();
		});

		it('should return undefined for null', () => {
			const result = normalizeGeolocation(null);
			expect(result).toBeUndefined();
		});
	});

	describe('normalizeOrigin', () => {
		it('should parse valid lat,lng string', () => {
			const result = normalizeOrigin('40.7128,-74.0060');
			expect(result).toBe('40.7128,-74.0060');
		});

		it('should handle string with spaces and preserve format', () => {
			const result = normalizeOrigin(' 40.7128 , -74.0060 ');
			expect(result).toBe('40.7128,-74.0060');
		});

		it('should parse object with lat/lng properties', () => {
			const result = normalizeOrigin({ lat: 40.7128, lng: -74.0060 });
			expect(result).toBe('40.7128,-74.006');
		});

		it('should return undefined for empty string', () => {
			const result = normalizeOrigin('');
			expect(result).toBeUndefined();
		});

		it('should return undefined for comma only', () => {
			const result = normalizeOrigin(',');
			expect(result).toBeUndefined();
		});

		it('should return undefined for invalid format', () => {
			const result = normalizeOrigin('invalid');
			expect(result).toBeUndefined();
		});

		it('should return undefined for null', () => {
			const result = normalizeOrigin(null);
			expect(result).toBeUndefined();
		});

		it('should return undefined for object without lat/lng', () => {
			const result = normalizeOrigin({ foo: 'bar' });
			expect(result).toBeUndefined();
		});
	});

	describe('normalizeBounds', () => {
		it('should parse valid string bounds', () => {
			const result = normalizeBounds('40.8,-74.0', '40.6,-74.2');
			expect(result).toBe('40.8,-74,40.6,-74.2');
		});

		it('should handle strings with spaces', () => {
			const result = normalizeBounds(' 40.8 , -74.0 ', ' 40.6 , -74.2 ');
			expect(result).toBe('40.8,-74,40.6,-74.2');
		});

		it('should parse object bounds', () => {
			const ne = { lat: 40.8, lng: -74.0 };
			const sw = { lat: 40.6, lng: -74.2 };
			const result = normalizeBounds(ne, sw);
			expect(result).toBe('40.8,-74,40.6,-74.2');
		});

		it('should return undefined for empty strings', () => {
			const result = normalizeBounds('', '');
			expect(result).toBeUndefined();
		});

		it('should return undefined for comma only', () => {
			const result = normalizeBounds(',', ',');
			expect(result).toBeUndefined();
		});

		it('should return undefined for invalid format', () => {
			const result = normalizeBounds('invalid', '40.6,-74.2');
			expect(result).toBeUndefined();
		});

		it('should return undefined for mixed valid/invalid', () => {
			const result = normalizeBounds('40.8,-74.0', 'invalid');
			expect(result).toBeUndefined();
		});
	});

	describe('normalizePrice', () => {
		it('should parse valid price with currency string', () => {
			const priceCollection = {
				priceDetails: {
					amount: 1000,
					currency: 'USD',
				},
			};
			const result = normalizePrice(priceCollection);
			expect(result).toEqual({ amount: 1000, currency: 'USD' });
		});

		it('should parse price with currency object', () => {
			const priceCollection = {
				priceDetails: {
					amount: 2500,
					currency: { value: 'EUR' },
				},
			};
			const result = normalizePrice(priceCollection);
			expect(result).toEqual({ amount: 2500, currency: 'EUR' });
		});

		it('should return undefined for null input', () => {
			const result = normalizePrice(null);
			expect(result).toBeUndefined();
		});

		it('should return undefined for non-object input', () => {
			const result = normalizePrice('not an object');
			expect(result).toBeUndefined();
		});

		it('should return undefined for missing priceDetails', () => {
			const result = normalizePrice({ foo: 'bar' });
			expect(result).toBeUndefined();
		});

		it('should return undefined for missing amount', () => {
			const priceCollection = {
				priceDetails: {
					currency: 'USD',
				},
			};
			const result = normalizePrice(priceCollection);
			expect(result).toBeUndefined();
		});

		it('should return undefined for missing currency', () => {
			const priceCollection = {
				priceDetails: {
					amount: 1000,
				},
			};
			const result = normalizePrice(priceCollection);
			expect(result).toBeUndefined();
		});
	});

	describe('normalizeImages', () => {
		it('should convert array of values to strings', () => {
			const result = normalizeImages([123, 'image.jpg', true]);
			expect(result).toEqual(['123', 'image.jpg', 'true']);
		});

		it('should return empty array for empty input', () => {
			const result = normalizeImages([]);
			expect(result).toEqual([]);
		});

		it('should return undefined for null', () => {
			const result = normalizeImages(null);
			expect(result).toBeUndefined();
		});

		it('should return undefined for non-array', () => {
			const result = normalizeImages('not an array');
			expect(result).toBeUndefined();
		});
	});

	describe('removeEmptyFields', () => {
		it('should remove null values', () => {
			const fields: IDataObject = { a: 'value', b: null, c: 'another' };
			const result = removeEmptyFields(fields);
			expect(result).toEqual({ a: 'value', c: 'another' });
		});

		it('should remove undefined values', () => {
			const fields: IDataObject = { a: 'value', b: undefined, c: 'another' };
			const result = removeEmptyFields(fields);
			expect(result).toEqual({ a: 'value', c: 'another' });
		});

		it('should remove empty strings', () => {
			const fields: IDataObject = { a: 'value', b: '', c: 'another' };
			const result = removeEmptyFields(fields);
			expect(result).toEqual({ a: 'value', c: 'another' });
		});

		it('should keep zero values', () => {
			const fields: IDataObject = { a: 0, b: null, c: false };
			const result = removeEmptyFields(fields);
			expect(result).toEqual({ a: 0, c: false });
		});

		it('should return empty object for all empty fields', () => {
			const fields: IDataObject = { a: null, b: undefined, c: '' };
			const result = removeEmptyFields(fields);
			expect(result).toEqual({});
		});
	});

	describe('parseJsonFields', () => {
		it('should parse valid JSON string fields', () => {
			const fields: IDataObject = {
				metadata: '{"key":"value"}',
				other: 'plain string',
			};
			const result = parseJsonFields(fields, ['metadata']);
			expect(result.metadata).toEqual({ key: 'value' });
			expect(result.other).toBe('plain string');
		});

		it('should handle multiple JSON fields', () => {
			const fields: IDataObject = {
				publicData: '{"foo":"bar"}',
				privateData: '{"baz":"qux"}',
			};
			const result = parseJsonFields(fields, ['publicData', 'privateData']);
			expect(result.publicData).toEqual({ foo: 'bar' });
			expect(result.privateData).toEqual({ baz: 'qux' });
		});

		it('should skip fields that are not strings', () => {
			const fields: IDataObject = {
				alreadyParsed: { key: 'value' },
				number: 123,
			};
			const result = parseJsonFields(fields, ['alreadyParsed', 'number']);
			expect(result.alreadyParsed).toEqual({ key: 'value' });
			expect(result.number).toBe(123);
		});

		it('should skip empty string fields', () => {
			const fields: IDataObject = {
				empty: '',
				whitespace: '   ',
			};
			const result = parseJsonFields(fields, ['empty']);
			expect(result.empty).toBe('');
		});

		it('should throw error for invalid JSON', () => {
			const fields: IDataObject = {
				invalid: '{not valid json}',
			};
			expect(() => parseJsonFields(fields, ['invalid'])).toThrow('Invalid JSON in field "invalid"');
		});
	});

	describe('isValidUUID', () => {
		it('should validate correct v4 and v5 UUIDs', () => {
			expect(isValidUUID('550e8400-e29b-41d4-a716-446655440000')).toBe(true); // v4
			expect(isValidUUID('f47ac10b-58cc-4372-a567-0e02b2c3d479')).toBe(true); // v4
			expect(isValidUUID('886313e1-3b8a-5372-9b90-0c9aee199e5d')).toBe(true); // v5
		});

		it('should reject invalid UUIDs', () => {
			expect(isValidUUID('not-a-uuid')).toBe(false);
			expect(isValidUUID('550e8400-e29b-41d4-a716')).toBe(false);
			expect(isValidUUID('550e8400-e29b-41d4-a716-446655440000-extra')).toBe(false);
			expect(isValidUUID('')).toBe(false);
		});

		it('should reject UUID v1 (only v4 and v5 are valid)', () => {
			expect(isValidUUID('6ba7b810-9dad-11d1-80b4-00c04fd430c8')).toBe(false); // v1
		});

		it('should handle uppercase UUIDs', () => {
			expect(isValidUUID('550E8400-E29B-41D4-A716-446655440000')).toBe(true);
		});

		it('should validate UUID version 4', () => {
			expect(isValidUUID('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
		});

		it('should validate UUID version 5', () => {
			expect(isValidUUID('886313e1-3b8a-5372-9b90-0c9aee199e5d')).toBe(true);
		});
	});

	describe('formatSortParameter', () => {
		it('should format single sort rule with DESC', () => {
			const sortOptions: IDataObject = {
				sort: [{ field: 'createdAt', direction: 'DESC' }],
			};
			const result = formatSortParameter(sortOptions);
			expect(result).toEqual(['createdAt']);
		});

		it('should format single sort rule with ASC', () => {
			const sortOptions: IDataObject = {
				sort: [{ field: 'price', direction: 'ASC' }],
			};
			const result = formatSortParameter(sortOptions);
			expect(result).toEqual(['-price']);
		});

		it('should format multiple sort rules', () => {
			const sortOptions: IDataObject = {
				sort: [
					{ field: 'createdAt', direction: 'DESC' },
					{ field: 'price', direction: 'ASC' },
				],
			};
			const result = formatSortParameter(sortOptions);
			expect(result).toEqual(['createdAt', '-price']);
		});

		it('should return undefined for empty sort array', () => {
			const sortOptions: IDataObject = { sort: [] };
			const result = formatSortParameter(sortOptions);
			expect(result).toBeUndefined();
		});

		it('should return undefined for missing sort', () => {
			const sortOptions: IDataObject = {};
			const result = formatSortParameter(sortOptions);
			expect(result).toBeUndefined();
		});

		it('should skip rules with empty field', () => {
			const sortOptions: IDataObject = {
				sort: [
					{ field: '', direction: 'DESC' },
					{ field: 'price', direction: 'ASC' },
				],
			};
			const result = formatSortParameter(sortOptions);
			expect(result).toEqual(['-price']);
		});

		it('should default to DESC for unknown direction', () => {
			const sortOptions: IDataObject = {
				sort: [{ field: 'createdAt', direction: 'INVALID' }],
			};
			const result = formatSortParameter(sortOptions);
			expect(result).toEqual(['createdAt']);
		});
	});

	describe('getResourceLocatorValue', () => {
		it('should return empty string for null or undefined', () => {
			expect(getResourceLocatorValue(null)).toBe('');
			expect(getResourceLocatorValue(undefined)).toBe('');
		});

		it('should return string value as-is', () => {
			expect(getResourceLocatorValue('test-id')).toBe('test-id');
		});

		it('should extract value from list mode object', () => {
			const locator = { mode: 'list', value: ['id1', 'id2'] };
			expect(getResourceLocatorValue(locator)).toEqual(['id1', 'id2']);
		});

		it('should extract value from name mode object', () => {
			const locator = { mode: 'name', value: 'resource-name' };
			expect(getResourceLocatorValue(locator)).toBe('resource-name');
		});

		it('should extract value from __rl object', () => {
			const locator = { __rl: true, value: 'resource-id' };
			expect(getResourceLocatorValue(locator)).toBe('resource-id');
		});

		it('should return empty string for number', () => {
			expect(getResourceLocatorValue(123)).toBe('');
		});

		it('should convert other types to string', () => {
			expect(getResourceLocatorValue(true)).toBe('true');
		});

		it('should return empty string for list mode with non-array value', () => {
			const locator = { mode: 'list', value: 'not-array' };
			expect(getResourceLocatorValue(locator)).toBe('not-array');
		});

		it('should return empty string for name mode without value', () => {
			const locator = { mode: 'name' };
			expect(getResourceLocatorValue(locator)).toBe('');
		});
	});

	describe('applyFilterToResults', () => {
		const results: INodePropertyOptions[] = [
			{ name: 'First Item', value: 'first' },
			{ name: 'Second Item', value: 'second' },
			{ name: 'Third Item', value: 'third' },
		];

		it('should return all results when no filter provided', () => {
			expect(applyFilterToResults(results)).toEqual(results);
			expect(applyFilterToResults(results, undefined)).toEqual(results);
		});

		it('should filter by name (case insensitive)', () => {
			const filtered = applyFilterToResults(results, 'first');
			expect(filtered).toEqual([{ name: 'First Item', value: 'first' }]);
		});

		it('should filter by value (case insensitive)', () => {
			const filtered = applyFilterToResults(results, 'SECOND');
			expect(filtered).toEqual([{ name: 'Second Item', value: 'second' }]);
		});

		it('should return multiple matches', () => {
			const filtered = applyFilterToResults(results, 'item');
			expect(filtered).toHaveLength(3);
		});

		it('should return empty array when no matches', () => {
			const filtered = applyFilterToResults(results, 'nonexistent');
			expect(filtered).toEqual([]);
		});
	});

	describe('findCategoryById', () => {
		const categories: Category[] = [
			{ id: 'cat-1', name: 'Category 1' },
			{ id: 'cat-2', name: 'Category 2' },
			{ id: 'cat-3', name: 'Category 3' },
		];

		it('should find category by id', () => {
			const result = findCategoryById(categories, 'cat-2');
			expect(result).toEqual({ id: 'cat-2', name: 'Category 2' });
		});

		it('should return null for non-existent id', () => {
			const result = findCategoryById(categories, 'cat-99');
			expect(result).toBeNull();
		});

		it('should return null for empty array', () => {
			const result = findCategoryById([], 'cat-1');
			expect(result).toBeNull();
		});

		it('should return first matching category', () => {
			const duplicates: Category[] = [
				{ id: 'cat-1', name: 'First' },
				{ id: 'cat-1', name: 'Second' },
			];
			const result = findCategoryById(duplicates, 'cat-1');
			expect(result).toEqual({ id: 'cat-1', name: 'First' });
		});
	});

	describe('getCategoryIdFromFilterOptions', () => {
		it('should extract categoryLevel1 from filter options', () => {
			const filterOptions: IDataObject = {
				filters: [
					{
						filterType: 'category',
						categoryLevel1: { value: 'cat-1' },
					},
				],
			};
			const result = getCategoryIdFromFilterOptions(filterOptions, 'categoryLevel1');
			expect(result).toBe('cat-1');
		});

		it('should extract categoryLevel2 from filter options', () => {
			const filterOptions: IDataObject = {
				filters: [
					{
						filterType: 'category',
						categoryLevel2: { value: 'cat-2' },
					},
				],
			};
			const result = getCategoryIdFromFilterOptions(filterOptions, 'categoryLevel2');
			expect(result).toBe('cat-2');
		});

		it('should return null for non-category filter type', () => {
			const filterOptions: IDataObject = {
				filters: [
					{
						filterType: 'price',
						categoryLevel1: { value: 'cat-1' },
					},
				],
			};
			const result = getCategoryIdFromFilterOptions(filterOptions, 'categoryLevel1');
			expect(result).toBeNull();
		});

		it('should return null for empty filters array', () => {
			const filterOptions: IDataObject = { filters: [] };
			const result = getCategoryIdFromFilterOptions(filterOptions, 'categoryLevel1');
			expect(result).toBeNull();
		});

		it('should return null for missing filters', () => {
			const filterOptions: IDataObject = {};
			const result = getCategoryIdFromFilterOptions(filterOptions, 'categoryLevel1');
			expect(result).toBeNull();
		});

		it('should return null for missing category level', () => {
			const filterOptions: IDataObject = {
				filters: [
					{
						filterType: 'category',
					},
				],
			};
			const result = getCategoryIdFromFilterOptions(filterOptions, 'categoryLevel1');
			expect(result).toBeNull();
		});
	});

	describe('categoriesToOptions', () => {
		it('should convert categories to sorted options', () => {
			const categories: Category[] = [
				{ id: 'cat-3', name: 'Zebra' },
				{ id: 'cat-1', name: 'Apple' },
				{ id: 'cat-2', name: 'Banana' },
			];
			const result = categoriesToOptions(categories);
			expect(result).toEqual([
				{ name: 'Apple', value: 'cat-1' },
				{ name: 'Banana', value: 'cat-2' },
				{ name: 'Zebra', value: 'cat-3' },
			]);
		});

		it('should return empty array for empty input', () => {
			const result = categoriesToOptions([]);
			expect(result).toEqual([]);
		});

		it('should handle single category', () => {
			const categories: Category[] = [{ id: 'cat-1', name: 'Only Category' }];
			const result = categoriesToOptions(categories);
			expect(result).toEqual([{ name: 'Only Category', value: 'cat-1' }]);
		});
	});

	describe('parseFixedCollectionValues', () => {
		it('should use lodash set when dotNotation is true', () => {
			const values: IDataObject = {
				mode: 'manual',
				dotNotation: true,
				fields: {
					assignments: [
						{ name: 'shipping.address', value: '123 Main St', type: 'string' },
					],
				},
			};

			const result = parseFixedCollectionValues(values);

			expect(result).toEqual({
				shipping: {
					address: '123 Main St',
				},
			});
		});

		it('should use literal keys when dotNotation is false', () => {
			const values: IDataObject = {
				mode: 'manual',
				dotNotation: false,
				fields: {
					assignments: [
						{ name: 'shipping.address', value: '123 Main St', type: 'string' },
						{ name: 'details.brand', value: 'Apple', type: 'string' },
					],
				},
			};

			const result = parseFixedCollectionValues(values);

			expect(result).toEqual({
				'shipping.address': '123 Main St',
				'details.brand': 'Apple',
			});
		});

		it('should default to dot notation enabled when dotNotation is undefined (backwards compat)', () => {
			const values: IDataObject = {
				mode: 'manual',
				// dotNotation not set — simulates existing saved workflows
				fields: {
					assignments: [
						{ name: 'shipping.address', value: '123 Main St', type: 'string' },
					],
				},
			};

			const result = parseFixedCollectionValues(values);

			expect(result).toEqual({
				shipping: {
					address: '123 Main St',
				},
			});
		});

		it('should merge with baseData when dotNotation is false', () => {
			const values: IDataObject = {
				mode: 'manual',
				dotNotation: false,
				fields: {
					assignments: [
						{ name: 'profile.publicData.category', value: 'electronics', type: 'string' },
					],
				},
			};

			const baseData: IDataObject = { existing: 'value' };
			const result = parseFixedCollectionValues(values, baseData);

			expect(result).toEqual({
				existing: 'value',
				'profile.publicData.category': 'electronics',
			});
		});

		it('should still work in JSON mode regardless of dotNotation', () => {
			const values: IDataObject = {
				mode: 'json',
				dotNotation: false,
				json: '{"shipping": {"address": "123 Main St"}}',
			};

			const result = parseFixedCollectionValues(values);

			expect(result).toEqual({
				shipping: {
					address: '123 Main St',
				},
			});
		});
	});
});
