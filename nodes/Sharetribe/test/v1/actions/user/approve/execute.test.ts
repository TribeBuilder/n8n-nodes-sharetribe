import * as executeModule from '../../../../../v1/actions/user/approve/execute';
import * as SharetribeHelpers from '../../../../../v1/helpers/Sharetribe';
import { createMockExecuteFunction, mockSharetribeRequest } from '../../../../helpers';

describe('user/approve', () => {
	let sharetribeMock: ReturnType<typeof mockSharetribeRequest>;

	beforeEach(() => {
		sharetribeMock = mockSharetribeRequest();
		jest.spyOn(SharetribeHelpers, 'Sharetribe').mockImplementation(sharetribeMock.SharetribeMock);
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	it('should call correct endpoint', async () => {
		const mockExecuteFunction = createMockExecuteFunction({
			userId: '550e8400-e29b-41d6-a716-446655440000',
			simplify: true,
			options: {},
		});

		sharetribeMock.mockRequest.mockResolvedValue({
			data: [{ json: { id: 'test' } }],
		});

		await executeModule.execute.call(mockExecuteFunction);

		const options = sharetribeMock.getLastRequestOptions();
		expect(options.endpoint).toContain('users/approve');
	});
});
