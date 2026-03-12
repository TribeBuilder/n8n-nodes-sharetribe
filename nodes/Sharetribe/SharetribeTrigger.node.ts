import type {
	IDataObject,
	IPollFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	ILoadOptionsFunctions,
	INodePropertyOptions,
} from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';
import { DateTime } from 'luxon';
import { apiRequest } from './v1/transport';
import { flattenSharetribeResponse, PollingQueryBuilder } from './v1/helpers/Sharetribe';
import { extractMaxSequenceId, filterEventTypesByResources } from './v1/helpers/Sharetribe.utils';
import { triggerProperties } from './SharetribeTrigger.description';
import { SHARETRIBE_EVENT_TYPES } from './v1/helpers/Sharetribe.types';
import { credentialTest } from './v1/methods';

export class SharetribeTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Sharetribe Trigger',
		name: 'sharetribeTrigger',
		icon: {
			light: 'file:../../icons/sharetribe.svg',
			dark: 'file:../../icons/sharetribe.dark.svg',
		},
		group: ['trigger'],
		version: 1,
		description: 'Poll Sharetribe for marketplace events',
		defaults: { name: 'Sharetribe Trigger' },
		polling: true,
		inputs: [],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'sharetribeOAuth2Api',
				required: true,
				testedBy: 'sharetribeTriggerCredentialTest',
			},
		],
		properties: triggerProperties,
	};

	async poll(this: IPollFunctions): Promise<INodeExecutionData[][] | null> {
		const nodeStaticData = this.getWorkflowStaticData('node');

		const resources = this.getNodeParameter('resources', 0) as string[];
		const eventTypes = this.getNodeParameter('eventTypes', 0) as string[];
		const filters = this.getNodeParameter('filters', 0, {}) as IDataObject;
		const simplify = this.getNodeParameter('simplify', 0) as boolean;

		const filteredEventTypes = filterEventTypesByResources(resources, eventTypes);
		const byResourceId = filters.byResourceId as IDataObject | undefined;
		const resourceId = (byResourceId?.resourceId as string | undefined)?.trim() || '';
		const includeRelatedResources = !!byResourceId?.includeRelated;

		let eventAttributes = simplify
			? ['createdAt', 'eventType', 'resourceId', 'resourceType']
			: (this.getNodeParameter('eventAttributes', 0) as string[]);

		// Ensure sequenceId is always included for tracking
		if (!eventAttributes.includes('sequenceId')) {
			eventAttributes = [...eventAttributes, 'sequenceId'];
		}

		const lastSequenceId = nodeStaticData.lastSequenceId as number | undefined;
		const isManualMode = this.getMode() === 'manual';
		let currentSequenceId = lastSequenceId;

		const allEvents: IDataObject[] = [];
		let shouldContinue = true;

		while (shouldContinue) {
			const builder = new PollingQueryBuilder();

			if (!isManualMode && currentSequenceId) {
				builder.withStartAfterSequenceId(currentSequenceId);
				this.logger.debug(`Continuing from sequence ID: ${currentSequenceId}`);
			} else if (!isManualMode && !currentSequenceId) {
				builder.withStartTime(DateTime.utc());
				this.logger.debug('First poll - starting from current time');
			} else if (isManualMode && currentSequenceId) {
				builder.withStartAfterSequenceId(currentSequenceId);
			} else {
				this.logger.debug('Manual mode - fetching all available events');
			}

			const query = builder
				.withEventTypes(filteredEventTypes)
				.withEventAttributes(eventAttributes)
				.withResourceFilter(resourceId, includeRelatedResources)
				.build();

			this.logger.debug(`Polling Sharetribe with params: ${JSON.stringify(query)}`);
			const res = await apiRequest.call(this, 'GET', 'events/query', {}, query);

			const events = (Array.isArray(res?.data) ? res.data : []) as unknown as IDataObject[];
			this.logger.debug(`Received ${events.length} events`);

			if (events.length === 0) {
				shouldContinue = false;
				break;
			}

			allEvents.push(...events);

			if (events.length < 100) {
				shouldContinue = false;
				break;
			}

			const maxSequenceId = extractMaxSequenceId(events);
			if (!maxSequenceId) {
				shouldContinue = false;
				break;
			}

			currentSequenceId = maxSequenceId;
		}

		if (!allEvents.length) {
			this.logger.debug('No new events');
			return null;
		}

		const maxSequenceId = extractMaxSequenceId(allEvents);
		if (maxSequenceId) {
			if (!lastSequenceId || maxSequenceId > lastSequenceId) {
				nodeStaticData.lastSequenceId = maxSequenceId;
				this.logger.debug(`Stored max sequence ID: ${maxSequenceId}`);
			}
		}

		const processedEvents = simplify ? flattenSharetribeResponse(allEvents) : allEvents;
		const items = this.helpers.returnJsonArray(processedEvents);
		return [items];
	}

	methods = {
		credentialTest,
		loadOptions: {
			async getEventTypes(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const resources = this.getNodeParameter('resources', 0) as string[];

				if (!resources || resources.length === 0 || resources.includes('all')) {
					return SHARETRIBE_EVENT_TYPES.all;
				}

				const eventTypes: INodePropertyOptions[] = [];

				if (resources.length > 1) {
					const resourceNames = resources
						.map((r) => r.charAt(0).toUpperCase() + r.slice(1))
						.join(', ');
					eventTypes.push({
						name: `All Events`,
						value: '',
						description: `Trigger on all events for ${resourceNames} resources`,
					});
				}

				for (const resource of resources) {
					const resourceEvents = SHARETRIBE_EVENT_TYPES[resource];
					if (resourceEvents) {
						eventTypes.push(...resourceEvents);
					}
				}

				return eventTypes;
			},
		},
	};
}
