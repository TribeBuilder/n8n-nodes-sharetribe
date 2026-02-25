import type { IDataObject } from 'n8n-workflow';
import { BaseQueryBuilder } from '../../../helpers/builders/BaseQueryBuilder';
import { buildTransactionFilters } from './filters';
import { API_RESOURCES, type ResultOptions } from '../../../helpers/Sharetribe.types';

/**
 * Fluent builder for building transaction query parameters
 * Build method returns query params for execute file to use
 */
export class TransactionQueryBuilder extends BaseQueryBuilder {
	withFilters(filterOptions: IDataObject): this {
		const filters = buildTransactionFilters(filterOptions);
		if (filters.length > 0) {
			this.addFiltersToQueryParams(filters, this.qs, this.context.getNode());
		}
		return this;
	}

	withSort(sortOptions: IDataObject): this {
		const sortArray = this.buildSortArray(sortOptions);
		if (sortArray) {
			this.qs.sort = sortArray;
		}
		return this;
	}

	withOptions(options: {
		nodeOptions: IDataObject;
		simplify: boolean;
		countOnly: boolean;
		returnAll: boolean;
		limit: number;
	}): this {
		this.simplify = options.simplify;
		this.countOnly = options.countOnly;
		this.returnAll = options.returnAll;
		this.limit = options.limit;
		this.deferredApiResource = API_RESOURCES.TRANSACTION;
		this.deferredFieldsKey = 'transactionFields';
		this.deferredOptions = options.nodeOptions;
		return this;
	}

	build(): { qs: IDataObject; resultOptions: ResultOptions } {
		this.applyDeferredOutputModeParams();
		const resultOptions = this.buildResultOptions();
		return { qs: this.qs, resultOptions };
	}
}
