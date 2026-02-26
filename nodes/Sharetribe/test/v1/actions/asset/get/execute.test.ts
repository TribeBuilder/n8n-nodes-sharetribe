import * as executeModule from '../../../../../v1/actions/asset/get/execute';
import * as SharetribeHelpers from '../../../../../v1/helpers/Sharetribe';
import * as TransportModule from '../../../../../v1/transport';
import { createMockExecuteFunction, mockSharetribeRequest } from '../../../../helpers';

describe('asset/get', () => {
	let sharetribeMock: ReturnType<typeof mockSharetribeRequest>;

	beforeEach(() => {
		sharetribeMock = mockSharetribeRequest();
		jest.spyOn(SharetribeHelpers, 'Sharetribe').mockImplementation(sharetribeMock.SharetribeMock);
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	it('should fetch asset via Asset Delivery API', async () => {
		const mockExecuteFunction = createMockExecuteFunction({
			assetCategory: '/content/translations.json',
			accessType: 'alias',
			enableTranslationsFilter: false,
			simplify: true,
			options: {},
		});

		// Mock assetRequest function
		const mockAssetResponse = {
			data: {
				id: 'asset-123',
				type: 'asset',
				attributes: {
					'asset-path': 'content/translations',
					version: '1.0.0',
				},
			},
			included: [],
			meta: {},
		};

		jest
		.spyOn(TransportModule, 'assetRequest')
		.mockResolvedValue(mockAssetResponse as unknown as Awaited<ReturnType<typeof TransportModule.assetRequest>>);

		const result = await executeModule.execute.call(mockExecuteFunction);

		expect(TransportModule.assetRequest).toHaveBeenCalledWith(
			'alias',
			['/content/translations.json'],
			expect.any(String),
		);
		expect(result).toBeDefined();
	});
});
