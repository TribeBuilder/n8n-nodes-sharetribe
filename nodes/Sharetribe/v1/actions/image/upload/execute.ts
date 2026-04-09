import type {
	IExecuteFunctions,
	IDataObject,
	INodeExecutionData,
	IHttpRequestOptions,
	IBinaryData,
	JsonObject,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { handleSharetribeError } from '../../../transport';
import { generateExecutionSummary, fetchExternalImageFromUrl } from '../../../helpers/Sharetribe';

const DEFAULT_FILENAME = 'image';

export async function execute(
	this: IExecuteFunctions,
): Promise<INodeExecutionData[][]> {
	const items = this.getInputData();
	const returnData: INodeExecutionData[] = [];

	for (let i = 0; i < items.length; i++) {
		try {
			const source = this.getNodeParameter('imageSource', i) as IDataObject;
			const mode = source?.mode;
			const enteredUrl = source?.value?.toString() ?? '';
			const binaryPropertyName = source?.value?.toString() ?? '';
			const url = URL.parse(enteredUrl);
			const qs: IDataObject = {};

			let binaryMetadata: IBinaryData;
			let binaryBuffer: Buffer;
			let fileName = DEFAULT_FILENAME;
			let contentType = 'application/octet-stream';

			if (mode === 'imageUrl') {
				if (!url) {
					throw new NodeOperationError(this.getNode(), {
						message: 'Invalid URL',
					});
				}
				this.logger.debug(`Fetching image from URL: ${url}`);

				const fetched = await fetchExternalImageFromUrl(this, url);
				binaryBuffer = fetched.buffer;
				fileName = fetched.fileName;
				contentType = fetched.contentType;
			} else if (mode === 'file') {
				binaryMetadata = this.helpers.assertBinaryData(i, binaryPropertyName);

				binaryBuffer = await this.helpers.getBinaryDataBuffer(i, binaryPropertyName);

				contentType = binaryMetadata.mimeType || contentType;
				fileName = binaryMetadata.fileName || DEFAULT_FILENAME;
			} else {
				throw new NodeOperationError(this.getNode(), `Invalid 'source'.`);
			}

			const boundary = `----n8nFormBoundary${Date.now()}`;
			const preamble =
				`--${boundary}\r\n` +
				`Content-Disposition: form-data; name="image"; filename="${fileName}"\r\n` +
				`Content-Type: ${contentType}\r\n\r\n`;
			const closing = `\r\n--${boundary}--\r\n`;

			const bodyBuffer = Buffer.concat([
				Buffer.from(preamble, 'utf8'),
				binaryBuffer,
				Buffer.from(closing, 'utf8'),
			]);

			this.logger.debug(`Uploading image with content type: ${contentType} and filename: ${fileName}`);

			const credentials = await this.getCredentials('sharetribeOAuth2Api');
			const baseUrl = credentials.baseUrl as string;

			const options: IHttpRequestOptions = {
				method: 'POST',
				url: `${baseUrl}/v1/integration_api/images/upload`,
				qs,
				headers: {
					'Content-Type': `multipart/form-data; boundary=${boundary}`,
					'Content-Length': bodyBuffer.length,
				},
				body: bodyBuffer,
			};

			const response = await this.helpers.httpRequestWithAuthentication.call(
				this,
				'sharetribeOAuth2Api',
				options,
			);

			const result = this.helpers.returnJsonArray(response?.data);

			result.forEach((item) => {
				item.pairedItem = { item: i };
			});
			returnData.push(...result);
		} catch (error) {
			if (this.continueOnFail() || error.httpCode === '404') {
				returnData.push({
					json: { error: error.message },
					pairedItem: { item: i },
				} as INodeExecutionData);
				continue;
			}

			// Enrich and re-throw Sharetribe-specific errors
			if (error && typeof error === 'object') {
				handleSharetribeError.call(this, error as JsonObject, 'images/upload');
			}
			throw error;
		}
	}

	const summary = generateExecutionSummary(this, returnData.length, undefined);
	this.addExecutionHints({
		message: summary,
		location: 'outputPane',
	});

	return [returnData];
}

export { execute as upload };
