import type { IExecuteFunctions, IDataObject, INodeExecutionData } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import {
	FieldsetBuilder,
	Sharetribe,
	validateValidUuid,
	getResourceLocatorValue,
	parseFixedCollectionValues,
	API_RESOURCES,
	ENDPOINTS,
	UI_RESOURCES,
	OUTPUT_MODES,
} from '../../../helpers/Sharetribe';

export async function execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
	const items = this.getInputData();
	const returnData: INodeExecutionData[] = [];

	for (let i = 0; i < items.length; i++) {
		try {
			const transactionId = this.getNodeParameter('transactionId', i) as string;

			validateValidUuid(this, i, transactionId, UI_RESOURCES.TRANSACTION);

			const transitionRaw = this.getNodeParameter('transition', i);
			const transitionValue = getResourceLocatorValue(transitionRaw);
			const transition = Array.isArray(transitionValue) ? transitionValue[0] : transitionValue;

			if (!transition) {
				throw new NodeOperationError(this.getNode(), 'Transition name is required');
			}

			// Validate transition name format: should start with "transition/"
			if (!transition.startsWith('transition/')) {
				throw new NodeOperationError(this.getNode(), 'Invalid transition name format', {
					itemIndex: i,
					description: `Transition name must start with "transition/" (e.g., "transition/accept", "transition/decline").<br><br>Received: "${transition}"`,
				});
			}

			// Ensure there's something after "transition/"
			if (transition === 'transition/' || transition.length <= 11) {
				throw new NodeOperationError(this.getNode(), 'Invalid transition name', {
					itemIndex: i,
					description: `Transition name must have an action after "transition/".<br><br>Received: "${transition}"`,
				});
			}

			const speculative = this.getNodeParameter('speculative', i, false) as boolean;
			const simplify = this.getNodeParameter('simplify', i, true) as boolean;
			const transactionFields = simplify
				? []
				: (this.getNodeParameter('transactionFields', i, []) as string[]);
			const listingFields = simplify
				? []
				: (this.getNodeParameter('listingFields', i, []) as string[]);
			const userFields = simplify ? [] : (this.getNodeParameter('userFields', i, []) as string[]);
			const outputMode = simplify ? OUTPUT_MODES.SIMPLIFIED : OUTPUT_MODES.SELECTED_FIELDS;

			const endpoint = speculative
				? ENDPOINTS.TRANSACTIONS_SPECULATIVE_TRANSITION
				: ENDPOINTS.TRANSACTIONS_TRANSITION;

			const body: IDataObject = {
				id: transactionId,
				transition,
				params: {},
			};

			// Override params from fixedCollection (manual mapping or JSON mode)
			const paramsRaw = this.getNodeParameter('params', i, {}) as IDataObject;
			const paramsValues = paramsRaw?.paramsValues as IDataObject | undefined;
			if (paramsValues) {
				const result = parseFixedCollectionValues(paramsValues);
				if (result) {
					body.params = result;
				}
			}

			// Build query params for sparse fieldsets
			const { qs } = new FieldsetBuilder(
				this,
				API_RESOURCES.TRANSACTION,
				UI_RESOURCES.TRANSACTION,
				endpoint,
			)
				.withFields(transactionFields, outputMode)
				.withOptions({ outputFields: { transactionFields, listingFields, userFields } })
				.build();

			const sharetribe = new Sharetribe(this);
			const { data: result } = await sharetribe.request({
				method: 'POST',
				endpoint,
				body,
				qs,
			});

			result.forEach((item) => {
				item.pairedItem = { item: i };
			});
			returnData.push(...result);
		} catch (error) {
			if (this.continueOnFail()) {
				returnData.push({
					json: { error: error.message },
					pairedItem: { item: i },
				} as INodeExecutionData);
				continue;
			}
			throw error;
		}
	}

	// Build transition-specific summary with state info
	const isSpeculative = this.getNodeParameter('speculative', 0, false) as boolean;
	const parts: string[] = [];
	for (const item of returnData) {
		const json = item.json as IDataObject;
		if (json.error) continue;
		const lastTransition = (json.lastTransition as string) || '';
		const state = (json.state as string) || '';
		const transitionShort = lastTransition.replace('transition/', '');
		if (transitionShort && state) {
			parts.push(`${transitionShort} → ${state}`);
		}
	}
	const unique = [...new Set(parts)];
	let summary = `Transitioned ${returnData.length} transaction${returnData.length === 1 ? '' : 's'}`;
	if (unique.length > 0) {
		summary += ` (${unique.join(', ')})`;
	}
	if (isSpeculative) {
		summary +=
			' - SPECULATIVE: No actual changes were saved. This shows what the transition would look like.';
	}
	this.addExecutionHints({
		message: summary,
		location: 'outputPane',
	});

	return [returnData];
}

export { execute as transition };
