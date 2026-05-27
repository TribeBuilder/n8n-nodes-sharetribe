import type { IExecuteFunctions, INodeExecutionData, IDataObject, JsonObject } from 'n8n-workflow';
import { NodeApiError, NodeOperationError } from 'n8n-workflow';
import { DateTime } from 'luxon';
import { fetchPublicAssets, fetchTimeslotsAnonymously } from '../../../helpers/Sharetribe';
import { TimeslotQueryBuilder } from './Builder';

export async function execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
	const items = this.getInputData();
	const returnData: INodeExecutionData[] = [];

	for (let i = 0; i < items.length; i++) {
		try {
			// Timeslots use an anonymous (public-read) token. Private marketplaces block anonymous access.
			// Best-effort check — if the asset request fails for non-authorization reasons, proceed anyway.
			try {
				const accessControl = await fetchPublicAssets.call(
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
					// eslint-disable-next-line @n8n/community-nodes/require-node-api-error
					throw error;
				}
				// If the asset check fails for other reasons, let the timeslot request proceed
			}

			const listingId = this.getNodeParameter('listingId', i) as string;
			const start = this.getNodeParameter('start', i) as DateTime;
			const end = this.getNodeParameter('end', i) as DateTime;
			const options = this.getNodeParameter('options', i, {}) as IDataObject;
			const returnAll = this.getNodeParameter('returnAll', i, false) as boolean;
			const limit = this.getNodeParameter('limit', i, 50) as number;

			const { qs, returnAll: shouldReturnAll, limit: queryLimit } = new TimeslotQueryBuilder(this)
				.withListingId(listingId)
				.withDateRange(start, end)
				.withOptions(options)
				.withPagination(returnAll, limit)
				.build();

			const allTimeslots: IDataObject[] = [];
			let currentPage = 1;
			let hasMore = true;

			while (hasMore) {
				qs.page = currentPage;
				qs.perPage = shouldReturnAll ? 500 : Math.min(queryLimit - allTimeslots.length, 500);

				const response = await fetchTimeslotsAnonymously.call(this, qs);

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
			const data = this.helpers.returnJsonArray(timeslotsToReturn);
			data.forEach((item) => {
				item.pairedItem = { item: i };
			});
			returnData.push(...data);
		} catch (error) {
			if (this.continueOnFail()) {
				returnData.push({ json: { error: error.message }, pairedItem: { item: i } });
				continue;
			}
			throw new NodeApiError(this.getNode(), error as JsonObject);
		}
	}

	this.addExecutionHints({
		message: `Retrieved ${returnData.length} timeslot${returnData.length !== 1 ? 's' : ''}`,
		location: 'outputPane',
	});

	return [returnData];
}

export { execute as getTimeslots };
