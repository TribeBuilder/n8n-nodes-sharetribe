import type { IDataObject } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { DateTime } from 'luxon';
import { BaseQueryBuilder } from '../../../helpers/builders/BaseQueryBuilder';
import {
	validateValidUuid,
	buildSparseFieldsList,
	SharetribeQueryBuilder,
} from '../../../helpers/Sharetribe.utils';
import { validateStockAdjustmentTimeRange } from './validation';
import {
	API_RESOURCES,
	OUTPUT_MODES,
	UI_RESOURCES,
	type ResultOptions,
} from '../../../helpers/Sharetribe.types';

/**
 * Fluent builder for building stock adjustment query parameters
 * Build method returns query params for execute file to use
 */
export class StockAdjustmentsQueryBuilder extends BaseQueryBuilder {
	withListingId(listingId: string): this {
		validateValidUuid(this.context, 0, listingId, UI_RESOURCES.LISTING);
		this.qs.listingId = listingId;
		return this;
	}

	withTimeRange(start: DateTime, end: DateTime): this {
		if (!start?.isValid || !end?.isValid) {
			throw new NodeOperationError(
				this.context.getNode(),
				'Time range is required for stock adjustments query',
			);
		}

		const createdAtStartUtc = start.setZone('utc', { keepLocalTime: true });
		const createdAtEndUtc = end.setZone('utc', { keepLocalTime: true });
		validateStockAdjustmentTimeRange(this.context, 0, createdAtStartUtc, createdAtEndUtc);

		this.qs.start = createdAtStartUtc.toISO();
		this.qs.end = createdAtEndUtc.toISO();

		return this;
	}

	withOptions(options: {
		nodeOptions: IDataObject;
		simplify: boolean;
		returnAll: boolean;
		limit: number;
	}): this {
		this.simplify = options.simplify;
		this.returnAll = options.returnAll;
		this.limit = options.limit;
		this.deferredOptions = options.nodeOptions;
		return this;
	}

	private applyStockOptions(): void {
		if (!this.deferredOptions) return;

		const options = this.deferredOptions;

		// Determine fields to return
		let fieldsToReturn: string[] = [];
		if (!this.simplify) {
			const outputFields = options.outputFields as IDataObject | undefined;
			fieldsToReturn = (outputFields?.stockFields as string[]) || [];
		}

		// Build sparse fields list
		const STOCK_ADJUSTMENT_ATTRIBUTE_KEYS = ['at', 'quantity'];
		const stockAttributeFields = fieldsToReturn.filter(
			(f) => !f.includes('.') && f !== 'listing' && f !== 'stockReservation' && f !== 'transaction',
		);
		this.qs['fields.stockAdjustment'] = buildSparseFieldsList(
			stockAttributeFields,
			STOCK_ADJUSTMENT_ATTRIBUTE_KEYS,
		);

		// Build field/relationship params
		const builder = new SharetribeQueryBuilder(
			this.context.getNode(),
			API_RESOURCES.STOCK_ADJUSTMENT,
			OUTPUT_MODES.SELECTED_FIELDS,
			fieldsToReturn,
		);
		const configParams = builder.withOptions(options).build();
		Object.assign(this.qs, configParams);
	}

	build(): { qs: IDataObject; resultOptions: ResultOptions } {
		this.applyStockOptions();
		const resultOptions = this.buildResultOptions();
		return { qs: this.qs, resultOptions };
	}
}
