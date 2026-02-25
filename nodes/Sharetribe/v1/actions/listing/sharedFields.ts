import type { INodeProperties } from 'n8n-workflow';
import {
	metadataField,
	privateDataField,
	publicDataField,
	makeExtendedDataCollectionField,
} from '../../helpers/Sharetribe';

export const titleField: INodeProperties = {
	displayName: 'Title',
	name: 'title',
	type: 'string',
	default: '',
	description: 'Title of the listing',
};

export const availabilityPlanField: INodeProperties = {
	displayName: 'Availability Plan',
	name: 'availabilityPlan',
	type: 'json',
	default: '{}',
	hint: 'Must be specified in full, partial updates are not supported. Passing <code>null</code> will make the listing default to daily availability plan with 1 seat. To make the listing unavailable, pass availability plan with 0 seats.',
	description:
		'Availability plan for the listing. <a href="https://www.sharetribe.com/api-reference/integration.html#listing-availability-plan" target="_blank">Learn more</a>.',
};

export const descriptionField: INodeProperties = {
	displayName: 'Description',
	name: 'description',
	type: 'string',
	default: '',
	description: 'Description of the listing',
};

export const geolocationField: INodeProperties = {
	displayName: 'Origin',
	name: 'geolocation',
	type: 'string',
	default: '',
	placeholder: '40.7128,-74.0060',
	hint: '(lat,lng)',
	description: 'Origin in format: "latitude,longitude"',
};

export const imagesField: INodeProperties = {
	displayName: 'Images',
	name: 'images',
	type: 'json',
	default: '[]',
	description: "Array of image ID's",
	hint: '<b>Warning:</b> an empty array <code>[]</code> will remove all images.',
};

export const priceCollectionField: INodeProperties = {
	displayName: 'Price',
	name: 'price',
	type: 'fixedCollection',
	placeholder: 'Add Price',
	hint: 'Minor units, e.g. cents for USD',
	description: 'Amount and Minor units, e.g. cents for USD',
	default: {},
	options: [
		{
			displayName: 'Price Details',
			name: 'priceDetails',
			values: [
				{
					displayName: 'Amount',
					name: 'amount',
					type: 'number',
					default: 0,
					description: 'Price in minor units (e.g., cents for USD)',
				},
				{
					displayName: 'Currency Code',
					name: 'currency',
					type: 'resourceLocator',
					description: 'Currency code (e.g., USD, EUR, GBP)',
					required: true,
					default: { mode: 'list', value: '' },
					modes: [
						{
							displayName: 'From List',
							name: 'list',
							type: 'list',
							placeholder: 'Select currency...',
							typeOptions: {
								searchListMethod: 'getCurrencyCodes',
								searchable: true,
							},
						},
						{
							displayName: 'By Code',
							name: 'code',
							type: 'string',
							placeholder: 'e.g., USD',
							validation: [
								{
									type: 'regex',
									properties: {
										regex: '^[A-Z]{3}$',
										errorMessage: 'Currency code must be 3 uppercase letters (e.g., USD, EUR, GBP)',
									},
								},
							],
						},
					],
				},
			],
		},
	],
};

export const listingPublicDataCollectionField: INodeProperties = makeExtendedDataCollectionField({
	dataType: 'publicData',
	displayName: 'Public Data',
	fieldHint: 'location.address.city',
});

export const listingPrivateDataCollectionField: INodeProperties = makeExtendedDataCollectionField({
	dataType: 'privateData',
	displayName: 'Private Data',
	fieldHint: 'location.address.city',
});

export const listingMetadataCollectionField: INodeProperties = makeExtendedDataCollectionField({
	dataType: 'metadata',
	displayName: 'Metadata',
	fieldHint: 'location.address.city',
});

// Keep old field exports for backward compatibility with other operations
export { metadataField, privateDataField, publicDataField };
