import type { INodeProperties } from 'n8n-workflow';

import * as get from './get';
import * as updateProfile from './update';
import * as updatePermissions from './updatePermissions';
import * as approveUser from './approve';
import * as getMany from './getMany';
import * as verifyEmail from './verifyEmail';

export { get, updateProfile, updatePermissions, approveUser, getMany, verifyEmail };

export const descriptions: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['user'],
			},
		},
		options: [
			{
				name: 'Approve',
				value: 'approve',
				description: 'Approve user currently in <code>pendingApproval</code> state',
				action: 'Approve a user',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Retrieve a user by ID',
				action: 'Get a user',
			},
			{
				name: 'Get Many',
				value: 'getMany',
				description: 'Retrieve multiple users with filtering and sorting',
				action: 'Get many users',
			},
			{
				name: 'Update',
				value: 'updateProfile',
				description: "Update user's profile information",
				action: 'Update a user',
			},
			{
				name: 'Update Permissions',
				value: 'updatePermissions',
				description: "Update user's permissions",
				action: 'Update user permissions',
			},
			{
				name: 'Verify Email',
				value: 'verifyEmail',
				description: "Mark a user's email address as verified",
				action: 'Verify a user email',
			},
		],
		default: 'get',
	},

	...get.description,
	...getMany.description,
	...updateProfile.description,
	...updatePermissions.description,
	...approveUser.description,
	...verifyEmail.description,
];
