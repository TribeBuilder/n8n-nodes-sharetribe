import type { IExecuteFunctions } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

/**
 * Validates that seats is greater than zero when making time slots available
 */
export function validateSeatsGreaterThanZero(
	context: IExecuteFunctions,
	itemIndex: number,
	seats: number,
): void {
	if (seats <= 0) {
		throw new NodeOperationError(context.getNode(), 'Invalid seats value', {
			itemIndex,
			description: `Seats must be greater than 0 when making time slots available.<br><br>Received: ${seats}<br>Expected: Greater than 0`,
		});
	}
}
