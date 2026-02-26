import * as executeModule from '../../../../../v1/actions/user/get/execute';
import * as SharetribeHelpers from '../../../../../v1/helpers/Sharetribe';
import { createMockExecuteFunction, mockSharetribeRequest } from '../../../../helpers';

describe('user/get', () => {
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

		sharetribeMock.mockQuery.mockResolvedValue({
			data: [{ json: { id: 'test' } }],
		});

		await executeModule.execute.call(mockExecuteFunction);

		const call = sharetribeMock.getLastQueryCall();
		expect(call.endpoint).toContain('users/show');
	});

	it('should map user metadata to profile.metadata in sparse fields', async () => {
		const mockExecuteFunction = createMockExecuteFunction({
			userId: '550e8400-e29b-41d6-a716-446655440000',
			simplify: false,
			options: {
				outputFields: {
					userFields: ['firstName', 'lastName', 'metadata'],
				},
			},
		});

		sharetribeMock.mockQuery.mockResolvedValue({
			data: [{ json: { id: 'test' } }],
		});

		await executeModule.execute.call(mockExecuteFunction);

		const call = sharetribeMock.getLastQueryCall();
		expect(call.qs['fields.user']).toContain('profile.metadata');
		expect(call.qs['fields.user']).not.toContain('metadata');
	});
});
