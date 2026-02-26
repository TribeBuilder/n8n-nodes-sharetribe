/**
 * Router - Main execution dispatcher for Sharetribe node operations
 *
 * ## n8n Execution Pipeline
 *
 * This router is called by SharetribeV1.execute() and serves as the central dispatcher
 * for all Sharetribe operations. It's part of n8n's execution flow:
 *
 * 1. **Workflow triggers** - User executes workflow in n8n
 * 2. **Node receives input** - Input items flow into this node
 * 3. **Router processes each item** - This function routes to resource-specific handlers
 * 4. **Execute functions run** - Resource/operation execute files handle API calls
 * 5. **Results normalized** - Sharetribe API responses converted to n8n format
 * 6. **Output returned** - Processed data flows to next node in workflow
 *
 * ## Architecture
 *
 * The router follows n8n's resource/operation pattern:
 * - **Resources**: user, listing, transaction, marketplace, image, stock, availabilityExceptions, asset, event
 * - **Operations**: get, getMany, create, update, delete, etc.
 *
 * Each resource module exports operation objects with execute functions:
 * ```typescript
 * // Example structure
 * resource.operation.execute.call(this, itemIndex) -> IDataObject[]
 * ```
 *
 * ## Error Handling
 *
 * - **continueOnFail=true**: Errors captured, original input passed through with error metadata
 * - **continueOnFail=false**: Errors enriched with context (resource, operation, itemIndex) and thrown
 *
 * @param this - n8n execution context with helpers and parameter accessors
 * @returns Array of execution results (n8n always expects array of arrays for multi-output nodes)
 */

import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import type { Sharetribe } from './Interfaces';
import * as user from './user';
import * as listing from './listing';
import * as transaction from './transaction';
import * as marketplace from './marketplace';
import * as image from './image';
import * as availabilityExceptions from './availabilityExceptions';
import * as stock from './stock';
import * as asset from './asset';
import * as event from './event';

/**
 * Interface for operation execute function signature
 */
interface OperationExecute {
	execute: (this: IExecuteFunctions) => Promise<INodeExecutionData[][]>;
}

/**
 * Interface for resource modules that export operations
 * Modules may also export 'descriptions' property, so we use unknown for the index signature
 */
interface ResourceModule {
	[operation: string]: OperationExecute | unknown;
}

/**
 * Routes execution to appropriate resource handler based on user-selected resource and operation
 */
async function executeOperation(
	context: IExecuteFunctions,
	resource: Sharetribe['resource'],
	operation: string,
): Promise<INodeExecutionData[][]> {
	switch (resource) {
		case 'user':
			return await ((user as ResourceModule)[operation] as OperationExecute).execute.call(context);
		case 'listing':
			return await ((listing as ResourceModule)[operation] as OperationExecute).execute.call(
				context,
			);
		case 'transaction':
			return await ((transaction as ResourceModule)[operation] as OperationExecute).execute.call(
				context,
			);
		case 'marketplace':
			return await ((marketplace as ResourceModule)[operation] as OperationExecute).execute.call(
				context,
			);
		case 'image':
			return await ((image as ResourceModule)[operation] as OperationExecute).execute.call(context);
		case 'availabilityExceptions':
			// Special case: 'delete' is a reserved keyword, exported as 'deleteException'
			if (operation === 'delete') {
				return await availabilityExceptions.deleteException.execute.call(context);
			}
			return await (
				(availabilityExceptions as ResourceModule)[operation] as OperationExecute
			).execute.call(context);
		case 'stock':
			return await ((stock as ResourceModule)[operation] as OperationExecute).execute.call(context);
		case 'asset':
			return await ((asset as ResourceModule)[operation] as OperationExecute).execute.call(context);
		case 'event':
			return await ((event as ResourceModule)[operation] as OperationExecute).execute.call(context);
		default:
			throw new NodeOperationError(context.getNode(), `Unknown resource: ${resource}`);
	}
}

/**
 * Main router function - dispatches to resource/operation handlers
 *
 * All execute functions handle their own item looping internally:
 * - Item operations (get, create, update, delete): Loop through items, process each
 * - Collection operations (getMany, query): Run once, return results
 */
export async function router(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
	const resource = this.getNodeParameter('resource', 0) as Sharetribe['resource'];
	const operation = this.getNodeParameter('operation', 0) as string;

	return await executeOperation(this, resource, operation);
}
