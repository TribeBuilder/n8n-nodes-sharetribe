import type { IExecuteFunctions, INodeExecutionData, IDataObject } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { assetRequest } from '../../../transport';
import { flattenSharetribeResponse, resolveAssetReferences, hintMultipleInputItems } from '../../../helpers/Sharetribe.utils';

/**
 * Get assets from the Asset Delivery API
 *
 * Assets are JSON data files stored in a CDN for marketplace configuration.
 * They support versioned access or alias-based access (e.g., 'latest').
 */
export async function execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
	const items = this.getInputData();
	const assetCategory = this.getNodeParameter('assetCategory', 0) as string;

	if (!assetCategory) {
		throw new NodeOperationError(this.getNode(), 'Asset category must be selected');
	}

	// Construct full asset path
	let assetPath: string;
	if (assetCategory === 'content-pages') {
		const assetPage = this.getNodeParameter('assetPage', 0) as string;
		if (!assetPage) {
			throw new NodeOperationError(this.getNode(), 'Page name must be selected for Content Pages');
		}
		const pageName = assetPage.replace(/\.json$/, '');
		assetPath = `/content/pages/${pageName}.json`;
	} else {
		assetPath = assetCategory;
	}

	const accessType = this.getNodeParameter('accessType', 0) as 'alias' | 'version';

	let versionOrAlias: string;
	if (accessType === 'alias') {
		versionOrAlias = 'latest';
	} else {
		versionOrAlias = this.getNodeParameter('versionOrAlias', 0) as string;
		if (!versionOrAlias || versionOrAlias.trim() === '') {
			throw new NodeOperationError(this.getNode(), 'Version ID is required when "By Version" option is selected');
		}
	}

	const enableTranslationsFilter = this.getNodeParameter('enableTranslationsFilter', 0, false) as boolean;
	const enableEmailTextsFilter = this.getNodeParameter('enableEmailTextsFilter', 0, false) as boolean;

	let filterKeys: string[] = [];

	if (assetPath === '/content/translations.json' && enableTranslationsFilter) {
		const translationsFilterKeysRaw = this.getNodeParameter('translationsFilterKeys', 0, []);
		const translationsFilterKeys = Array.isArray(translationsFilterKeysRaw)
			? translationsFilterKeysRaw
			: [translationsFilterKeysRaw].filter(Boolean);

		const translationsCustomFilter = (this.getNodeParameter('translationsCustomFilter', 0, '') as string).trim();
		const translationsCustomKeys = translationsCustomFilter
			? translationsCustomFilter.split(',').map((k) => k.trim()).filter(Boolean)
			: [];

		filterKeys = [...translationsFilterKeys, ...translationsCustomKeys];
	} else if (assetPath === '/content/email-texts.json' && enableEmailTextsFilter) {
		const emailTextsFilterKeysRaw = this.getNodeParameter('emailTextsFilterKeys', 0, []);
		const emailTextsFilterKeys = Array.isArray(emailTextsFilterKeysRaw)
			? emailTextsFilterKeysRaw
			: [emailTextsFilterKeysRaw].filter(Boolean);

		const emailTextsCustomFilter = (this.getNodeParameter('emailTextsCustomFilter', 0, '') as string).trim();
		const emailTextsCustomKeys = emailTextsCustomFilter
			? emailTextsCustomFilter.split(',').map((k) => k.trim()).filter(Boolean)
			: [];

		filterKeys = [...emailTextsFilterKeys, ...emailTextsCustomKeys];
	}

	const response = await assetRequest.call(
		this,
		accessType,
		[assetPath],
		versionOrAlias,
	);

	const included = (response.included as IDataObject[]) || [];
	const normalizedAssets = flattenSharetribeResponse(response as unknown as IDataObject);
	const resolvedAssets = normalizedAssets.map((asset) =>
		resolveAssetReferences(asset, included),
	) as IDataObject[];

	const data = resolvedAssets.map((asset) => ({
		json: asset,
		pairedItem: { item: 0 },
	})) as INodeExecutionData[];

	const meta = response.meta || {};

	let filterInfo = '';
	if (filterKeys.length > 0 && data.length > 0) {
		const assetData = data[0].json.data as Record<string, unknown>;
		if (assetData && typeof assetData === 'object' && !Array.isArray(assetData)) {
			const originalCount = Object.keys(assetData).length;
			const filtered: Record<string, unknown> = {};

			const matchingKeys: string[] = [];
			for (const dataKey of Object.keys(assetData)) {
				if (filterKeys.some((filterKey) => dataKey.toLowerCase().includes(filterKey.toLowerCase()))) {
					matchingKeys.push(dataKey);
				}
			}

			matchingKeys.sort().forEach((key) => {
				filtered[key] = assetData[key];
			});

			const filteredCount = Object.keys(filtered).length;
			data[0].json.data = filtered;

			filterInfo = ` (filtered: ${filteredCount}/${originalCount} keys)`;
		}
	}

	this.addExecutionHints({
		message: `Retrieved ${assetPath}${filterInfo} - version: ${meta.version}`,
		location: 'outputPane',
	});

	hintMultipleInputItems(this, items.length);

	return [data];
}

export { execute as get };
