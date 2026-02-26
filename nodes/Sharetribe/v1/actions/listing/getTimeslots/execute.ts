import type { IExecuteFunctions, INodeExecutionData, IDataObject } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { DateTime } from 'luxon';
import { timeslotRequest, assetRequest } from '../../../transport';
import { hintMultipleInputItems } from '../../../helpers/Sharetribe.utils';
import { TimeslotQueryBuilder } from './Builder';

export async function execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
	const items = this.getInputData();

	// Timeslots use an anonymous (public-read) token. Private marketplaces block anonymous access.
	try {
		const accessControl = await assetRequest.call(
			this,
			'alias',
			['/general/access-control.json'],
			'latest',
		);
		const assets = Array.isArray(accessControl.data)
			? accessControl.data
			: [accessControl.data];
		const isPrivate = assets.some(
			(asset) =>
				((asset.data as IDataObject)?.marketplace as IDataObject)?.private === true,
		);
		if (isPrivate) {
			throw new NodeOperationError(
				this.getNode(),
				'Timeslots are not available on private marketplaces. ' +
					'The timeslots API requires anonymous (public-read) authentication which is blocked when marketplace access control is set to private.',
			);
		}
	} catch (error) {
		if (error instanceof NodeOperationError) {
			throw error;
		}
		// If the asset check fails for other reasons, let the timeslot request proceed
	}

	const listingId = this.getNodeParameter('listingId', 0) as string;
	const start = this.getNodeParameter('start', 0) as DateTime;
	const end = this.getNodeParameter('end', 0) as DateTime;
	const options = this.getNodeParameter('options', 0, {}) as IDataObject;
	const returnAll = this.getNodeParameter('returnAll', 0, false) as boolean;
	const limit = this.getNodeParameter('limit', 0, 50) as number;

	// Build query params using fluent builder
	const { qs, returnAll: shouldReturnAll, limit: queryLimit } = new TimeslotQueryBuilder(this)
		.withListingId(listingId)
		.withDateRange(start, end)
		.withOptions(options)
		.withPagination(returnAll, limit)
		.build();

	// Paginate through results
	const allTimeslots: IDataObject[] = [];
	let currentPage = 1;
	let hasMore = true;

	while (hasMore) {
		qs.page = currentPage;
		qs.perPage = shouldReturnAll ? 500 : Math.min(queryLimit - allTimeslots.length, 500);

		const response = await timeslotRequest.call(this, qs);

		const timeslots = response.data || [];
		allTimeslots.push(...timeslots);

		if (!shouldReturnAll && allTimeslots.length >= queryLimit) {
			hasMore = false;
			break;
		}

		if (timeslots.length < (qs.perPage as number)) {
			hasMore = false;
			break;
		}

		if (response.meta.page >= response.meta.totalPages) {
			hasMore = false;
			break;
		}

		currentPage++;
	}

	const timeslotsToReturn = shouldReturnAll ? allTimeslots : allTimeslots.slice(0, queryLimit);

	const returnData = this.helpers.returnJsonArray(timeslotsToReturn);

	this.addExecutionHints({
		message: `Retrieved ${returnData.length} timeslot${returnData.length !== 1 ? 's' : ''}`,
		location: 'outputPane',
	});

	hintMultipleInputItems(this, items.length);

	return [returnData];
}

export { execute as getTimeslots };
