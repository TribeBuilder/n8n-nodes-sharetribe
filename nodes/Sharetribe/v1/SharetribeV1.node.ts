import {
	NodeConnectionTypes,
	type IExecuteFunctions,
	type INodeType,
	type INodeTypeBaseDescription,
	type INodeTypeDescription,
} from 'n8n-workflow';

import { router } from './actions/router';
import { VersionDescription } from './versionDescription';
import { credentialTest, listSearch, loadOptions } from './methods';

// eslint-disable-next-line @n8n/community-nodes/icon-validation
export class SharetribeV1 implements INodeType {
	description: INodeTypeDescription;

	constructor(baseDescription: INodeTypeBaseDescription) {
		this.description = {
			...baseDescription,
			...VersionDescription,
			usableAsTool: true,
			outputs: [NodeConnectionTypes.Main],
			inputs: [NodeConnectionTypes.Main],
		};
	}

	methods = { listSearch, loadOptions, credentialTest };

	// eslint-disable-next-line @n8n/community-nodes/require-continue-on-fail -- per-item handling lives in each action's execute.ts.
	async execute(this: IExecuteFunctions) {
		return await router.call(this);
	}
}
