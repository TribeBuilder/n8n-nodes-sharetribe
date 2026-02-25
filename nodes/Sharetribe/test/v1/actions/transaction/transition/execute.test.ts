import * as executeModule from '../../../../../v1/actions/transaction/transition/execute';
import * as SharetribeHelpers from '../../../../../v1/helpers/Sharetribe';
import { createMockExecuteFunction, mockSharetribeRequest } from '../../../../helpers';

describe('transaction/transition', () => {
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
			transactionId: '550e8400-e29b-41d6-a716-446655440000',
			transition: 'transition/accept',
			simplify: true,
			options: {},
		});

		sharetribeMock.mockRequest.mockResolvedValue({
			data: [{ json: { id: 'test' } }],
		});

		await executeModule.execute.call(mockExecuteFunction);

		const options = sharetribeMock.getLastRequestOptions();
		expect(options.endpoint).toContain('transactions/transition');
	});

	it('should call speculative endpoint when speculative is true', async () => {
		const mockExecuteFunction = createMockExecuteFunction({
			transactionId: '550e8400-e29b-41d6-a716-446655440000',
			transition: 'transition/accept',
			speculative: true,
			simplify: true,
			options: {},
		});

		sharetribeMock.mockRequest.mockResolvedValue({
			data: [{ json: { id: 'test' } }],
		});

		await executeModule.execute.call(mockExecuteFunction);

		const options = sharetribeMock.getLastRequestOptions();
		expect(options.endpoint).toContain('transactions/transition_speculative');
	});

	it('should call regular endpoint when speculative is false', async () => {
		const mockExecuteFunction = createMockExecuteFunction({
			transactionId: '550e8400-e29b-41d6-a716-446655440000',
			transition: 'transition/accept',
			speculative: false,
			simplify: true,
			options: {},
		});

		sharetribeMock.mockRequest.mockResolvedValue({
			data: [{ json: { id: 'test' } }],
		});

		await executeModule.execute.call(mockExecuteFunction);

		const options = sharetribeMock.getLastRequestOptions();
		expect(options.endpoint).toContain('transactions/transition');
		expect(options.endpoint).not.toContain('speculativeTransition');
	});
});
