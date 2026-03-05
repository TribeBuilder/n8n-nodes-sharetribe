import type { IDataObject, IExecuteFunctions } from 'n8n-workflow';
import { validateValidUuid, SharetribeQueryBuilder } from '../Sharetribe.utils';
import type { ApiResource, UiResource, Endpoints } from '../Sharetribe.types';

/**
 * Fluent builder for constructing sparse fieldset query parameters.
 * Used by execute files to select which attributes and relationships
 * the API should return, regardless of HTTP method (GET or POST).
 */
export class FieldsetBuilder {
	private context: IExecuteFunctions;
	private resourceType: ApiResource;
	private uiResource: UiResource;
	private qs: IDataObject = {};
	private fieldsToReturn: string[] = [];
	private outputMode: string = 'simplified';
	private endpoint: Endpoints;

	constructor(
		context: IExecuteFunctions,
		resourceType: ApiResource,
		uiResource: UiResource,
		endpoint: Endpoints,
	) {
		this.context = context;
		this.resourceType = resourceType;
		this.uiResource = uiResource;
		this.endpoint = endpoint;
	}

	/**
	 * Validate and add resource ID to query params
	 */
	withResourceId(resourceId: string, itemIndex: number): this {
		validateValidUuid(this.context, itemIndex, resourceId, this.uiResource);
		this.qs.id = resourceId;
		return this;
	}

	/**
	 * Add email address to query params for email-based lookup
	 */
	withEmail(email: string): this {
		this.qs.email = email;
		return this;
	}

	/**
	 * Store fields for later building
	 */
	withFields(fieldsToReturn: string[], outputMode: string = 'selectedFields'): this {
		this.fieldsToReturn = fieldsToReturn;
		this.outputMode = outputMode;
		return this;
	}

	/**
	 * Build field/relationship params and add to query
	 */
	withOptions(options: IDataObject): this {
		const builder = new SharetribeQueryBuilder(
			this.context.getNode(),
			this.resourceType,
			this.outputMode,
			this.fieldsToReturn,
		);
		const configParams = builder.withOptions(options).build();
		Object.assign(this.qs, configParams);
		return this;
	}

	/**
	 * Build and return query params for execute file to use
	 */
	build(): { qs: IDataObject; endpoint: Endpoints } {
		return { qs: this.qs, endpoint: this.endpoint };
	}
}
