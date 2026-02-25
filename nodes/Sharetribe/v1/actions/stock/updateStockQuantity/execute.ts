import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { execute as adjust } from '../adjustQuantity/execute';
import { execute as compareAndSet } from '../compareAndSet/execute';

const STOCK_MODE = {
	ADJUST_QUANTITY: 'adjustQuantity',
	COMPARE_AND_SET: 'compareAndSet',
} as const;

/**
 * Wrapper that routes to the appropriate stock update operation based on mode parameter
 */
export async function execute(
	this: IExecuteFunctions,
): Promise<INodeExecutionData[][]> {
	const mode = this.getNodeParameter('mode', 0) as string;

	if (mode === STOCK_MODE.ADJUST_QUANTITY) {
		return adjust.call(this);
	} else if (mode === STOCK_MODE.COMPARE_AND_SET) {
		return compareAndSet.call(this);
	}

	throw new NodeOperationError(this.getNode(), `Unknown stock update mode: ${mode}`);
}

export { execute as updateStockQuantity };
