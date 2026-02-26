import type { TransactionProperties } from '../../Interfaces';
import {
	UI_OPERATIONS,
	UI_RESOURCES,
	TRANSACTION_RELATIONSHIP_OPTIONS,
	RESOURCE_DEFAULTS,
	makeSimplifyField,
	makeResourceIdField,
	makeFieldsToReturnField,
	makeRelatedFieldsToReturn,
} from '../../../helpers/Sharetribe';

export const transactionGetDescription: TransactionProperties = [
	makeResourceIdField(UI_RESOURCES.TRANSACTION, UI_OPERATIONS.GET, {
		displayName: 'Transaction ID',
		name: 'transactionId',
		description: "Transaction's ID",
	}),
	makeSimplifyField(UI_RESOURCES.TRANSACTION, UI_OPERATIONS.GET),
	makeFieldsToReturnField(UI_RESOURCES.TRANSACTION, UI_OPERATIONS.GET, {
		name: 'transactionFields',
		defaults: [...RESOURCE_DEFAULTS.transaction],
		options: TRANSACTION_RELATIONSHIP_OPTIONS,
	}),
	makeRelatedFieldsToReturn(UI_RESOURCES.TRANSACTION, UI_OPERATIONS.GET, {
		displayName: 'Listing Fields to Return',
		name: 'listingFields',
		defaults: ['title', 'state'],
		loadOptionsMethod: 'getListingFieldOptions',
		conditionalOn: { field: 'transactionFields', values: ['listing'] },
	}),
	makeRelatedFieldsToReturn(UI_RESOURCES.TRANSACTION, UI_OPERATIONS.GET, {
		displayName: 'User Fields to Return',
		name: 'userFields',
		defaults: ['firstName', 'lastName', 'email'],
		loadOptionsMethod: 'getUserFieldOptions',
		conditionalOn: { field: 'transactionFields', values: ['customer', 'provider'] },
	}),
];
