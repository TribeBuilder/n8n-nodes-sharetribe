import type { ImageProperties } from '../../Interfaces';

import { UI_RESOURCES, UI_OPERATIONS } from '../../../helpers/Sharetribe';

export const imageUploadDescription: ImageProperties = [
	{
		displayName: 'Source',
		name: 'imageSource',
		type: 'resourceLocator',
		default: { mode: 'imageUrl', value: '' },
		description: 'Where to read the image from',
		modes: [
			{
				displayName: 'File',
				name: 'file',
				type: 'string',
				hint: 'Enter the name of the incoming field containing the image file data you want to upload',
				placeholder: 'data',
			},
			{
				displayName: 'URL',
				name: 'imageUrl',
				type: 'string',
				hint: 'Enter a URL to an image',
				validation: [
					{
						type: 'regex',
						properties: {
							regex: `^(https?:\\/\\/)?(www\\.)?([a-zA-Z0-9-]+\\.)+[a-zA-Z]{2,}(\\/[^\\s]*)?$`,
							errorMessage: 'Invalid URL',
						},
					},
				],
				placeholder: 'e.g. https://example.com/image.png',
			},
		],
		displayOptions: {
			show: {
				resource: [UI_RESOURCES.IMAGE],
				operation: [UI_OPERATIONS.UPLOAD],
			},
		},
	},
];
