import type { IDataObject, IExecuteFunctions } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { validateValidUuid } from '../../../helpers/Sharetribe.utils';
import { UI_RESOURCES } from '../../../helpers/Sharetribe.types';

/**
 * Fluent builder for building availability exception delete request body
 */
export class AvailabilityExceptionDeleteBuilder {
	private context: IExecuteFunctions;
	private itemIndex: number;
	private exceptionId?: string;

	constructor(context: IExecuteFunctions, itemIndex: number) {
		this.context = context;
		this.itemIndex = itemIndex;
	}

	withExceptionId(exceptionId: string): this {
		validateValidUuid(
			this.context,
			this.itemIndex,
			exceptionId,
			UI_RESOURCES.AVAILABILITY_EXCEPTIONS,
		);
		this.exceptionId = exceptionId;
		return this;
	}

	build(): IDataObject {
		if (!this.exceptionId) {
			throw new NodeOperationError(
				this.context.getNode(),
				'Missing required parameter for availability exception delete',
				{
					itemIndex: this.itemIndex,
					description: 'exceptionId is required to delete an availability exception',
				},
			);
		}

		return {
			id: this.exceptionId,
		};
	}
}
