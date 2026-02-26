import type { IDataObject } from 'n8n-workflow';
import { DateTime } from 'luxon';

/**
 * Fluent builder for building polling query parameters
 */
export class PollingQueryBuilder {
	private query: IDataObject = {};

	constructor() {}

	withStartTime(startTime: DateTime | undefined): this {
		if (startTime) {
			const utcDateTime = startTime.setZone('utc', { keepLocalTime: true });
			this.query.createdAtStart = utcDateTime.toISO();
		}
		return this;
	}

	withStartAfterSequenceId(sequenceId: number): this {
		this.query.startAfterSequenceId = sequenceId;
		return this;
	}

	withEventTypes(eventTypes: string[]): this {
		if (eventTypes.length > 0) {
			this.query.eventTypes = eventTypes.join(',');
		}
		return this;
	}

	withEventAttributes(eventAttributes: string[]): this {
		if (eventAttributes.length > 0) {
			this.query['fields.event'] = eventAttributes.join(',');
		}
		return this;
	}

	withResourceFilter(resourceId: string, includeRelated: boolean): this {
		if (resourceId) {
			if (includeRelated) {
				this.query.relatedResourceId = resourceId;
			} else {
				this.query.resourceId = resourceId;
			}
		}
		return this;
	}

	build(): IDataObject {
		return this.query;
	}
}
