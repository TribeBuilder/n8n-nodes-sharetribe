import { INodeTypeBaseDescription, IVersionedNodeType, VersionedNodeType } from 'n8n-workflow';

import { SharetribeV1 } from './v1/SharetribeV1.node';

export class Sharetribe extends VersionedNodeType {
	constructor() {
		const baseDescription: INodeTypeBaseDescription = {
			displayName: 'Sharetribe',
			name: 'sharetribe',
			icon: { light: 'file:../../icons/sharetribe.svg', dark: 'file:../icons/sharetribe.dark.svg' },
			group: ['output'],
			subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
			description: 'Work with Sharetribe resources',
			defaultVersion: 1,
		};

		const nodeVersions: IVersionedNodeType['nodeVersions'] = {
			1: new SharetribeV1(baseDescription),
		};

		super(nodeVersions, baseDescription);
	}
}
