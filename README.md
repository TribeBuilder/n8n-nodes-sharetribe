# n8n-nodes-sharetribe

This is an n8n community node. It lets you use [Sharetribe](https://sharetribe.com) in your n8n workflows.

Sharetribe is a cloud platform for building and running online marketplaces. It provides the backend infrastructure — user management, listings, transactions, messaging, and payments — so marketplace operators can launch without building from scratch.

> Requires the 'Build', 'Pro' or 'Extend' plan to access the Sharetribe [Integration API](https://www.sharetribe.com/docs/introduction/getting-started-with-integration-api/).

[n8n](https://n8n.io/) is a [fair-code licensed](https://docs.n8n.io/reference/license/) workflow automation platform.

**Note:** This n8n community node is not developed or maintained by Sharetribe. It has however been vetted by Sharetribe and is developed and maintained by a verified [Sharetribe Expert](https://experts.sharetribe.com/l/greg-long-freelance-developer/6973f22c-9cdb-4b3a-b0bd-7aa5e3915fe0).

[![a verified sharetribe expert badge](/assets/I-am-a-Verified-Sharetribe-Expert_white.webp)](https://sharetribe.com)

[Installation](#installation)  
[Operations](#operations)  
[Credentials](#credentials)  
[Compatibility](#compatibility)  
[Usage](#usage)  
[Resources](#resources)

## Installation

Follow the [installation guide](https://docs.n8n.io/integrations/community-nodes/installation/) in the n8n community nodes documentation.

## Operations

### Sharetribe Trigger Node

Polls for events from your Sharetribe marketplace:

| Event Type             | Events                                    |
| ---------------------- | ----------------------------------------- |
| Availability Exception | Created, Updated, Deleted                 |
| Booking                | Created, Updated, Deleted                 |
| Listing                | Created, Updated, Deleted                 |
| Message                | Created, Updated, Deleted                 |
| Review                 | Created, Updated, Deleted                 |
| Stock Adjustment       | Created, Updated, Deleted                 |
| Stock Reservation      | Created, Updated, Deleted                 |
| Transaction            | Initiated, Transitioned, Updated, Deleted |
| User                   | Created, Updated, Deleted                 |

### Sharetribe Node

| Resource               | Operations                                                                                           |
| ---------------------- | ---------------------------------------------------------------------------------------------------- |
| Asset                  | Get (translations, email texts, branding, listing fields, listing types, user fields, content pages) |
| Availability Exception | Create, Delete, Get Many                                                                             |
| Image                  | Upload (from file or URL)                                                                            |
| Listing                | Approve, Close, Create, Get, Get Availability, Get Many, Open, Update                                |
| Marketplace            | Get Name                                                                                             |
| Stock                  | Get Adjustments, Get Reservation, Update Quantity                                                    |
| Transaction            | Get, Get Many, Transition, Transition Speculative, Update                                            |
| User                   | Approve, Get, Get Many, Update, Update Permissions                                                   |

Assets are marketplace configuration files stored on Sharetribe's CDN, fetchable by alias (`latest`) or specific version ID.

## Credentials

Create new credentials of type **Sharetribe Integration API** in n8n:

1. **Integration API Client ID** and **Integration API Client Secret** — create an Integration API application in [Sharetribe Console → Build → Advanced → Applications](https://console.sharetribe.com/advanced/applications).

2. **Sharetribe Plan** — select your plan:
   - **Extend** (default, also for Trial and Build plans): enter your **Marketplace API Client ID** — create a Marketplace API application in [Sharetribe Console → Build → Advanced → Applications](https://console.sharetribe.com/advanced/applications).
   - **Pro**: enter your **Marketplace URL** — the node retrieves the Marketplace API Client ID automatically.

## Compatibility

- **Minimum n8n version**: 1.0.0
- **Tested with**: n8n versions 1.0.0+
- **Sharetribe API**: Compatible with Sharetribe Integration API v2025-12-16

## Usage

If you are new to n8n check out the n8n's [Try it out](https://docs.n8n.io/try-it-out/) documentation to get started.

#### Search Filters and Sorting

The node learns about your marketplace's [extended data](https://www.sharetribe.com/docs/references/extended-data/) configuration to determine what extended data fields can be used as filter and sort options for Listings, Users and Transactions.

The node also learns your marketplace Listing types, User types, Listing Categories, Transaction transitions and Transaction Processes. These can then be used as Search filters.

**Note**: Only marketplaces using the 'Extend' plan can define custom fields for search and sort on Transactions and Users, see [Search schema](https://www.sharetribe.com/docs/references/extended-data/#search-schema). Public fields on a Listing can be defined as searchable and sortable in the Sharetribe console on any plan.

#### Count Only

Get Many operations for Listings, Transactions, Users, and Stock Adjustments support a **Count Only** option that returns just the total number of matching records instead of the full list — useful for conditional logic without fetching data you don't need.

#### Response Flattening

API responses are automatically simplified into flat, easy-to-use objects with related data merged in.

#### Updating Extended Data

When creating or updating a Listing, Transaction, or User, extended data fields can be added or updated in two modes:

- **Manual Mapping** (Recommended) — add or update individual fields one by one. Only the fields you specify are changed; everything else is left untouched. Supports [dot-notation](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.set/#support-dot-notation) for nested values (e.g. `details.size`).
- **JSON** — provide a raw JSON object that is merged at the top level only (**shallow merge**). **Use with caution**: if a field already contains a nested object, it will be **fully replaced**, not merged. Top-level fields set to `null` are deleted entirely.

  **Example** — if `publicData` is currently:

  ```json
  {
  	"color": "red",
  	"details": { "size": "large", "weight": 5 }
  }
  ```

  and you provide:

  ```json
  {
  	"details": { "size": "small" }
  }
  ```

  the result is:

  ```json
  {
  	"color": "red",
  	"details": { "size": "small" }
  }
  ```

  `weight` is permanently deleted. Use **Manual Mapping** with `details.size` to avoid this.

**Deleting individual fields** — Update operations include a separate **Delete Fields** section. Enter the field path ([dot-notation](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.set/#support-dot-notation) supported). For example, setting the path to `details.weight` removes only that key while leaving the rest of `details` intact.

## Resources

- [Sharetribe](https://www.sharetribe.com/)
- [Sharetribe Devoper Docs](https://www.sharetribe.com/docs/)
- [Sharetribe API Docs](https://www.sharetribe.com/api-reference/integration.html)
- [Sharetribe Console](https://console.sharetribe.com/)

## Troubleshooting

Issues can be created in the GitHub repository for the node https://github.com/tribebuilder/n8n-nodes-sharetribe.

## License

[MIT](LICENSE.md)

## Development

See [DEVELOPMENT.md](DEVELOPMENT.md)
