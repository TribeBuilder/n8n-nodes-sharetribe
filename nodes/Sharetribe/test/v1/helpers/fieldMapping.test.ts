import { USER_ATTRIBUTE_FIELD_MAP } from '../../../v1/helpers/Sharetribe.types';
import {
	sparseAttributesFromNodeParameter,
	sparseListingAttributesFromNodeParameter,
	sparseTransactionAttributesFromNodeParameter,
} from '../../../v1/helpers/Sharetribe.utils';

describe('Field Mapping', () => {
	describe('USER_ATTRIBUTE_FIELD_MAP', () => {
		it('should map displayName to profile.displayName', () => {
			expect(USER_ATTRIBUTE_FIELD_MAP['displayName']).toBe('profile.displayName');
		});

		it('should map firstName to profile.firstName', () => {
			expect(USER_ATTRIBUTE_FIELD_MAP['firstName']).toBe('profile.firstName');
		});

		it('should map lastName to profile.lastName', () => {
			expect(USER_ATTRIBUTE_FIELD_MAP['lastName']).toBe('profile.lastName');
		});

		it('should map abbreviatedName to profile.abbreviatedName', () => {
			expect(USER_ATTRIBUTE_FIELD_MAP['abbreviatedName']).toBe('profile.abbreviatedName');
		});

		it('should map bio to profile.bio', () => {
			expect(USER_ATTRIBUTE_FIELD_MAP['bio']).toBe('profile.bio');
		});

		it('should map email to email', () => {
			expect(USER_ATTRIBUTE_FIELD_MAP['email']).toBe('email');
		});

		it('should map emailVerified to emailVerified', () => {
			expect(USER_ATTRIBUTE_FIELD_MAP['emailVerified']).toBe('emailVerified');
		});

		it('should map pendingEmail to pendingEmail', () => {
			expect(USER_ATTRIBUTE_FIELD_MAP['pendingEmail']).toBe('pendingEmail');
		});

		it('should map stripeConnected to stripeConnected', () => {
			expect(USER_ATTRIBUTE_FIELD_MAP['stripeConnected']).toBe('stripeConnected');
		});

		it('should map stripeAccount to stripeAccount', () => {
			expect(USER_ATTRIBUTE_FIELD_MAP['stripeAccount']).toBe('stripeAccount');
		});

		it('should map identityProviders to identityProviders', () => {
			expect(USER_ATTRIBUTE_FIELD_MAP['identityProviders']).toBe('identityProviders');
		});

		it('should map createdAt to createdAt', () => {
			expect(USER_ATTRIBUTE_FIELD_MAP['createdAt']).toBe('createdAt');
		});

		it('should map state to state', () => {
			expect(USER_ATTRIBUTE_FIELD_MAP['state']).toBe('state');
		});

		it('should map profileImage to profileImage', () => {
			expect(USER_ATTRIBUTE_FIELD_MAP['profileImage']).toBe('profileImage');
		});

		it('should map metadata to profile.metadata', () => {
			expect(USER_ATTRIBUTE_FIELD_MAP['metadata']).toBe('profile.metadata');
		});

		it('should map deleted to deleted', () => {
			expect(USER_ATTRIBUTE_FIELD_MAP['deleted']).toBe('deleted');
		});

		it('should map effectivePermissionSet to effectivePermissionSet', () => {
			expect(USER_ATTRIBUTE_FIELD_MAP['effectivePermissionSet']).toBe('effectivePermissionSet');
		});

		it('should map publicData to profile.publicData', () => {
			expect(USER_ATTRIBUTE_FIELD_MAP['publicData']).toBe('profile.publicData');
		});

		it('should map protectedData to profile.protectedData', () => {
			expect(USER_ATTRIBUTE_FIELD_MAP['protectedData']).toBe('profile.protectedData');
		});

		it('should map privateData to profile.privateData', () => {
			expect(USER_ATTRIBUTE_FIELD_MAP['privateData']).toBe('profile.privateData');
		});

		it('should map userType to profile.publicData.userType', () => {
			expect(USER_ATTRIBUTE_FIELD_MAP['userType']).toBe('profile.publicData.userType');
		});

		it('should have all required user fields', () => {
			const expectedFields = [
				'firstName',
				'lastName',
				'displayName',
				'abbreviatedName',
				'bio',
				'publicData',
				'protectedData',
				'privateData',
				'email',
				'emailVerified',
				'createdAt',
				'state',
				'profileImage',
				'metadata',
				'pendingEmail',
				'stripeConnected',
				'stripeAccount',
				'identityProviders',
				'deleted',
				'effectivePermissionSet',
				'userType',
			];

			expectedFields.forEach((field) => {
				expect(USER_ATTRIBUTE_FIELD_MAP).toHaveProperty(field);
			});
		});
	});

	describe('sparseListingAttributesFromNodeParameter', () => {
		it('should always include id', () => {
			const result = sparseListingAttributesFromNodeParameter([]);
			expect(result).toContain('id');
		});

		it('should map title correctly', () => {
			const result = sparseListingAttributesFromNodeParameter(['title']);
			expect(result).toContain('title');
		});

		it('should map description correctly', () => {
			const result = sparseListingAttributesFromNodeParameter(['description']);
			expect(result).toContain('description');
		});

		it('should map geolocation correctly', () => {
			const result = sparseListingAttributesFromNodeParameter(['geolocation']);
			expect(result).toContain('geolocation');
		});

		it('should map createdAt correctly', () => {
			const result = sparseListingAttributesFromNodeParameter(['createdAt']);
			expect(result).toContain('createdAt');
		});

		it('should map state correctly', () => {
			const result = sparseListingAttributesFromNodeParameter(['state']);
			expect(result).toContain('state');
		});

		it('should map price correctly', () => {
			const result = sparseListingAttributesFromNodeParameter(['price']);
			expect(result).toContain('price');
		});

		it('should map availabilityPlan correctly', () => {
			const result = sparseListingAttributesFromNodeParameter(['availabilityPlan']);
			expect(result).toContain('availabilityPlan');
		});

		it('should map publicData correctly', () => {
			const result = sparseListingAttributesFromNodeParameter(['publicData']);
			expect(result).toContain('publicData');
		});

		it('should map privateData correctly', () => {
			const result = sparseListingAttributesFromNodeParameter(['privateData']);
			expect(result).toContain('privateData');
		});

		it('should map metadata correctly', () => {
			const result = sparseListingAttributesFromNodeParameter(['metadata']);
			expect(result).toContain('metadata');
		});

		it('should map deleted correctly', () => {
			const result = sparseListingAttributesFromNodeParameter(['deleted']);
			expect(result).toContain('deleted');
		});

		it('should expand categories to publicData.categoryLevel1/2/3', () => {
			const result = sparseListingAttributesFromNodeParameter(['categories']);
			expect(result).toContain('publicData.categoryLevel1');
			expect(result).toContain('publicData.categoryLevel2');
			expect(result).toContain('publicData.categoryLevel3');
			expect(result).not.toContain('categories');
		});

		it('should map listingType to publicData.listingType', () => {
			const result = sparseListingAttributesFromNodeParameter(['listingType']);
			expect(result).toContain('publicData.listingType');
			expect(result).not.toContain('listingType');
		});

		it('should map timezone to availabilityPlan.timezone', () => {
			const result = sparseListingAttributesFromNodeParameter(['timezone']);
			expect(result).toContain('availabilityPlan.timezone');
			expect(result).not.toContain('timezone');
		});

		it('should handle multiple fields', () => {
			const result = sparseListingAttributesFromNodeParameter([
				'title',
				'description',
				'price',
				'state',
			]);
			expect(result).toContain('id');
			expect(result).toContain('title');
			expect(result).toContain('description');
			expect(result).toContain('price');
			expect(result).toContain('state');
		});

		it('should filter out unmapped fields', () => {
			const result = sparseListingAttributesFromNodeParameter(['title', 'invalidField']);
			expect(result).toContain('title');
			expect(result).not.toContain('invalidField');
		});

		it('should map all valid listing attribute fields', () => {
			const allFields = [
				'title',
				'description',
				'geolocation',
				'createdAt',
				'state',
				'price',
				'availabilityPlan',
				'publicData',
				'privateData',
				'metadata',
				'deleted',
				'categories',
				'listingType',
				'timezone',
			];
			const result = sparseListingAttributesFromNodeParameter(allFields);

			expect(result).toContain('id');
			expect(result).toContain('title');
			expect(result).toContain('description');
			expect(result).toContain('geolocation');
			expect(result).toContain('createdAt');
			expect(result).toContain('state');
			expect(result).toContain('price');
			expect(result).toContain('availabilityPlan');
			expect(result).toContain('publicData');
			expect(result).toContain('privateData');
			expect(result).toContain('metadata');
			expect(result).toContain('deleted');
			expect(result).toContain('publicData.categoryLevel1');
			expect(result).toContain('publicData.categoryLevel2');
			expect(result).toContain('publicData.categoryLevel3');
			expect(result).toContain('publicData.listingType');
			expect(result).toContain('availabilityPlan.timezone');
		});
	});

	describe('sparseTransactionAttributesFromNodeParameter', () => {
		it('should always include id', () => {
			const result = sparseTransactionAttributesFromNodeParameter([]);
			expect(result).toContain('id');
		});

		it('should map createdAt correctly', () => {
			const result = sparseTransactionAttributesFromNodeParameter(['createdAt']);
			expect(result).toContain('createdAt');
		});

		it('should map lastTransition correctly', () => {
			const result = sparseTransactionAttributesFromNodeParameter(['lastTransition']);
			expect(result).toContain('lastTransition');
		});

		it('should map lastTransitionedAt correctly', () => {
			const result = sparseTransactionAttributesFromNodeParameter(['lastTransitionedAt']);
			expect(result).toContain('lastTransitionedAt');
		});

		it('should map lineItems correctly', () => {
			const result = sparseTransactionAttributesFromNodeParameter(['lineItems']);
			expect(result).toContain('lineItems');
		});

		it('should map metadata correctly', () => {
			const result = sparseTransactionAttributesFromNodeParameter(['metadata']);
			expect(result).toContain('metadata');
		});

		it('should map payinTotal correctly', () => {
			const result = sparseTransactionAttributesFromNodeParameter(['payinTotal']);
			expect(result).toContain('payinTotal');
		});

		it('should map payoutTotal correctly', () => {
			const result = sparseTransactionAttributesFromNodeParameter(['payoutTotal']);
			expect(result).toContain('payoutTotal');
		});

		it('should map processName correctly', () => {
			const result = sparseTransactionAttributesFromNodeParameter(['processName']);
			expect(result).toContain('processName');
		});

		it('should map processVersion correctly', () => {
			const result = sparseTransactionAttributesFromNodeParameter(['processVersion']);
			expect(result).toContain('processVersion');
		});

		it('should map protectedData correctly', () => {
			const result = sparseTransactionAttributesFromNodeParameter(['protectedData']);
			expect(result).toContain('protectedData');
		});

		it('should map state correctly', () => {
			const result = sparseTransactionAttributesFromNodeParameter(['state']);
			expect(result).toContain('state');
		});

		it('should map transitions correctly', () => {
			const result = sparseTransactionAttributesFromNodeParameter(['transitions']);
			expect(result).toContain('transitions');
		});

		it('should handle multiple fields', () => {
			const result = sparseTransactionAttributesFromNodeParameter([
				'lastTransition',
				'lastTransitionedAt',
				'createdAt',
				'processName',
			]);
			expect(result).toContain('id');
			expect(result).toContain('lastTransition');
			expect(result).toContain('lastTransitionedAt');
			expect(result).toContain('createdAt');
			expect(result).toContain('processName');
		});

		it('should filter out unmapped fields', () => {
			const result = sparseTransactionAttributesFromNodeParameter(['lastTransition', 'invalidField']);
			expect(result).toContain('lastTransition');
			expect(result).not.toContain('invalidField');
		});

		it('should map all valid transaction attribute fields', () => {
			const allFields = [
				'createdAt',
				'lastTransition',
				'lastTransitionedAt',
				'lineItems',
				'metadata',
				'payinTotal',
				'payoutTotal',
				'processName',
				'processVersion',
				'protectedData',
				'state',
				'transitions',
			];
			const result = sparseTransactionAttributesFromNodeParameter(allFields);

			expect(result).toContain('id');
			expect(result).toContain('createdAt');
			expect(result).toContain('lastTransition');
			expect(result).toContain('lastTransitionedAt');
			expect(result).toContain('lineItems');
			expect(result).toContain('metadata');
			expect(result).toContain('payinTotal');
			expect(result).toContain('payoutTotal');
			expect(result).toContain('processName');
			expect(result).toContain('processVersion');
			expect(result).toContain('protectedData');
			expect(result).toContain('state');
			expect(result).toContain('transitions');
		});
	});

	describe('sparseAttributesFromNodeParameter', () => {
		it('should always include id', () => {
			const result = sparseAttributesFromNodeParameter([]);
			expect(result).toContain('id');
		});

		it('should map deleted correctly', () => {
			const result = sparseAttributesFromNodeParameter(['deleted']);
			expect(result).toContain('deleted');
		});

		it('should map state correctly', () => {
			const result = sparseAttributesFromNodeParameter(['state']);
			expect(result).toContain('state');
		});

		it('should map createdAt correctly', () => {
			const result = sparseAttributesFromNodeParameter(['createdAt']);
			expect(result).toContain('createdAt');
		});

		it('should map email correctly', () => {
			const result = sparseAttributesFromNodeParameter(['email']);
			expect(result).toContain('email');
		});

		it('should map emailVerified correctly', () => {
			const result = sparseAttributesFromNodeParameter(['emailVerified']);
			expect(result).toContain('emailVerified');
		});

		it('should map identityProviders correctly', () => {
			const result = sparseAttributesFromNodeParameter(['identityProviders']);
			expect(result).toContain('identityProviders');
		});

		it('should map metadata correctly', () => {
			const result = sparseAttributesFromNodeParameter(['metadata']);
			expect(result).toContain('profile.metadata');
		});

		it('should map pendingEmail correctly', () => {
			const result = sparseAttributesFromNodeParameter(['pendingEmail']);
			expect(result).toContain('pendingEmail');
		});

		it('should map stripeConnected correctly', () => {
			const result = sparseAttributesFromNodeParameter(['stripeConnected']);
			expect(result).toContain('stripeConnected');
		});

		it('should map firstName to profile.firstName', () => {
			const result = sparseAttributesFromNodeParameter(['firstName']);
			expect(result).toContain('profile.firstName');
			expect(result).not.toContain('firstName');
		});

		it('should map lastName to profile.lastName', () => {
			const result = sparseAttributesFromNodeParameter(['lastName']);
			expect(result).toContain('profile.lastName');
			expect(result).not.toContain('lastName');
		});

		it('should map displayName to profile.displayName', () => {
			const result = sparseAttributesFromNodeParameter(['displayName']);
			expect(result).toContain('profile.displayName');
			expect(result).not.toContain('displayName');
		});

		it('should map abbreviatedName to profile.abbreviatedName', () => {
			const result = sparseAttributesFromNodeParameter(['abbreviatedName']);
			expect(result).toContain('profile.abbreviatedName');
			expect(result).not.toContain('abbreviatedName');
		});

		it('should map bio to profile.bio', () => {
			const result = sparseAttributesFromNodeParameter(['bio']);
			expect(result).toContain('profile.bio');
			expect(result).not.toContain('bio');
		});

		it('should map publicData to profile.publicData', () => {
			const result = sparseAttributesFromNodeParameter(['publicData']);
			expect(result).toContain('profile.publicData');
			expect(result).not.toContain('publicData');
		});

		it('should map protectedData to profile.protectedData', () => {
			const result = sparseAttributesFromNodeParameter(['protectedData']);
			expect(result).toContain('profile.protectedData');
			expect(result).not.toContain('protectedData');
		});

		it('should map privateData to profile.privateData', () => {
			const result = sparseAttributesFromNodeParameter(['privateData']);
			expect(result).toContain('profile.privateData');
			expect(result).not.toContain('privateData');
		});

		it('should map userType to profile.publicData.userType', () => {
			const result = sparseAttributesFromNodeParameter(['userType']);
			expect(result).toContain('profile.publicData.userType');
			expect(result).not.toContain('userType');
		});

		it('should handle multiple fields', () => {
			const result = sparseAttributesFromNodeParameter([
				'email',
				'firstName',
				'lastName',
				'displayName',
			]);
			expect(result).toContain('id');
			expect(result).toContain('email');
			expect(result).toContain('profile.firstName');
			expect(result).toContain('profile.lastName');
			expect(result).toContain('profile.displayName');
		});

		it('should filter out unmapped fields', () => {
			const result = sparseAttributesFromNodeParameter(['email', 'invalidField']);
			expect(result).toContain('email');
			expect(result).not.toContain('invalidField');
		});

		it('should map all valid user attribute fields', () => {
			const allFields = [
				'deleted',
				'state',
				'createdAt',
				'email',
				'emailVerified',
				'identityProviders',
				'metadata',
				'pendingEmail',
				'stripeConnected',
				'firstName',
				'lastName',
				'displayName',
				'abbreviatedName',
				'bio',
				'publicData',
				'protectedData',
				'privateData',
				'userType',
			];
			const result = sparseAttributesFromNodeParameter(allFields);

			expect(result).toContain('id');
			expect(result).toContain('deleted');
			expect(result).toContain('state');
			expect(result).toContain('createdAt');
			expect(result).toContain('email');
			expect(result).toContain('emailVerified');
			expect(result).toContain('identityProviders');
			expect(result).toContain('profile.metadata');
			expect(result).toContain('pendingEmail');
			expect(result).toContain('stripeConnected');
			expect(result).toContain('profile.firstName');
			expect(result).toContain('profile.lastName');
			expect(result).toContain('profile.displayName');
			expect(result).toContain('profile.abbreviatedName');
			expect(result).toContain('profile.bio');
			expect(result).toContain('profile.publicData');
			expect(result).toContain('profile.protectedData');
			expect(result).toContain('profile.privateData');
			expect(result).toContain('profile.publicData.userType');
		});

		it('should match USER_ATTRIBUTE_FIELD_MAP for user fields', () => {
			// This test ensures consistency between the two mapping approaches
			const userFields = [
				'firstName',
				'lastName',
				'displayName',
				'abbreviatedName',
				'bio',
				'publicData',
				'protectedData',
				'privateData',
				'email',
				'emailVerified',
				'createdAt',
				'state',
				'metadata',
				'pendingEmail',
				'stripeConnected',
				'identityProviders',
				'deleted',
				'userType',
			];

			const result = sparseAttributesFromNodeParameter(userFields);

			userFields.forEach((field) => {
				const expectedMapping = USER_ATTRIBUTE_FIELD_MAP[field];
				if (expectedMapping) {
					expect(result).toContain(expectedMapping);
				}
			});
		});
	});
});
