import type { INodeProperties } from 'n8n-workflow';
import {
	UI_OPERATIONS,
	UI_RESOURCES,
	makeReturnAllField,
	makeLimitField,
	makeResourceIdField,
} from '../../../helpers/Sharetribe';

export const listingGetTimeslotsDescription: INodeProperties[] = [
	makeReturnAllField(UI_RESOURCES.LISTING, UI_OPERATIONS.GET_TIMESLOTS),
	makeLimitField(UI_RESOURCES.LISTING, UI_OPERATIONS.GET_TIMESLOTS, { showCountOnly: false }),
	makeResourceIdField(UI_RESOURCES.LISTING, UI_OPERATIONS.GET_TIMESLOTS, {
		displayName: 'Listing ID',
		name: 'listingId',
		description: 'The UUID of the listing to query for available booking timeslots',
	}),
	{
		displayName: 'Start',
		name: 'start',
		type: 'dateTime',
		required: true,
		displayOptions: {
			show: {
				resource: [UI_RESOURCES.LISTING],
				operation: [UI_OPERATIONS.GET_TIMESLOTS],
			},
		},
		default: '',
		placeholder: 'Date and time in UTC',
		validateType: 'dateTime',
		description: 'Start date of the range to check availability for',
		hint: 'At most one day one day in the past and 366 days in the future',
	},
	{
		displayName: 'End',
		name: 'end',
		type: 'dateTime',
		required: true,
		displayOptions: {
			show: {
				resource: [UI_RESOURCES.LISTING],
				operation: [UI_OPERATIONS.GET_TIMESLOTS],
			},
		},
		default: '',
		placeholder: 'Date and time in UTC',
		validateType: 'dateTime',
		description: 'End date of the range to check availability for',
		hint: "At most 366 days in the future and at most 90 days after 'Start'",
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: {
			show: {
				resource: [UI_RESOURCES.LISTING],
				operation: [UI_OPERATIONS.GET_TIMESLOTS],
			},
		},
		options: [
			{
				displayName: 'Expand Time Slots',
				name: 'expandTimeSlots',
				type: 'boolean',
				default: true,
				description: `Whether to expand time slots to maximize continuous availability. For example: <br><br>
<pre>10:00 - 11:00, 3 seats
11:00 - 12:00, 1 seat (capacity bottleneck)
12:00 - 13:00, 3 seats</pre><br>
With expanded time slots, these are transformed to show the full extent of continuous availability.<br><br>

Expanded:<br><br>
<pre>10:00 - 13:00, 1 seat (3-hour range at min seats)
10:00 - 11:00, 3 seats (additional seats in first hour)
12:00 - 13:00, 3 seats (additional seats in last hour)</pre>
<a href="https://www.sharetribe.com/api-reference/marketplace.html?javascript#time-slots" target="_blank">Learn more</a>`,
			},

			{
				displayName: 'Min. Booking Length',
				name: 'minDurationStartingInInterval',
				type: 'fixedCollection',
				default: {},
				placeholder: 'Set Minimum Length',
				description:
					'Filter out time slots shorter than this duration. This also merges adjacent slots into one continuous time slot to meet the required booking length.',
				// typeOptions: { multipleValues: false },
				options: [
					{
						displayName: 'Duration',
						name: 'duration',
						// eslint-disable-next-line n8n-nodes-base/node-param-fixed-collection-type-unsorted-items
						values: [
							{
								displayName: 'Unit',
								name: 'unit',
								type: 'options',
								default: 'days',
								options: [
									{
										name: 'Minutes',
										value: 'minutes',
									},
									{
										name: 'Hours',
										value: 'hours',
									},
									{
										name: 'Days',
										value: 'days',
									},
									{
										name: 'Weeks',
										value: 'weeks',
									},
								],
							},
							{
								displayName: 'Minutes Count',
								name: 'value',
								type: 'number',
								displayOptions: { show: { unit: ['minutes'] } },
								description: 'Set to e.g. 60 to group by hour',
								default: 60,
								typeOptions: {
									minValue: 1,
								},
							},
							{
								displayName: 'Hours Count',
								name: 'value',
								type: 'number',
								displayOptions: { show: { unit: ['hours'] } },
								description: 'Set to e.g. 60 to group by hour',
								default: 3,
								typeOptions: {
									minValue: 1,
								},
							},
							{
								displayName: 'Days Count',
								name: 'value',
								type: 'number',
								displayOptions: { show: { unit: ['days'] } },
								description: 'Set to e.g. 60 to group by hour',
								default: 2,
								typeOptions: {
									minValue: 1,
								},
							},
							{
								displayName: 'Weeks Count',
								name: 'value',
								type: 'number',
								displayOptions: { show: { unit: ['weeks'] } },
								description: 'Set to e.g. 1 to group weeks',
								default: 1,
								typeOptions: {
									minValue: 1,
								},
							},
						],
					},
				],
			},
			{
				displayName: 'Group Time Slots',
				name: 'timeSlotGrouping',
				type: 'fixedCollection',
				default: {},
				placeholder: 'Add Group Option',
				description: `<b>Group Time Slots to control result density and alignment.</b><br><br>
Grouping divides the timeline from 'Start' to 'End' into intervals (buckets) to limit how many results are returned. It also allows "snapping" results to a specific schedule grid.<br>
<br>
<b>Example: 45-Min Appointments</b><br>
Goal: Ensure Time Slots only start at <pre>09:15, 10:00, 10:45, etc</pre><br>
<b>Setup:</b><br>
<pre>'Start': 09:00
'End': at most 90 days after 'Start'
'Expand Time Slots': true
'Min. Booking Length': 'Unit': Minutes, 'Count': 45
'Group Size': 'Unit': Minutes, 'Count': 45
'Max Slots Per Group': 1
'Group Start Time': 08:30
</pre>
<br>
<b>Logic:</b><br>
• <b>Group Size by Duration:</b> Defines the "bucket" length (e.g., 45 minutes, 1 day, 1 week).<br>
• <b>Max Slots Per Group:</b> Limits the number of non-overlapping Time Slots returned per "bucket".<br>
• <b>Group Start Time:</b> The anchor point. Align this to a previous time (e.g., <i>08:30</i>) to force specific start times like <i>09:15</i> (<i>08:30 + 45 min</i>  "bucket").<br><a href="https://www.sharetribe.com/api-reference/marketplace.html?javascript#time-slots" target="_blank">Learn more</a>`,
				options: [
					{
						displayName: 'Group Size by Duration',
						name: 'duration',
						description: 'test',
						// eslint-disable-next-line n8n-nodes-base/node-param-fixed-collection-type-unsorted-items
						values: [
							{
								displayName: 'Unit',
								name: 'unit',
								type: 'options',
								default: 'days',
								options: [
									{
										name: 'Minutes',
										value: 'minutes',
									},
									{
										name: 'Hours',
										value: 'hours',
									},
									{
										name: 'Days',
										value: 'days',
									},
									{
										name: 'Weeks',
										value: 'weeks',
									},
								],
							},
							{
								displayName: 'Number of Minutes',
								name: 'value',
								type: 'number',
								displayOptions: { show: { unit: ['minutes'] } },
								description: 'Set to e.g. 60 to group by hour',
								default: 60,
								typeOptions: {
									minValue: 60,
								},
							},
							{
								displayName: 'Number of Hours',
								name: 'value',
								type: 'number',
								displayOptions: { show: { unit: ['hours'] } },
								description: 'Set to e.g. 60 to group by hour',
								default: 1,
								typeOptions: {
									minValue: 1,
								},
							},
							{
								displayName: 'Number of Days',
								name: 'value',
								type: 'number',
								displayOptions: { show: { unit: ['days'] } },
								description: 'Set to e.g. 60 to group by hour',
								default: 1,
								typeOptions: {
									minValue: 1,
								},
							},
							{
								displayName: 'Number of Weeks',
								name: 'value',
								type: 'number',
								displayOptions: { show: { unit: ['weeks'] } },
								description: 'Set to e.g. 1 to group weeks',
								default: 1,
								typeOptions: {
									minValue: 1,
								},
							},
						],
					},
					{
						displayName: 'Group Start Time',
						name: 'alignmentOptions',
						values: [
							{
								displayName: 'Group Start Time',
								name: 'intervalAlign',
								type: 'dateTime',
								validateType: 'dateTime',
								placeholder: 'e.g. 1970-01-01T00:30:00',
								default: null,
								description:
									"Defaults to 'Start' time. Allows setting a different time to begin 'Grouping' from.",
								hint: "Must be before or same as 'Start', e.g. set to 00:30 to align available time slots to the half-hour.",
							},
						],
					},
					{
						displayName: 'Max Time Slots Per Group',
						name: 'limitOptions',
						values: [
							{
								displayName: 'Max Time Slots Per Group',
								name: 'maxPerInterval',
								type: 'number',
								default: 1,
								typeOptions: {
									minValue: 1,
								},
								// eslint-disable-next-line n8n-nodes-base/node-param-description-excess-final-period
								description:
									"Setting to 1 will return a single available time slot for the grouping.<br><br>Recommended when needing to determine if there is 'at least one' time slot available in the grouping.",
								hint: "How many different, non-overlapping time slots to show within each 'Grouping' (e.g., how many time slots to show per day).",
							},
						],
					},
				],
			},
		],
	},
];
