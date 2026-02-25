import type { INodeProperties } from 'n8n-workflow';
import {
	metadataField,
	protectedDataField,
	makeExtendedDataCollectionField,
} from '../../helpers/Sharetribe';

export const transactionProtectedDataCollectionField: INodeProperties =
	makeExtendedDataCollectionField({
		dataType: 'protectedData',
		displayName: 'Protected Data',
		fieldHint: 'shipping.trackingNumber',
	});

export const transactionMetadataCollectionField: INodeProperties =
	makeExtendedDataCollectionField({
		dataType: 'metadata',
		displayName: 'Metadata',
		fieldHint: 'shipping.trackingNumber',
	});

// Keep old field exports for backward compatibility with other operations
export {
	metadataField as transactionMetadataField,
	protectedDataField as transactionProtectedDataField,
};
