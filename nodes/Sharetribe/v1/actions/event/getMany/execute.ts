import type { IDataObject, IExecuteFunctions, INodeExecutionData, JsonObject } from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';
import { DateTime } from 'luxon';
import {
	PollingQueryBuilder,
	flattenSharetribeResponse,
	apiRequest,
} from '../../../helpers/Sharetribe';
import { filterEventTypesByResources, extractMaxSequenceId } from '../../../helpers/Sharetribe.utils';

export async function execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
	const inputItems = this.getInputData();
	const returnData: INodeExecutionData[] = [];

	for (let i = 0; i < inputItems.length; i++) {
		try {
			const resources = this.getNodeParameter('resources', i) as string[];
			const eventTypes = this.getNodeParameter('eventTypes', i) as string[];
			const filters = this.getNodeParameter('filters', i, {}) as IDataObject;
			const options = this.getNodeParameter('options', i, {}) as IDataObject;
			const returnAll = this.getNodeParameter('returnAll', i, false) as boolean;
			const limit = this.getNodeParameter('limit', i, 50) as number;
			const simplify = this.getNodeParameter('simplify', i, true) as boolean;

			const filteredEventTypes = filterEventTypesByResources(resources, eventTypes);

			const byResourceId = filters.byResourceId as IDataObject | undefined;
			const resourceId = (byResourceId?.resourceId as string | undefined)?.trim() || '';
			const includeRelated = !!byResourceId?.includeRelated;

			const pastEvents = options.pastEvents as IDataObject | undefined;
			const startQueryMode = pastEvents?.startQueryMode as string | undefined;

			let eventAttributes = simplify
				? ['createdAt', 'eventType', 'resourceId', 'resourceType']
				: (this.getNodeParameter('eventAttributes', i, [
						'createdAt',
						'eventType',
						'resourceId',
						'resourceType',
					]) as string[]);

			if (!eventAttributes.includes('sequenceId')) {
				eventAttributes = [...eventAttributes, 'sequenceId'];
			}

			const allEvents: IDataObject[] = [];
			let lastSequenceId: number | undefined;

			do {
				const currentBuilder = new PollingQueryBuilder();

				if (startQueryMode === 'sequenceId' && !lastSequenceId) {
					const sequenceId = pastEvents?.startAfterSequenceId as number;
					if (sequenceId) {
						currentBuilder.withStartAfterSequenceId(sequenceId);
					}
				} else if (startQueryMode === 'specificTime' && !lastSequenceId) {
					const startTime = DateTime.fromISO(pastEvents?.startTime as string);
					if (startTime.isValid) {
						currentBuilder.withStartTime(startTime);
					}
				}

				if (lastSequenceId) {
					currentBuilder.withStartAfterSequenceId(lastSequenceId);
				}

				const query = currentBuilder
					.withEventTypes(filteredEventTypes)
					.withEventAttributes(eventAttributes)
					.withResourceFilter(resourceId, includeRelated)
					.build();

				const res = await apiRequest.call(this, 'GET', 'events/query', {}, query);
				const events = (Array.isArray(res?.data) ? res.data : []) as unknown as IDataObject[];

				if (events.length === 0) {
					break;
				}

				allEvents.push(...events);

				if (!returnAll && allEvents.length >= limit) {
					break;
				}

				if (events.length < 100) {
					break;
				}

				lastSequenceId = extractMaxSequenceId(events);
				if (!lastSequenceId) {
					break;
				}
			} while (returnAll || allEvents.length < limit);

			const eventsToReturn = returnAll ? allEvents : allEvents.slice(0, limit);
			const processedEvents = simplify ? flattenSharetribeResponse(eventsToReturn) : eventsToReturn;
			const data = this.helpers.returnJsonArray(processedEvents);
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
		message: `Retrieved ${returnData.length} event${returnData.length !== 1 ? 's' : ''}`,
		location: 'outputPane',
	});

	return [returnData];
}

export { execute as getMany };
