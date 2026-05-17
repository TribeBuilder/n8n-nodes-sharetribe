import * as executeModule from '../../../../../v1/actions/user/verifyEmail/execute';
import * as SharetribeHelpers from '../../../../../v1/helpers/Sharetribe';
import { createMockExecuteFunction, mockSharetribeRequest } from '../../../../helpers';

describe('user/verifyEmail', () => {
	let sharetribeMock: ReturnType<typeof mockSharetribeRequest>;

	beforeEach(() => {
		sharetribeMock = mockSharetribeRequest();
		jest.spyOn(SharetribeHelpers, 'Sharetribe').mockImplementation(sharetribeMock.SharetribeMock);
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	it('should POST to users/verify_email with id and email in the body', async () => {
		const mockExecuteFunction = createMockExecuteFunction({
			userId: '550e8400-e29b-41d6-a716-446655440000',
			userEmail: 'user@example.com',
			simplify: true,
			options: {},
		});

		sharetribeMock.mockRequest.mockResolvedValue({
			data: [{ json: { id: 'test' } }],
		});

		await executeModule.execute.call(mockExecuteFunction);

		const options = sharetribeMock.getLastRequestOptions();
		expect(options.method).toBe('POST');
		expect(options.endpoint).toContain('users/verify_email');
		expect(options.body).toEqual({
			id: '550e8400-e29b-41d6-a716-446655440000',
			email: 'user@example.com',
		});
	});

	it('should throw before any HTTP call when email is malformed', async () => {
		const mockExecuteFunction = createMockExecuteFunction({
			userId: '550e8400-e29b-41d6-a716-446655440000',
			userEmail: 'not-an-email',
			simplify: true,
			options: {},
		});

		await expect(executeModule.execute.call(mockExecuteFunction)).rejects.toThrow(
			/Invalid email address/,
		);
		expect(sharetribeMock.mockRequest).not.toHaveBeenCalled();
	});
});
