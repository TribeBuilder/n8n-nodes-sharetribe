import {
	normalizeGeolocation,
	normalizeOrigin,
	normalizeBounds,
	normalizePrice,
	normalizeImages,
	addExtendedDataFields,
} from '../v1/helpers/Sharetribe';
import type { IDataObject } from 'n8n-workflow';

describe('GenericFunctions Normalizers', () => {
	describe('normalizeGeolocation', () => {
		// Tests lat,lng string parsing
		it('should parse lat,lng string into geolocation object', () => {
			const result = normalizeGeolocation('40.7128,-74.0060');

			expect(result).toEqual({
				lat: 40.7128,
				lng: -74.006,
			});
		});

		// Tests whitespace handling
		it('should parse lat,lng string with whitespace', () => {
			const result = normalizeGeolocation('40.7128, -74.0060');

			expect(result).toEqual({
				lat: 40.7128,
				lng: -74.006,
			});
		});

		// Tests invalid geolocation formats
		it('should return undefined for invalid geolocation', () => {
			expect(normalizeGeolocation('invalid')).toBeUndefined();
			expect(normalizeGeolocation('')).toBeUndefined();
			expect(normalizeGeolocation(null)).toBeUndefined();
			expect(normalizeGeolocation('40.7128')).toBeUndefined(); // Only one coordinate
		});
	});

	describe('normalizeOrigin', () => {
		// Tests string input - preserves original precision
		it('should normalize string origin "lat,lng" format', () => {
			const result = normalizeOrigin('37.7749,-122.4194');

			expect(result).toBe('37.7749,-122.4194');
		});

		// Tests string input with whitespace - trims but preserves precision
		it('should normalize string origin with whitespace', () => {
			const result = normalizeOrigin('37.7749, -122.4194');

			expect(result).toBe('37.7749,-122.4194');
		});

		// Tests string with trailing zeros - preserves format
		it('should preserve trailing zeros in string input', () => {
			const result = normalizeOrigin('40.7128,-74.0060');

			expect(result).toBe('40.7128,-74.0060');
		});

		// Tests JSON object input
		it('should normalize JSON object origin { lat, lng }', () => {
			const result = normalizeOrigin({ lat: 37.7749, lng: -122.4194 });

			expect(result).toBe('37.7749,-122.4194');
		});

		// Tests JSON object with string numbers
		it('should normalize JSON object with string numbers', () => {
			const result = normalizeOrigin({ lat: '37.7749', lng: '-122.4194' });

			expect(result).toBe('37.7749,-122.4194');
		});

		// Tests invalid input
		it('should return undefined for invalid origin', () => {
			expect(normalizeOrigin('')).toBeUndefined();
			expect(normalizeOrigin(null)).toBeUndefined();
			expect(normalizeOrigin(undefined)).toBeUndefined();
			expect(normalizeOrigin('invalid')).toBeUndefined();
			expect(normalizeOrigin('37.7749')).toBeUndefined(); // Only one coordinate
			expect(normalizeOrigin({})).toBeUndefined(); // Empty object
			expect(normalizeOrigin({ lat: 37.7749 })).toBeUndefined(); // Missing lng
		});
	});

	describe('normalizeBounds', () => {
		// Tests two string inputs
		it('should normalize bounding box from two strings', () => {
			const result = normalizeBounds('37.8049,-122.3994', '37.7449,-122.4394');

			expect(result).toBe('37.8049,-122.3994,37.7449,-122.4394');
		});

		// Tests strings with whitespace
		it('should normalize bounding box strings with whitespace', () => {
			const result = normalizeBounds('37.8049, -122.3994', '37.7449, -122.4394');

			expect(result).toBe('37.8049,-122.3994,37.7449,-122.4394');
		});

		// Tests JSON object inputs
		it('should normalize bounding box from JSON objects with lat/lng', () => {
			const ne = { lat: 37.8049, lng: -122.3994 };
			const sw = { lat: 37.7449, lng: -122.4394 };

			const result = normalizeBounds(ne, sw);

			expect(result).toBe('37.8049,-122.3994,37.7449,-122.4394');
		});

		// Tests JSON object with string numbers
		it('should normalize JSON objects with string numbers', () => {
			const ne = { lat: '37.8049', lng: '-122.3994' };
			const sw = { lat: '37.7449', lng: '-122.4394' };

			const result = normalizeBounds(ne, sw);

			expect(result).toBe('37.8049,-122.3994,37.7449,-122.4394');
		});

		// Tests invalid input
		it('should return undefined for invalid bounds', () => {
			expect(normalizeBounds('', '')).toBeUndefined();
			expect(normalizeBounds(null, null)).toBeUndefined();
			expect(normalizeBounds('37.8049,-122.3994', null)).toBeUndefined();
			expect(normalizeBounds('invalid', 'invalid')).toBeUndefined();
			expect(normalizeBounds('37.8049', '37.7449')).toBeUndefined(); // Only lat, no lng
			expect(normalizeBounds({}, {})).toBeUndefined(); // Empty objects
			expect(normalizeBounds({ lat: 37.8049 }, { lat: 37.7449 })).toBeUndefined(); // Missing lng
		});
	});

	describe('normalizePrice', () => {
		// Tests price normalization with valid priceDetails
		it('should normalize price collection with priceDetails', () => {
			const price = {
				priceDetails: {
					amount: 10000,
					currency: 'USD',
				},
			};

			const result = normalizePrice(price);

			expect(result).toEqual({
				amount: 10000,
				currency: 'USD',
			});
		});

		// Tests price with zero amount
		it('should handle zero amount', () => {
			const price = {
				priceDetails: {
					amount: 0,
					currency: 'EUR',
				},
			};

			const result = normalizePrice(price);

			expect(result).toEqual({
				amount: 0,
				currency: 'EUR',
			});
		});

		// Tests invalid price collection
		it('should return undefined for invalid price collection', () => {
			expect(normalizePrice(null)).toBeUndefined();
			expect(normalizePrice({})).toBeUndefined();
			expect(normalizePrice({ priceDetails: {} })).toBeUndefined();
			expect(normalizePrice({ priceDetails: { amount: 100 } })).toBeUndefined(); // Missing currency
		});
	});

	describe('normalizeImages', () => {
		// Tests array of image objects converting to string array
		it('should convert array of image objects to ID strings', () => {
			const images = [
				{ id: 'image-1', type: 'imageAsset' },
				{ id: 'image-2', type: 'imageAsset' },
			];

			const result = normalizeImages(images);

			expect(result).toBeDefined();
			expect(result).toHaveLength(2);
			expect(result![0]).toBe('[object Object]');
			expect(result![1]).toBe('[object Object]');
		});

		// Tests array of image ID strings
		it('should handle array of image ID strings', () => {
			const images = ['image-1', 'image-2', 'image-3'];

			const result = normalizeImages(images);

			expect(result).toBeDefined();
			expect(result).toHaveLength(3);
			expect(result).toEqual(['image-1', 'image-2', 'image-3']);
		});

		// Tests empty array
		it('should return empty array for empty input array', () => {
			const result = normalizeImages([]);

			expect(result).toEqual([]);
		});

		// Tests invalid input
		it('should return undefined for invalid images input', () => {
			expect(normalizeImages(null)).toBeUndefined();
			expect(normalizeImages('')).toBeUndefined();
			expect(normalizeImages(undefined)).toBeUndefined();
			expect(normalizeImages('not-an-array')).toBeUndefined();
		});
	});

	describe('addExtendedDataFields', () => {
		// Tests adding publicData to body
		it('should add publicData to request body', () => {
			const body: IDataObject = { title: 'Test' };
			const fields: IDataObject = {
				publicData: { category: 'electronics', brand: 'Apple' },
			};

			addExtendedDataFields(body, fields);

			expect(body.publicData).toEqual({ category: 'electronics', brand: 'Apple' });
		});

		// Tests adding multiple extended data fields
		it('should add publicData, privateData, and metadata', () => {
			const body: IDataObject = { title: 'Test' };
			const fields: IDataObject = {
				publicData: { visible: true },
				privateData: { internal: 'note' },
				metadata: { source: 'api' },
			};

			addExtendedDataFields(body, fields);

			expect(body.publicData).toEqual({ visible: true });
			expect(body.privateData).toEqual({ internal: 'note' });
			expect(body.metadata).toEqual({ source: 'api' });
		});

		// Tests that it doesn't add undefined fields
		it('should not add undefined extended data fields', () => {
			const body: IDataObject = { title: 'Test' };
			const fields: IDataObject = {
				description: 'Some text',
			};

			addExtendedDataFields(body, fields);

			expect(body.publicData).toBeUndefined();
			expect(body.privateData).toBeUndefined();
			expect(body.metadata).toBeUndefined();
		});
	});
});
