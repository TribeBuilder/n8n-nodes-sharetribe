import {
	isValidUUID,
	convertToUtcIso8601,
	removeEmptyFields,
	parseJsonFields,
	formatSortParameter,
	getResourceLocatorValue,
} from '../v1/helpers/Sharetribe';
import { filterEventTypesByResources } from '../v1/helpers/Sharetribe.utils';

describe('GenericFunctions Utilities', () => {
	describe('isValidUUID', () => {
		// Critical: Validates user/listing/transaction IDs before API calls to prevent 400 errors
		it('should validate v4 and v5 UUIDs and reject invalid formats', () => {
			// Valid v4 UUID (has '4' in 3rd section, 8/9/a/b in 4th)
			expect(isValidUUID('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
			expect(isValidUUID('550e8400-e29b-4716-a716-446655440000')).toBe(true);

			// Valid v5 UUID (has '5' in 3rd section)
			expect(isValidUUID('b95894e3-5af2-5394-aaf8-531fb2b89019')).toBe(true);
			expect(isValidUUID('a3bb189e-8bf9-5888-9912-ace4e6543002')).toBe(true);

			// Invalid formats
			expect(isValidUUID('not-a-uuid')).toBe(false);
			expect(isValidUUID('550e8400-e29b-41d4-a716')).toBe(false); // Too short
			expect(isValidUUID('')).toBe(false);

			// Valid UUID but not v4 or v5
			expect(isValidUUID('a3bb189e-8bf9-3888-9912-ace4e6543002')).toBe(false);
			expect(isValidUUID('00000000-0000-0000-0000-000000000000')).toBe(false);
		});
	});

	describe('convertToUtcIso8601', () => {
		// Critical: Ensures all dates sent to Sharetribe API are in correct ISO 8601 format
		it('should convert various date formats to UTC ISO 8601', () => {
			const date = new Date('2024-01-15T10:30:00.000Z');
			expect(convertToUtcIso8601(date)).toBe('2024-01-15T10:30:00.000Z');

			const isoString = '2024-01-15T10:30:00.000Z';
			expect(convertToUtcIso8601(isoString)).toBe(isoString);

			// Date strings get converted to ISO
			expect(convertToUtcIso8601('2024-01-15')).toMatch(/2024-01-15T00:00:00\.000Z/);
		});
	});

	describe('removeEmptyFields', () => {
		// Important: Cleans API request bodies to avoid sending null/undefined/empty values
		it('should remove null, undefined, and empty strings but keep falsy values like 0 and false', () => {
			const input = {
				name: 'Test',
				value: null,
				count: 0,
				active: false,
				missing: undefined,
			};
			const result = removeEmptyFields(input);

			expect(result).toEqual({
				name: 'Test',
				count: 0, // Zero is kept
				active: false, // False is kept
			});
		});

		// Edge case: Function doesn't recurse into nested objects
		it('should not process nested objects recursively', () => {
			const input = {
				name: 'test',
				metadata: { key1: 'value1', key2: null },
			};
			const result = removeEmptyFields(input);
			expect(result.metadata).toEqual({ key1: 'value1', key2: null });
		});
	});

	describe('parseJsonFields', () => {
		// Critical: Parses JSON strings from node parameters (extended data, metadata)
		it('should parse valid JSON strings in specified fields', () => {
			const input = {
				name: 'test',
				publicData: '{"key": "value"}',
				metadata: '{"foo": "bar"}',
				other: '{"not": "parsed"}',
			};
			const result = parseJsonFields(input, ['publicData', 'metadata']);

			expect(result.publicData).toEqual({ key: 'value' });
			expect(result.metadata).toEqual({ foo: 'bar' });
			expect(result.other).toBe('{"not": "parsed"}'); // Not in parse list
		});

		// Critical: Must throw on invalid JSON to give user clear error message
		it('should throw descriptive error on invalid JSON', () => {
			const input = { config: 'not valid json' };
			expect(() => parseJsonFields(input, ['config'])).toThrow('not valid JSON');
		});

		// Edge case: Already-parsed objects are left unchanged
		it('should skip non-string fields', () => {
			const input = { config: { already: 'parsed' }, count: 42 };
			const result = parseJsonFields(input, ['config']);
			expect(result).toEqual(input);
		});
	});

	describe('formatSortParameter', () => {
		// Important: Sharetribe has inverted sort convention (no prefix = DESC, "-" = ASC)
		it('should format sort with Sharetribe convention: no prefix = DESC, minus = ASC', () => {
			// Descending (default)
			expect(formatSortParameter({ sort: [{ field: 'createdAt', direction: 'DESC' }] })).toEqual(
				['createdAt'],
			);

			// Ascending gets minus prefix
			expect(formatSortParameter({ sort: [{ field: 'createdAt', direction: 'ASC' }] })).toEqual(
				['-createdAt'],
			);

			// Empty/missing
			expect(formatSortParameter({})).toBeUndefined();
		});

		// Multiple sort fields are comma-separated
		it('should handle multiple sort fields', () => {
			const sortOptions = {
				sort: [
					{ field: 'createdAt', direction: 'DESC' },
					{ field: 'price', direction: 'ASC' },
				],
			};
			const result = formatSortParameter(sortOptions);
			expect(result).toContain('createdAt');
			expect(result).toContain('-price');
		});
	});

	describe('getResourceLocatorValue', () => {
		// Critical: Extracts values from n8n resource locator UI component (list/name/id modes)
		it('should extract value from resource locator in list and name modes', () => {
			// List mode
			expect(getResourceLocatorValue({ mode: 'list', value: 'test-id' })).toBe('test-id');

			// Name mode
			expect(getResourceLocatorValue({ mode: 'name', value: 'test-name' })).toBe('test-name');

			// Array values in list mode are returned as arrays
			expect(getResourceLocatorValue({ mode: 'list', value: ['id1', 'id2'] })).toEqual(['id1', 'id2']);
		});

		// Direct string IDs are passed through unchanged
		it('should handle direct string values and edge cases', () => {
			expect(getResourceLocatorValue('direct-string-id')).toBe('direct-string-id');
			expect(getResourceLocatorValue(null)).toBe('');
			expect(getResourceLocatorValue(undefined)).toBe('');
			expect(getResourceLocatorValue(123)).toBe(''); // Numbers don't match expected types
		});
	});

	describe('filterEventTypesByResources', () => {
		// Critical: Filters event types based on selected resources for trigger polling
		it('should return all event types when "all" resource is selected', () => {
			const resources = ['all'];
			const eventTypes = ['transaction/initiated', 'listing/created', 'user/updated'];
			expect(filterEventTypesByResources(resources, eventTypes)).toEqual(eventTypes);
		});

		it('should return empty array when empty string is present (means "All Events")', () => {
			// Empty string means "All Events" - return empty array to indicate no filter
			const resources = ['transaction', 'listing'];
			const eventTypes = ['transaction/initiated', '', 'listing/created'];
			const result = filterEventTypesByResources(resources, eventTypes);
			expect(result).toEqual([]);
		});

		it('should return empty array for "all" resource with empty string (bug fix)', () => {
			// This is the reported bug: user selects resource "all" and "All Events" (empty string)
			// Empty string means no event type filter at all
			const resources = ['transaction', 'all'];
			const eventTypes = ['transaction/initiated', ''];
			const result = filterEventTypesByResources(resources, eventTypes);
			expect(result).toEqual([]);
		});

		it('should return empty array when only empty string in event types', () => {
			const resources = ['all'];
			const eventTypes = [''];
			expect(filterEventTypesByResources(resources, eventTypes)).toEqual([]);
		});

		it('should filter event types by resource when specific resources selected', () => {
			const resources = ['transaction'];
			const eventTypes = ['transaction/initiated', 'listing/created', 'transaction/completed'];
			const result = filterEventTypesByResources(resources, eventTypes);
			expect(result).toEqual(['transaction/initiated', 'transaction/completed']);
		});

		it('should return resources when event types is empty array', () => {
			const resources = ['transaction', 'listing'];
			const eventTypes: string[] = [];
			expect(filterEventTypesByResources(resources, eventTypes)).toEqual(resources);
		});

		it('should handle multiple resources with mixed event types', () => {
			const resources = ['transaction', 'listing'];
			const eventTypes = ['transaction/initiated', 'user/updated', 'listing/created'];
			const result = filterEventTypesByResources(resources, eventTypes);
			expect(result).toEqual(['transaction/initiated', 'listing/created']);
		});
	});
});
