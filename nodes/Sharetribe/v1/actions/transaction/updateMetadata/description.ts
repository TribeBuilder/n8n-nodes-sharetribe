import type { TransactionProperties } from '../../Interfaces';
import {
	UI_OPERATIONS,
	UI_RESOURCES,
	TRANSACTION_RELATIONSHIP_OPTIONS,
	RESOURCE_DEFAULTS,
	makeSimplifyField,
	makeResourceIdField,
	makeSpeculativeField,
	makeFieldsToReturnField,
	makeRelatedFieldsToReturn,
	makeFieldsToAddOrUpdate,
	makeDeleteFieldsCollection,
} from '../../../helpers/Sharetribe';
import {
	transactionMetadataCollectionField,
	transactionProtectedDataCollectionField,
} from '../sharedFields';

export const transactionUpdateMetadataDescription: TransactionProperties = [
	makeSimplifyField(UI_RESOURCES.TRANSACTION, UI_OPERATIONS.UPDATE_METADATA),
	makeResourceIdField(UI_RESOURCES.TRANSACTION, UI_OPERATIONS.UPDATE_METADATA, {
		displayName: 'Transaction ID',
		name: 'transactionId',
		description: 'ID of the transaction to update metadata for',
	}),
	makeSpeculativeField(
		UI_RESOURCES.TRANSACTION,
		UI_OPERATIONS.UPDATE_METADATA,
		'Whether to preview the changes without actually updating the transaction. Returns what the updated transaction would look like.',
	),
	makeFieldsToReturnField(UI_RESOURCES.TRANSACTION, UI_OPERATIONS.UPDATE_METADATA, {
		name: 'fieldsToReturn',
		defaults: [...RESOURCE_DEFAULTS.transaction],
		options: TRANSACTION_RELATIONSHIP_OPTIONS,
	}),
	makeRelatedFieldsToReturn(UI_RESOURCES.TRANSACTION, UI_OPERATIONS.UPDATE_METADATA, {
		displayName: 'Listing Fields to Return',
		name: 'listingFields',
		defaults: ['title', 'state'],
		loadOptionsMethod: 'getListingFieldOptions',
		conditionalOn: { field: 'fieldsToReturn', values: ['listing'] },
	}),
	makeRelatedFieldsToReturn(UI_RESOURCES.TRANSACTION, UI_OPERATIONS.UPDATE_METADATA, {
		displayName: 'User Fields to Return',
		name: 'userFields',
		defaults: ['firstName', 'lastName', 'email'],
		loadOptionsMethod: 'getUserFieldOptions',
		conditionalOn: { field: 'fieldsToReturn', values: ['customer', 'provider'] },
	}),
	makeFieldsToAddOrUpdate(UI_RESOURCES.TRANSACTION, UI_OPERATIONS.UPDATE_METADATA, {
		name: 'transactionFields',
		options: [transactionMetadataCollectionField, transactionProtectedDataCollectionField],
	}),
	makeDeleteFieldsCollection(UI_RESOURCES.TRANSACTION, UI_OPERATIONS.UPDATE_METADATA, {
		dataTypes: [
			{ name: 'Protected Data', value: 'protectedData' },
			{ name: 'Metadata', value: 'metadata' },
		],
		searchListMethod: 'getTransactionExtendedDataFields',
		placeholder: 'e.g. shipping.trackingNumber',
	}),
];
