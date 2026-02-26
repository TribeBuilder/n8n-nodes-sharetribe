import * as executeModule from '../../../../../v1/actions/image/upload/execute';
import { createMockExecuteFunction, mockSharetribeCredentials } from '../../../../helpers';

const mockCredentials = { ...mockSharetribeCredentials, baseUrl: 'https://sharetribe.com' };

const mockImageResponse = {
	data: { id: 'img-123', type: 'image', attributes: { variants: {} } },
};

describe('image/upload', () => {
	afterEach(() => {
		jest.restoreAllMocks();
	});

	describe('imageUrl mode', () => {
		it('should fetch image from URL and upload via multipart form', async () => {
			const mockExecuteFunction = createMockExecuteFunction(
				{ imageSource: { mode: 'imageUrl', value: 'https://example.com/photo.jpg' } },
				mockCredentials,
			);

			(mockExecuteFunction.helpers.httpRequest as jest.Mock).mockResolvedValue({
				body: Buffer.from('fake-image-data'),
				headers: { 'content-type': 'image/jpeg' },
			});

			(mockExecuteFunction.helpers.httpRequestWithAuthentication as jest.Mock).mockResolvedValue(
				mockImageResponse,
			);

			const result = await executeModule.execute.call(mockExecuteFunction);

			expect(mockExecuteFunction.helpers.httpRequest).toHaveBeenCalledWith(
				expect.objectContaining({
					method: 'GET',
					url: 'https://example.com/photo.jpg',
					encoding: 'arraybuffer',
					returnFullResponse: true,
				}),
			);

			expect(mockExecuteFunction.helpers.httpRequestWithAuthentication).toHaveBeenCalledWith(
				'sharetribeOAuth2Api',
				expect.objectContaining({
					method: 'POST',
					url: 'https://sharetribe.com/v1/integration_api/images/upload',
					headers: expect.objectContaining({
						'Content-Type': expect.stringContaining('multipart/form-data; boundary='),
					}),
				}),
			);

			expect(result[0]).toHaveLength(1);
		});

		it('should extract filename from content-disposition header', async () => {
			const mockExecuteFunction = createMockExecuteFunction(
				{ imageSource: { mode: 'imageUrl', value: 'https://example.com/photo.jpg' } },
				mockCredentials,
			);

			(mockExecuteFunction.helpers.httpRequest as jest.Mock).mockResolvedValue({
				body: Buffer.from('fake-image-data'),
				headers: {
					'content-type': 'image/png',
					'content-disposition': 'attachment; filename="my-photo.png"',
				},
			});

			(mockExecuteFunction.helpers.httpRequestWithAuthentication as jest.Mock).mockResolvedValue(
				mockImageResponse,
			);

			await executeModule.execute.call(mockExecuteFunction);

			const uploadCall = (mockExecuteFunction.helpers.httpRequestWithAuthentication as jest.Mock)
				.mock.calls[0][1];
			expect(uploadCall.body.toString()).toContain('filename="my-photo.png"');
		});

		it('should throw on invalid URL', async () => {
			const mockExecuteFunction = createMockExecuteFunction(
				{ imageSource: { mode: 'imageUrl', value: 'not-a-valid-url' } },
				mockCredentials,
			);

			await expect(executeModule.execute.call(mockExecuteFunction)).rejects.toThrow(
				'Unexpected error in Sharetribe API call to images/upload',
			);
		});

		it('should extract filename from content-disposition with UTF-8 encoded filename', async () => {
			const mockExecuteFunction = createMockExecuteFunction(
				{ imageSource: { mode: 'imageUrl', value: 'https://example.com/photo.jpg' } },
				mockCredentials,
			);

			(mockExecuteFunction.helpers.httpRequest as jest.Mock).mockResolvedValue({
				body: Buffer.from('fake-image-data'),
				headers: {
					'content-type': 'image/jpeg',
					'content-disposition': "attachment; filename*=UTF-8''my%20photo.jpg",
				},
			});

			(mockExecuteFunction.helpers.httpRequestWithAuthentication as jest.Mock).mockResolvedValue(
				mockImageResponse,
			);

			await executeModule.execute.call(mockExecuteFunction);

			const uploadCall = (mockExecuteFunction.helpers.httpRequestWithAuthentication as jest.Mock)
				.mock.calls[0][1];
			expect(uploadCall.body.toString()).toContain('filename="my photo.jpg"');
		});
	});

	describe('file mode', () => {
		it('should read binary data and upload via multipart form', async () => {
			const mockExecuteFunction = createMockExecuteFunction(
				{ imageSource: { mode: 'file', value: 'data' } },
				mockCredentials,
			);

			(mockExecuteFunction.helpers as jest.Mocked<typeof mockExecuteFunction.helpers> & {
				assertBinaryData: jest.Mock;
				getBinaryDataBuffer: jest.Mock;
			}).assertBinaryData = jest.fn().mockReturnValue({
				mimeType: 'image/png',
				fileName: 'upload.png',
			});

			(mockExecuteFunction.helpers as jest.Mocked<typeof mockExecuteFunction.helpers> & {
				getBinaryDataBuffer: jest.Mock;
			}).getBinaryDataBuffer = jest.fn().mockResolvedValue(Buffer.from('binary-image-content'));

			(mockExecuteFunction.helpers.httpRequestWithAuthentication as jest.Mock).mockResolvedValue(
				mockImageResponse,
			);

			const result = await executeModule.execute.call(mockExecuteFunction);

			expect(mockExecuteFunction.helpers.httpRequestWithAuthentication).toHaveBeenCalledWith(
				'sharetribeOAuth2Api',
				expect.objectContaining({
					method: 'POST',
					url: 'https://sharetribe.com/v1/integration_api/images/upload',
				}),
			);

			const uploadCall = (mockExecuteFunction.helpers.httpRequestWithAuthentication as jest.Mock)
				.mock.calls[0][1];
			expect(uploadCall.body.toString()).toContain('filename="upload.png"');
			expect(uploadCall.body.toString()).toContain('Content-Type: image/png');

			expect(result[0]).toHaveLength(1);
		});
	});

	describe('error handling', () => {
		it('should throw on invalid source mode', async () => {
			const mockExecuteFunction = createMockExecuteFunction(
				{ imageSource: { mode: 'invalid', value: '' } },
				mockCredentials,
			);

			await expect(executeModule.execute.call(mockExecuteFunction)).rejects.toThrow(
				"Invalid 'source'.",
			);
		});

		it('should include Content-Length header in upload request', async () => {
			const mockExecuteFunction = createMockExecuteFunction(
				{ imageSource: { mode: 'imageUrl', value: 'https://example.com/photo.jpg' } },
				mockCredentials,
			);

			(mockExecuteFunction.helpers.httpRequest as jest.Mock).mockResolvedValue({
				body: Buffer.from('fake-image-data'),
				headers: { 'content-type': 'image/jpeg' },
			});

			(mockExecuteFunction.helpers.httpRequestWithAuthentication as jest.Mock).mockResolvedValue(
				mockImageResponse,
			);

			await executeModule.execute.call(mockExecuteFunction);

			const uploadCall = (mockExecuteFunction.helpers.httpRequestWithAuthentication as jest.Mock)
				.mock.calls[0][1];
			expect(uploadCall.headers).toHaveProperty('Content-Length');
			expect(typeof uploadCall.headers['Content-Length']).toBe('number');
		});
	});
});
