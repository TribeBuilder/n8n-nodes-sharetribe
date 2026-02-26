import { handleSharetribeError } from '../../../v1/transport';
import { NodeApiError, type IExecuteFunctions } from 'n8n-workflow';

// Mock IExecuteFunctions
const mockExecuteFunctions = {
	getNode: jest.fn().mockReturnValue({
		name: 'Test Node',
		type: 'n8n-nodes-base.test',
	}),
} as unknown as IExecuteFunctions;

describe('Error Handling', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('404 errors with resource info', () => {
		it('should show friendly message for listing not found with ID', () => {
			const error = {
				response: {
					status: 404,
				},
				message: 'Not found',
			};

			try {
				handleSharetribeError.call(
					mockExecuteFunctions,
					error,
					'listings/show',
					undefined,
					{ id: '550e8400-e29b-41d4-a716-446655440000' },
				);
				fail('Should have thrown an error');
			} catch (e) {
				expect(e).toBeInstanceOf(NodeApiError);
				const nodeError = e as NodeApiError;
				expect(nodeError.message).toContain('No listing with ID 550e8400-e29b-41d4-a716-446655440000 was found');
			}
		});

		it('should show friendly message for transaction not found with ID', () => {
			const error = {
				response: {
					status: 404,
				},
				message: 'Not found',
			};

			try {
				handleSharetribeError.call(
					mockExecuteFunctions,
					error,
					'transactions/show',
					undefined,
					{ id: '550e8400-e29b-41d4-a716-446655440001' },
				);
				fail('Should have thrown an error');
			} catch (e) {
				expect(e).toBeInstanceOf(NodeApiError);
				const nodeError = e as NodeApiError;
				expect(nodeError.message).toContain('No transaction with ID 550e8400-e29b-41d4-a716-446655440001 was found');
			}
		});

		it('should show friendly message for user not found with ID', () => {
			const error = {
				response: {
					status: 404,
				},
				message: 'Not found',
			};

			try {
				handleSharetribeError.call(
					mockExecuteFunctions,
					error,
					'users/show',
					undefined,
					{ id: '550e8400-e29b-41d4-a716-446655440002' },
				);
				fail('Should have thrown an error');
			} catch (e) {
				expect(e).toBeInstanceOf(NodeApiError);
				const nodeError = e as NodeApiError;
				expect(nodeError.message).toContain('No user with ID 550e8400-e29b-41d4-a716-446655440002 was found');
			}
		});

		it('should show friendly message for availability exception not found with ID from body', () => {
			const error = {
				response: {
					status: 404,
				},
				message: 'Not found',
			};

			try {
				handleSharetribeError.call(
					mockExecuteFunctions,
					error,
					'availability_exceptions/delete',
					{ id: '550e8400-e29b-41d4-a716-446655440003' },
					undefined,
				);
				fail('Should have thrown an error');
			} catch (e) {
				expect(e).toBeInstanceOf(NodeApiError);
				const nodeError = e as NodeApiError;
				expect(nodeError.message).toContain('No availability exception with ID 550e8400-e29b-41d4-a716-446655440003 was found');
			}
		});

		it('should show generic message when no ID is available', () => {
			const error = {
				response: {
					status: 404,
				},
				message: 'Not found',
			};

			try {
				handleSharetribeError.call(
					mockExecuteFunctions,
					error,
					'listings/show',
					undefined,
					undefined,
				);
				fail('Should have thrown an error');
			} catch (e) {
				expect(e).toBeInstanceOf(NodeApiError);
				const nodeError = e as NodeApiError;
				expect(nodeError.message).toContain('Listing not found');
			}
		});

		it('should include credential name in 404 message when provided', () => {
			const error = {
				response: {
					status: 404,
				},
				message: 'Not found',
			};

			try {
				handleSharetribeError.call(
					mockExecuteFunctions,
					error,
					'listings/show',
					undefined,
					{ id: '550e8400-e29b-41d4-a716-446655440000' },
					'My Sharetribe Dev',
				);
				fail('Should have thrown an error');
			} catch (e) {
				expect(e).toBeInstanceOf(NodeApiError);
				const nodeError = e as NodeApiError;
				expect(nodeError.message).toContain('No listing with ID 550e8400-e29b-41d4-a716-446655440000 was found on "My Sharetribe Dev"');
			}
		});

		it('should include credential name in generic 404 message when provided', () => {
			const error = {
				response: {
					status: 404,
				},
				message: 'Not found',
			};

			try {
				handleSharetribeError.call(
					mockExecuteFunctions,
					error,
					'transactions/show',
					undefined,
					undefined,
					'My Sharetribe Prod',
				);
				fail('Should have thrown an error');
			} catch (e) {
				expect(e).toBeInstanceOf(NodeApiError);
				const nodeError = e as NodeApiError;
				expect(nodeError.message).toContain('Transaction not found on "My Sharetribe Prod"');
			}
		});
	});

	describe('404 errors in Sharetribe API error format', () => {
		it('should show friendly message for API-formatted 404 with ID', () => {
			const error = {
				response: {
					status: 404,
					data: {
						errors: [
							{
								id: 'error-123',
								status: 404,
								code: 'not-found',
								title: 'Resource not found',
								details: 'The requested resource was not found',
							},
						],
					},
				},
			};

			try {
				handleSharetribeError.call(
					mockExecuteFunctions,
					error,
					'listings/show',
					undefined,
					{ id: '550e8400-e29b-41d4-a716-446655440000' },
				);
				fail('Should have thrown an error');
			} catch (e) {
				expect(e).toBeInstanceOf(NodeApiError);
				const nodeError = e as NodeApiError;
				expect(nodeError.message).toContain('No listing with ID 550e8400-e29b-41d4-a716-446655440000 was found');
			}
		});

		it('should include credential name for API-formatted 404', () => {
			const error = {
				response: {
					status: 404,
					data: {
						errors: [
							{
								id: 'error-123',
								status: 404,
								code: 'not-found',
								title: 'Resource not found',
								details: 'The requested resource was not found',
							},
						],
					},
				},
			};

			try {
				handleSharetribeError.call(
					mockExecuteFunctions,
					error,
					'transactions/show',
					undefined,
					{ id: '550e8400-e29b-41d4-a716-446655440001' },
					'My Sharetribe Dev',
				);
				fail('Should have thrown an error');
			} catch (e) {
				expect(e).toBeInstanceOf(NodeApiError);
				const nodeError = e as NodeApiError;
				expect(nodeError.message).toContain('No transaction with ID 550e8400-e29b-41d4-a716-446655440001 was found on "My Sharetribe Dev"');
			}
		});
	});

	describe('Other status codes', () => {
		it('should handle 401 errors', () => {
			const error = {
				response: {
					status: 401,
				},
				message: 'Unauthorized',
			};

			try {
				handleSharetribeError.call(
					mockExecuteFunctions,
					error,
					'listings/show',
					undefined,
					undefined,
				);
				fail('Should have thrown an error');
			} catch (e) {
				expect(e).toBeInstanceOf(NodeApiError);
				const nodeError = e as NodeApiError;
				expect(nodeError.description).toContain('Authentication failed');
			}
		});

		it('should handle 403 errors', () => {
			const error = {
				response: {
					status: 403,
				},
				message: 'Forbidden',
			};

			try {
				handleSharetribeError.call(
					mockExecuteFunctions,
					error,
					'listings/show',
					undefined,
					undefined,
				);
				fail('Should have thrown an error');
			} catch (e) {
				expect(e).toBeInstanceOf(NodeApiError);
				const nodeError = e as NodeApiError;
				expect(nodeError.description).toContain('Access forbidden');
			}
		});
	});
});
