import type {
	IAuthenticateGeneric,
	ICredentialDataDecryptedObject,
	ICredentialType,
	IHttpRequestHelper,
	INodeProperties,
	Icon,
} from 'n8n-workflow';

export class SharetribeOAuth2Api implements ICredentialType {
	name = 'sharetribeOAuth2Api';
	// eslint-disable-next-line @n8n/community-nodes/cred-class-oauth2-naming
	displayName = 'Sharetribe Integration API';
	description = 'Sharetribe Integration API';
	documentationUrl =
		'https://www.sharetribe.com/docs/introduction/getting-started-with-integration-api/#create-integration-api-application-in-sharetribe-console';
	icon: Icon = { light: 'file:../icons/sharetribe.svg', dark: 'file:../icons/sharetribe.dark.svg' };
	properties: INodeProperties[] = [
		{
			displayName: 'Integration API Token',
			name: 'integrationApiToken',
			type: 'hidden',
			typeOptions: { expirable: true, password: true },
			default: '',
		},
		{
			displayName: 'Integration API Client ID',
			name: 'clientId',
			type: 'string',
			default: '',
			placeholder: 'e.g. 6a9309f4-7c0d-45be-b841-7f04844ca443',
			required: true,
			description: 'Your Sharetribe Integration API Client ID',
			hint: 'Create an Integration API Client from <a href="https://console.sharetribe.com/advanced/applications" target="_blank">Sharetribe Console → Build → Advanced → Applications</a>',
		},
		{
			displayName: 'Integration API Client Secret',
			name: 'clientSecret',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			placeholder: 'e.g. d4dd41b3bfafd9bbf7adc76b8a32b136c2c5d974',
			required: true,
			description: 'Your Sharetribe Integration API Client Secret',
		},
		{
			displayName: 'Sharetribe Plan',
			name: 'planType',
			type: 'options',
			options: [
				{
					name: 'Extend',
					value: 'extend',
					description: 'Also for "Trial" and "Build" plans',
				},
				{
					name: 'Pro',
					value: 'pro',
					description:
						'The "Pro" plan uses the same <i>Integration API</i> as "Extend". The method to obtain the "Marketplace API Client ID" is the only difference.',
				},
			],
			default: 'extend',
			description:
				"The 'Extend' and 'Pro' plans use the same Integration API, only the way to obtain the 'Marketplace API Client ID' differs.",
		},
		{
			displayName: 'Marketplace API Client ID',
			name: 'marketplaceApiClientId',
			type: 'string',
			default: '',
			placeholder: 'e.g. 9e4f0bee-6174-4bfe-998a-6d433e7dbcc4',
			displayOptions: { show: { planType: ['extend'] } },
			description:
				'Your Sharetribe Marketplace API Client ID. This allows for anonymous access to the Marketplace API, enabling automatic discovery of Console defined Listing and Category definitions.',
			hint: 'Create a Marketplace API Client in <a href="https://console.sharetribe.com/advanced/applications" target="_blank">Sharetribe Console</a>.',
		},
		{
			displayName: 'Marketplace URL',
			name: 'marketplaceUrl',
			type: 'string',
			validateType: 'url',
			default: '',
			placeholder: 'e.g. https://marketplace-3fcl54.mysharetribe.com',
			displayOptions: { show: { planType: ['pro'] } },
			description:
				"Your Sharetribe Marketplace URL. The 'Marketplace API Client ID' will be retrieved from this URL.",
			hint: "The 'Marketplace API Client ID' will be retrieved from the URL",
		},
		{
			displayName: 'Base URL',
			name: 'baseUrl',
			type: 'hidden',
			default: 'https://flex-integ-api.sharetribe.com',
		},
		{
			displayName: 'Marketplace API Base URL',
			name: 'marketplaceApiBaseUrl',
			type: 'hidden',
			default: 'https://flex-api.sharetribe.com',
		},
		{
			displayName: 'Access Token URL',
			name: 'accessTokenUrl',
			type: 'hidden',
			default: 'https://flex-integ-api.sharetribe.com/v1/auth/token',
			required: true,
		},
		{
			displayName: 'Scope',
			name: 'scope',
			type: 'hidden',
			default: 'integ',
			required: true,
		},
		{
			displayName: 'Asset Delivery API Base URL',
			name: 'assetApiBaseUrl',
			type: 'hidden',
			default: 'https://cdn.st-api.com/v1/assets/pub',
			required: true,
		},
		{
			displayName: 'Environment',
			name: 'environment',
			type: 'hidden',
			default: '',
		},
		{
			displayName: 'Allowed HTTP Request Domains',
			name: 'allowedHttpRequestDomains',
			type: 'hidden',
			default: '',
		},
	];

	async preAuthentication(this: IHttpRequestHelper, credentials: ICredentialDataDecryptedObject) {
		const accessTokenUrl = credentials.accessTokenUrl as string;
		const { access_token } = (await this.helpers.httpRequest({
			method: 'POST',
			url: accessTokenUrl,
			body: {
				client_id: credentials.clientId,
				client_secret: credentials.clientSecret,
				grant_type: 'client_credentials',
				scope: credentials.scope || 'integ',
			},
			headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
		})) as { access_token: string };
		return { integrationApiToken: access_token };
	}

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Bearer {{$credentials.integrationApiToken}}',
			},
		},
	};
}
