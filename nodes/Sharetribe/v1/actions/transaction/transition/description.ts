import type { TransactionProperties } from '../../Interfaces';
import {
	UI_OPERATIONS,
	UI_RESOURCES,
	TRANSACTION_RELATIONSHIP_OPTIONS,
	RESOURCE_DEFAULTS,
	makeExtendedDataCollectionField,
	makeSimplifyField,
	makeResourceIdField,
	makeSpeculativeField,
	makeFieldsToReturnField,
	makeRelatedFieldsToReturn,
} from '../../../helpers/Sharetribe';

export const transactionTransitionDescription: TransactionProperties = [
	makeSimplifyField(UI_RESOURCES.TRANSACTION, UI_OPERATIONS.TRANSITION),
	makeFieldsToReturnField(UI_RESOURCES.TRANSACTION, UI_OPERATIONS.TRANSITION, {
		name: 'transactionFields',
		defaults: [...RESOURCE_DEFAULTS.transaction],
		options: TRANSACTION_RELATIONSHIP_OPTIONS,
	}),
	makeRelatedFieldsToReturn(UI_RESOURCES.TRANSACTION, UI_OPERATIONS.TRANSITION, {
		displayName: 'Listing Fields to Return',
		name: 'listingFields',
		defaults: ['title', 'state'],
		loadOptionsMethod: 'getListingFieldOptions',
		conditionalOn: { field: 'transactionFields', values: ['listing'] },
	}),
	makeRelatedFieldsToReturn(UI_RESOURCES.TRANSACTION, UI_OPERATIONS.TRANSITION, {
		displayName: 'User Fields to Return',
		name: 'userFields',
		defaults: ['firstName', 'lastName', 'email'],
		loadOptionsMethod: 'getUserFieldOptions',
		conditionalOn: { field: 'transactionFields', values: ['customer', 'provider'] },
	}),
	makeResourceIdField(UI_RESOURCES.TRANSACTION, UI_OPERATIONS.TRANSITION, {
		displayName: 'Transaction ID',
		name: 'transactionId',
		description: 'ID of the transaction to transition',
	}),
	makeSpeculativeField(
		UI_RESOURCES.TRANSACTION,
		UI_OPERATIONS.TRANSITION,
		'Whether to perform a speculative (dry-run) transition. Returns what the result would look like without actually transitioning the transaction. Can be used to validate the parameters or to get updated transaction price breakdown (via <code>lineItems</code>), as if a real transition were performed.',
	),
	{
		displayName: 'Transition',
		name: 'transition',
		type: 'resourceLocator',
		required: true,
		displayOptions: {
			show: {
				resource: [UI_RESOURCES.TRANSACTION],
				operation: [UI_OPERATIONS.TRANSITION],
			},
		},
		default: { mode: 'list', value: '' },
		description:
			'The transition to perform on the transaction. Possible transitions are dependent on transaction state and marketplace transaction process definitions for "Operator" actions. <a href="https://www.sharetribe.com/docs/concepts/transactions/transaction-process/#transitions" target="_blank">Learn more</a>',
		modes: [
			{
				displayName: 'From List',
				name: 'list',
				type: 'list',
				placeholder: 'Select transition',
				typeOptions: {
					searchListMethod: 'getTransitions',
					searchable: true,
				},
			},
			{
				displayName: 'By Name',
				name: 'name',
				type: 'string',
				placeholder: 'transition/accept',
				hint: 'Depends on your process config (e.g., transition/operator-accept)',
			},
		],
	},
	{
		...makeExtendedDataCollectionField({
			dataType: 'params',
			displayName: 'Parameters',
			fieldHint: 'shipping.trackingNumber',
		}),
		displayName: 'Transition Parameters',
		default: [{ paramsValues: { mode: 'manual', fields: {} } }],
		displayOptions: {
			show: {
				resource: [UI_RESOURCES.TRANSACTION],
				operation: [UI_OPERATIONS.TRANSITION],
			},
		},
		description:
			'Optional parameters required to transition the transaction. <a href="https://www.sharetribe.com/docs/references/transaction-process-actions/" target="_blank">Learn more</a>',
	},
];
