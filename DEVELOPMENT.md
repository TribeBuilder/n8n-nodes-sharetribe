# Development

This document explains how to set up a local development environment for this node.

---

## Prerequisites

You’ll need:

- **Node.js (22.19 and 24.x (inclusive)) and npm** installed.
- A local n8n instance (run automatically, see below).

---

## Development

```bash
npm install
```

### Start development server

```bash
npm run dev
```

This command:

- Starts n8n in development mode on `http://localhost:5678`
- Enables hot reload for your node changes
- Automatically includes your node in the n8n instance
- Links your node to `~/.n8n-node-cli/.n8n/custom` for development
- Watches for file changes and rebuilds automatically

### Building

```bash
npm run build
```

Generates compiled output in the `/dist` folder.

### Debugging

Run with debugging on breakpoints. A `launch.json` for VSCode is already setup.
Set breakpoints and F5 to launch n8n with the custom node and debugger attached.

### Testing

Unit tests use Jest:

```bash
npm run test
npm run test:watch    # re-run on file changes
npm run test:coverage # with coverage report
```

E2E tests run real workflows against a live Sharetribe marketplace using `npx n8n` CLI commands:

```bash
npm run test:e2e
```

#### E2E setup

1. Copy the config template:

   ```bash
   cp scripts/runE2eTests.config.template.yaml scripts/runE2eTests.config.yaml
   ```

2. Add Sharetribe credentials in `scripts/runE2eTests.config.yaml`

3. Start the n8n dev instance in a separate terminal:

   ```bash
   npm run dev
   ```

4. Run the tests:

   ```bash
   npm run test:e2e
   ```

The config file is .gitignored — never commit real credentials.

#### Test users

The test runner uses two Sharetribe user accounts:

- **testProvider** — acts as the listing author (provider). Used as `FIXTURE_USER_ID` in test workflows.
- **testUser** — acts as the customer who creates transactions on the provider's listings. Sharetribe requires a different user than the listing author to initiate transactions.

Both users are **auto-created and approved** on first run if they don't already exist in the marketplace. On subsequent runs, existing users are found by email and reused.

#### Fixture auto-creation

The `fixtures` section in config is entirely optional. If fixture IDs are left empty, the runner auto-creates them:

- **userId** — looked up from `testProvider.email`
- **listingId** — a published "E2E Test Listing" created via the Integration API
- **transactionId** — created via customer auth on the test listing

Set fixture IDs explicitly to use specific pre-existing resources instead. Users persist across runs (Sharetribe doesn't support user deletion).

Imported workflows and execution history remain in the n8n instance after tests complete so you can inspect results at `http://localhost:5678`.

#### E2E files

| File                                          | Purpose                                        |
| --------------------------------------------- | ---------------------------------------------- |
| `scripts/runE2eTests.ts`                      | Test runner script                             |
| `scripts/runE2eTests.config.template.yaml`    | Config template (copy and fill in credentials) |
| `workflows/e2e-tests/<resource>/<operation>/` | Workflow JSON files                            |

### Output Schemas

Output schemas provide n8n with type information for [schema preview](https://docs.n8n.io/data/schema-preview/) in the input pane of the next node without requiring pinned data.

```bash
npm run generate:schemas
```

Schemas are also regenerated automatically on `npm run build`. Generated files live in `nodes/Sharetribe/__schema__/v1/` and are copied to `dist/` during build.

The schemas are auto-generated from the TypeScript interfaces in `Sharetribe.types.ts`. The generator reads the raw JSON:API types, resolves `$ref`s, then flattens them the same way `flattenSharetribeResponse` does at runtime (attributes to root, relationships to `{ id, type }` refs). Output uses flat JSON Schema matching the convention used by n8n's built-in nodes.

To add a new schema, add the TypeScript interface to `Sharetribe.types.ts` and add the resource/operation mapping to `scripts/generateSchemas.ts`.

### Testing Credential Validation

The `testedBy` credential test methods (in `credentialTest.ts`) are **not invoked** by `n8n-node dev`. This is because `n8n-node dev` symlinks the package, bypassing the metadata registration that n8n uses to discover credential test methods.

To manually verify credential tests, pack and install into a standalone n8n instance:

```bash
# 1. Build and generate metadata (requires a local n8n repo checkout)
npm run build
node ../n8n/packages/core/bin/generate-metadata

# 2. Pack and install as a community node
npm pack
cd ~/.n8n/nodes
npm install /absolute/path/to/n8n-nodes-sharetribe-0.1.3.tgz

# 3. Run a standalone n8n instance
npx n8n
# Or with debug logging:
N8N_LOG_LEVEL=debug npx n8n

# 4. Clean up when done
cd ~/.n8n/nodes
npm uninstall n8n-nodes-sharetribe
```

**Why `~/.n8n/nodes`?** n8n discovers community nodes by scanning `node_modules` inside
its user data folder. The default user data folder is `~/.n8n`, and n8n looks for community
node packages in `~/.n8n/nodes/node_modules/`. Installing into `~/.n8n` directly would
place the package at `~/.n8n/node_modules/` which is the wrong location. The `nodes`
subdirectory is where n8n's `LazyPackageDirectoryLoader` expects to find `n8n-nodes-*`
packages.

---

## Using n8n CLI commands

When `npm run dev` is running, you may need to run [n8n CLI](https://docs.n8n.io/hosting/cli-commands/) commands against the same n8n instance.
This allows importing workflows, running workflows etc.
Use the `npm run n8n` script which automatically points to the correct n8n instance:

```bash
# Import workflows
npm run import:workflows

# Execute workflow by its ID
npm run n8n execute --id <ID>

# Or run any n8n CLI command
npm run n8n -- export:workflow --all --output=./backup
npm run n8n -- user:list
npm run n8n -- credential:list
```

The `npm run n8n` script:

- Uses `npx n8n@latest` (same version as `n8n-node dev`)
- Sets `N8N_USER_FOLDER=$HOME/.n8n-node-cli` (same data folder as `n8n-node dev`)
- Ensures all CLI commands work with your dev instance data

## Linting

```bash
npm run lint
```

Validates code style, n8n node conventions, and common integration issues.

Fix issues automatically:

```bash
npm run lint:fix
```

## Publishing

```bash
npm run release
```

Runs [release-it](https://github.com/release-it/release-it) to handle the complete release process: version bump, build, lint, changelog, git tag, GitHub release, and npm publish.

---

## Where data is stored

When running `npm run dev`, n8n-node-cli stores all data at:

```
~/.n8n-node-cli/
├── .n8n/                  # n8n instance data
│   ├── database.sqlite    # workflows, credentials, execution history
│   ├── config              # encryption key
│   └── custom/
│       └── node_modules/  # symlink to this package
└── ...                    # CLI cache and other data
```

### Custom user folder

Specify a custom location for n8n user data:

```bash
npm run dev -- --custom-user-folder /path/to/custom/folder
```

**Do not** set this to a folder inside this repository — `n8n-node dev` creates a symlink back to this package inside the data folder, which would create a circular symlink.

### Clearing cache / node not appearing

```bash
rm -rf ~/.n8n-node-cli/.n8n/custom
npm run dev
```

### Resetting development data

```bash
rm -rf ~/.n8n-node-cli
```

This removes all n8n-node-cli data including the database, credentials, and workflows.
