/**
 * Sharetribe E2E Test Runner
 *
 * Runs workflow-based E2E tests against a live Sharetribe marketplace.
 *
 * How it works:
 *   1. Reads config from scripts/runE2eTests.config.yaml (credentials, test users)
 *   2. Auto-creates fixture resources if not explicitly set in config:
 *      - Looks up / creates test users via Marketplace + Integration API
 *      - Creates a published listing authored by the provider user
 *      - Creates a transaction via customer auth on that listing
 *   3. Creates an n8n credential for the Sharetribe Integration API
 *   4. Discovers workflow JSON files in workflows/e2e-tests/<resource>/<operation>/
 *   5. Orders workflows: read-only operations first, then mutating ones
 *   6. For each workflow: replaces {{FIXTURE_*}} placeholders, imports into n8n, executes
 *   7. Leaves workflows and executions in n8n for inspection via the UI
 *
 * Test users:
 *   - testProvider: Acts as the listing author / provider. Used as FIXTURE_USER_ID.
 *     Auto-created and approved if not found in the marketplace.
 *   - testUser: Acts as the customer who creates transactions on the provider's listing.
 *     Auto-created and approved if not found in the marketplace.
 *     Sharetribe requires a different user than the listing author to create transactions.
 *
 * Most fixture IDs (userId, listingId, transactionId, pendingUserId)
 * are auto-created. closedListingId is captured from the listing/create
 * workflow output. stockReservationId must be manually supplied in config.
 *
 * Prerequisites:
 *   - n8n dev instance running (`npm run dev`) — workflows and executions remain
 *     in the UI for inspection after tests complete
 *   - Config file with valid Sharetribe credentials and test user emails/passwords
 *
 * Usage: npm run test:e2e
 */

/* eslint-disable */
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as readline from 'readline';
import * as yaml from 'js-yaml';

// ─── Types ───────────────────────────────────────────────────────────────────

interface TestUserConfig {
	email: string;
	password: string;
	firstName: string;
	lastName: string;
}

interface Config {
	integrationApi: {
		clientId: string;
		clientSecret: string;
	};
	marketplaceApi: {
		clientId: string;
	};
	testProvider: TestUserConfig;
	testUser: TestUserConfig;
	fixtures: {
		userId: string;
		listingId: string;
		transactionId: string;
		pendingUserId: string;
		unverifiedUserId: string;
		unverifiedUserEmail: string;
		stockReservationId?: string;
		closedListingId?: string;
		purchaseListingId?: string;
	};
	marketplace: {
		// Derived by validateEnvironment() from the asset data:
		negotiationListingType: string;
		negotiationProcessAlias: string;
		negotiationInitialTransition: string;
		negotiationDeclineTransition: string;
		isPrivate: boolean;
		purchaseListingType: string;
		purchaseProcessAlias: string;
		purchaseInitialTransition: string;
	};
	n8n: {
		userFolder: string;
	};
}

interface WorkflowFile {
	path: string;
	resource: string;
	operation: string;
	name: string;
}

interface TestResult {
	workflow: WorkflowFile;
	success: boolean;
	output: string;
	skipped?: boolean;
	skipReason?: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const PROJECT_DIR = path.resolve(__dirname, '..');
const E2E_DIR = path.resolve(PROJECT_DIR, 'workflows/e2e-tests');
const CONFIG_PATH = path.resolve(__dirname, 'runE2eTests.config.yaml');
const SHARETRIBE_INTEG_API = 'https://flex-integ-api.sharetribe.com';
const SHARETRIBE_MARKETPLACE_API = 'https://flex-api.sharetribe.com';
const ASSET_CDN_BASE = 'https://cdn.st-api.com/v1/assets/pub';
const N8N_IMAGE = 'n8nio/n8n';
const N8N_PORT = 5678;
const PKG_VERSION = (
	JSON.parse(fs.readFileSync(path.resolve(__dirname, '../package.json'), 'utf-8')) as {
		version: string;
	}
).version;

interface ListingTypeInfo {
	id: string;
	label: string;
	transactionProcess: {
		name: string;
		alias: string;
	};
}

// ─── n8n dev server guard ────────────────────────────────────────────────────

/** Check if the n8n dev server is running */
function isN8nRunning(): boolean {
	try {
		return execSync(`lsof -ti:${N8N_PORT}`, { encoding: 'utf-8' }).trim().length > 0;
	} catch {
		return false;
	}
}

/** Prompt yes/no on stdin */
function prompt(question: string): Promise<boolean> {
	const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
	return new Promise((resolve) => {
		rl.question(question, (answer) => {
			rl.close();
			resolve(answer.trim().toLowerCase().startsWith('y'));
		});
	});
}

/**
 * The Docker containers and dev server share the same SQLite database.
 * Running both simultaneously causes lock errors, so the dev server must be stopped first.
 */
async function ensureN8nStopped(): Promise<void> {
	if (!isN8nRunning()) return;

	console.log(`  n8n dev server is running on port ${N8N_PORT}.`);
	console.log(
		'  It must be stopped — Docker and dev server cannot share the SQLite DB simultaneously.\n',
	);

	const ok = await prompt('  Kill the running instance? (y/N) ');
	if (!ok) {
		console.error('\n  Aborted. Stop n8n first: npm run kill:n8n\n');
		process.exit(1);
	}

	execSync(`lsof -ti:${N8N_PORT} | xargs kill -9 2>/dev/null || true`, { encoding: 'utf-8' });
	execSync('sleep 1');
	console.log('  Stopped.\n');
}

// ─── Config ─────────────────────────────────────────────────────────────────

/** Load and validate the YAML config file, exit if missing or incomplete */
function loadConfig(): Config {
	if (!fs.existsSync(CONFIG_PATH)) {
		console.error(
			`\nConfig file not found: ${CONFIG_PATH}\n` +
				`Copy the template and fill in your values:\n` +
				`  cp scripts/runE2eTests.config.template.yaml scripts/runE2eTests.config.yaml\n`,
		);
		process.exit(1);
	}

	const raw = fs.readFileSync(CONFIG_PATH, 'utf-8');
	const config = yaml.load(raw) as Config;

	// Validate required fields — only the API credentials are mandatory
	const required: Array<[string, unknown]> = [
		['integrationApi.clientId', config.integrationApi?.clientId],
		['integrationApi.clientSecret', config.integrationApi?.clientSecret],
		['marketplaceApi.clientId', config.marketplaceApi?.clientId],
	];

	const missing = required.filter(([, val]) => !val).map(([key]) => key);
	if (missing.length > 0) {
		console.error(`\nMissing required config values:\n  ${missing.join('\n  ')}\n`);
		process.exit(1);
	}

	// Default test user accounts
	config.testProvider = config.testProvider || ({} as TestUserConfig);
	config.testProvider.email = config.testProvider.email || 'e2e-provider@test.example.com';
	config.testProvider.password = config.testProvider.password || 'Test1234!';
	config.testProvider.firstName = config.testProvider.firstName || 'E2E';
	config.testProvider.lastName = config.testProvider.lastName || 'Provider';

	config.testUser = config.testUser || ({} as TestUserConfig);
	config.testUser.email = config.testUser.email || 'e2e-customer@test.example.com';
	config.testUser.password = config.testUser.password || 'Test1234!';
	config.testUser.firstName = config.testUser.firstName || 'E2E';
	config.testUser.lastName = config.testUser.lastName || 'Customer';

	// Marketplace runtime state — all derived by validateEnvironment() from the asset data.
	config.marketplace = {
		negotiationListingType: '',
		negotiationProcessAlias: '',
		negotiationInitialTransition: 'transition/request-quote',
		negotiationDeclineTransition: 'transition/operator-reject-request',
		isPrivate: false,
		purchaseListingType: '',
		purchaseProcessAlias: '',
		purchaseInitialTransition: 'transition/request-payment',
	};

	// Ensure fixtures object exists
	config.fixtures = config.fixtures || ({} as Config['fixtures']);

	return config;
}

// ─── n8n CLI (Docker) ────────────────────────────────────────────────────────

/**
 * Resolve the n8n data directory on the host.
 * n8n-node dev stores data at <userFolder>/.n8n/ (e.g. ~/.n8n-node-cli/.n8n/).
 * We mount this into Docker at /home/node/.n8n so both share the same database.
 */
function getN8nDataDir(config: Config): string {
	const userFolder =
		config.n8n?.userFolder?.replace('~', process.env.HOME ?? '~') ??
		`${process.env.HOME}/.n8n-node-cli`;
	return path.join(userFolder, '.n8n');
}

/** Run an n8n CLI command inside a disposable Docker container */
function n8nExec(args: string, config: Config): string {
	const dataDir = getN8nDataDir(config);
	const cmd = [
		'docker run --rm',
		`-v "${dataDir}:/home/node/.n8n"`,
		'-v /tmp:/tmp',
		// Mount project dir so the symlink in custom/node_modules resolves inside the container
		`-v "${PROJECT_DIR}:${PROJECT_DIR}:ro"`,
		'-e N8N_RUNNERS_MODE=external',
		'-e N8N_RUNNERS_AUTH_TOKEN=e2e',
		N8N_IMAGE,
		args,
	].join(' ');
	try {
		return execSync(cmd, {
			encoding: 'utf-8',
			timeout: 120_000,
			stdio: ['pipe', 'pipe', 'pipe'],
		}).trim();
	} catch (err: unknown) {
		const e = err as { stdout?: string; stderr?: string; message?: string };
		const stderr = e.stderr ?? '';
		const stdout = e.stdout ?? '';
		// The Python task runner error causes a non-zero exit even when the command succeeds.
		// If stdout contains success indicators, return it instead of throwing.
		if (stdout.includes('Execution was successful') || stdout.includes('Successfully imported')) {
			return stdout.trim();
		}
		throw new Error(`n8n command failed: ${args}\n${stderr}\n${stdout}`);
	}
}

// ─── Sharetribe auth tokens ─────────────────────────────────────────────────

/** Get an anonymous Marketplace API token (for user signup) */
async function getAnonymousToken(config: Config): Promise<string> {
	const res = await fetch(`${SHARETRIBE_MARKETPLACE_API}/v1/auth/token`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
		body: new URLSearchParams({
			client_id: config.marketplaceApi.clientId,
			grant_type: 'client_credentials',
			scope: 'public-read',
		}),
	});

	if (!res.ok) {
		throw new Error(`Failed to get anonymous token: ${res.status} ${await res.text()}`);
	}

	const data = (await res.json()) as { access_token: string };
	return data.access_token;
}

/** Get an Integration API token (for operator-level actions) */
async function getIntegrationToken(config: Config): Promise<string> {
	const res = await fetch(`${SHARETRIBE_INTEG_API}/v1/auth/token`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
		body: new URLSearchParams({
			client_id: config.integrationApi.clientId,
			client_secret: config.integrationApi.clientSecret,
			grant_type: 'client_credentials',
			scope: 'integ',
		}),
	});

	if (!res.ok) {
		throw new Error(`Failed to get integration token: ${res.status} ${await res.text()}`);
	}

	const data = (await res.json()) as { access_token: string };
	return data.access_token;
}

/** Get a customer token via resource owner password grant */
async function getCustomerToken(config: Config): Promise<string> {
	const res = await fetch(`${SHARETRIBE_MARKETPLACE_API}/v1/auth/token`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
		body: new URLSearchParams({
			client_id: config.marketplaceApi.clientId,
			grant_type: 'password',
			username: config.testUser.email,
			password: config.testUser.password,
			scope: 'user',
		}),
	});

	if (!res.ok) {
		throw new Error(`Failed to get customer token: ${res.status} ${await res.text()}`);
	}

	const data = (await res.json()) as { access_token: string };
	return data.access_token;
}

// ─── Sharetribe API helpers ─────────────────────────────────────────────────

/** Try to log in as a user and get their ID via current_user/show. Returns ID or null. */
async function getUserIdByLogin(
	userConfig: TestUserConfig,
	config: Config,
): Promise<string | null> {
	// Try password grant
	const tokenRes = await fetch(`${SHARETRIBE_MARKETPLACE_API}/v1/auth/token`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
		body: new URLSearchParams({
			client_id: config.marketplaceApi.clientId,
			grant_type: 'password',
			username: userConfig.email,
			password: userConfig.password,
			scope: 'user',
		}),
	});

	if (!tokenRes.ok) return null;

	const { access_token } = (await tokenRes.json()) as { access_token: string };

	// Get current user to retrieve their UUID
	const userRes = await fetch(`${SHARETRIBE_MARKETPLACE_API}/v1/api/current_user/show`, {
		headers: { Authorization: `Bearer ${access_token}` },
	});

	if (!userRes.ok) return null;

	const data = (await userRes.json()) as { data: { id: string } };
	return data.data.id;
}

/** Create a new user via Marketplace API signup, then approve via Integration API. Returns user ID. */
async function createUser(
	userConfig: TestUserConfig,
	anonymousToken: string,
	integrationToken: string,
	config: Config,
): Promise<string> {
	// Create user via Marketplace API
	const createRes = await fetch(`${SHARETRIBE_MARKETPLACE_API}/v1/api/current_user/create`, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${anonymousToken}`,
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({
			email: userConfig.email,
			password: userConfig.password,
			firstName: userConfig.firstName,
			lastName: userConfig.lastName,
		}),
	});

	if (!createRes.ok) {
		const body = await createRes.text();
		throw new Error(`Failed to create user ${userConfig.email}: ${createRes.status} ${body}`);
	}

	// Log in as the new user to get their UUID
	const userId = await getUserIdByLogin(userConfig, config);
	if (!userId) {
		throw new Error(`Created user ${userConfig.email} but could not log in to get their ID`);
	}

	// Approve via Integration API
	const approveRes = await fetch(`${SHARETRIBE_INTEG_API}/v1/integration_api/users/approve`, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${integrationToken}`,
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({ id: userId }),
	});

	if (!approveRes.ok) {
		// User may already be approved (e.g. marketplace auto-approves) — not fatal
		console.log(`  Warning: could not approve user ${userConfig.email}: ${approveRes.status}`);
	}

	return userId;
}

/** Look up user by logging in; if not found, create + approve. Returns user ID. */
async function ensureUser(
	userConfig: TestUserConfig,
	anonymousToken: string,
	integrationToken: string,
	config: Config,
): Promise<string> {
	const existing = await getUserIdByLogin(userConfig, config);
	if (existing) {
		console.log(`  Found existing user: ${userConfig.email} (${existing})`);
		return existing;
	}

	console.log(`  Creating user: ${userConfig.email}...`);
	const userId = await createUser(userConfig, anonymousToken, integrationToken, config);
	console.log(`  Created and approved user: ${userConfig.email} (${userId})`);
	return userId;
}

/** Create a pendingApproval listing via Integration API. Returns listing ID. */
async function createTestListing(
	authorId: string,
	listingType: string,
	integrationToken: string,
): Promise<string> {
	const res = await fetch(`${SHARETRIBE_INTEG_API}/v1/integration_api/listings/create`, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${integrationToken}`,
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({
			authorId,
			title: 'E2E Test Listing',
			publicData: { listingType },
			state: 'pendingApproval',
			availabilityPlan: {
				type: 'availability-plan/day',
				entries: [
					{ dayOfWeek: 'mon', seats: 1 },
					{ dayOfWeek: 'tue', seats: 1 },
					{ dayOfWeek: 'wed', seats: 1 },
					{ dayOfWeek: 'thu', seats: 1 },
					{ dayOfWeek: 'fri', seats: 1 },
					{ dayOfWeek: 'sat', seats: 1 },
					{ dayOfWeek: 'sun', seats: 1 },
				],
			},
		}),
	});

	if (!res.ok) {
		const body = await res.text();
		throw new Error(`Failed to create test listing: ${res.status} ${body}`);
	}

	const data = (await res.json()) as { data: { id: string } };
	return data.data.id;
}

/** Initialize stock on a listing via Integration API (compare_and_set with oldTotal=null) */
async function initializeListingStock(listingId: string, integrationToken: string): Promise<void> {
	const res = await fetch(`${SHARETRIBE_INTEG_API}/v1/integration_api/stock/compare_and_set`, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${integrationToken}`,
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({
			listingId,
			oldTotal: null,
			newTotal: 10,
		}),
	});

	if (!res.ok) {
		const body = await res.text();
		console.log(`  Warning: could not initialize stock: ${res.status} ${body}`);
	}
}

/** Approve a listing via Integration API (transitions from pendingApproval → published) */
async function approveListing(listingId: string, integrationToken: string): Promise<void> {
	const res = await fetch(`${SHARETRIBE_INTEG_API}/v1/integration_api/listings/approve`, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${integrationToken}`,
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({ id: listingId }),
	});

	if (!res.ok) {
		const body = await res.text();
		throw new Error(`Failed to approve listing: ${res.status} ${body}`);
	}
}

/** Create a negotiation transaction via customer auth on a listing. Returns transaction ID. */
async function createNegotiationTransaction(config: Config, listingId: string): Promise<string> {
	const token = await getCustomerToken(config);

	const res = await fetch(`${SHARETRIBE_MARKETPLACE_API}/v1/api/transactions/initiate`, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${token}`,
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({
			processAlias: config.marketplace.negotiationProcessAlias,
			transition: config.marketplace.negotiationInitialTransition,
			params: { listingId },
		}),
	});

	if (!res.ok) {
		const body = await res.text();
		throw new Error(`Failed to create transaction: ${res.status} ${body}`);
	}

	const data = (await res.json()) as { data: { id: string } };
	return data.data.id;
}

/** Create a purchase transaction to generate a stock reservation. Returns transaction + reservation IDs. */
async function createPurchaseTransaction(
	config: Config,
	listingId: string,
): Promise<{ transactionId: string; stockReservationId: string }> {
	const token = await getCustomerToken(config);

	const res = await fetch(`${SHARETRIBE_MARKETPLACE_API}/v1/api/transactions/initiate`, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${token}`,
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({
			processAlias: config.marketplace.purchaseProcessAlias,
			transition: config.marketplace.purchaseInitialTransition,
			params: {
				listingId,
				protectedData: {},
				stockReservationQuantity: 1,
				lineItems: [
					{
						code: 'line-item/units',
						unitPrice: { amount: 1000, currency: 'USD' },
						quantity: 1,
					},
				],
			},
		}),
	});

	if (!res.ok) {
		const body = await res.text();
		throw new Error(`Failed to create purchase transaction: ${res.status} ${body}`);
	}

	const data = (await res.json()) as { data: { id: string } };
	const transactionId = data.data.id;

	// Query via Integration API to capture the stock reservation ID
	const integrationToken = await getIntegrationToken(config);
	const txnRes = await fetch(
		`${SHARETRIBE_INTEG_API}/v1/integration_api/transactions/show?id=${transactionId}&include=stockReservation`,
		{ headers: { Authorization: `Bearer ${integrationToken}` } },
	);

	let stockReservationId = '';
	if (txnRes.ok) {
		const txnData = (await txnRes.json()) as {
			included?: Array<{ id: string; type: string }>;
		};
		const reservation = txnData.included?.find((item) => item.type === 'stockReservation');
		if (reservation) {
			stockReservationId = reservation.id;
		}
	}

	return { transactionId, stockReservationId };
}

// ─── Environment validation ─────────────────────────────────────────────────

/**
 * Validate the Sharetribe environment before any fixtures or tests run.
 * Checks API tokens, listing types, and access control.
 * Exits with a clear diagnostic if anything is wrong.
 */
async function validateEnvironment(config: Config): Promise<void> {
	console.log('Validating environment...');

	// Integration API token
	try {
		await getIntegrationToken(config);
	} catch (err) {
		console.error('\n  Integration API token failed.');
		console.error(`  ${(err as Error).message}`);
		console.error('  Check integrationApi.clientId and clientSecret in your config.\n');
		process.exit(1);
	}

	// Marketplace API token
	try {
		await getAnonymousToken(config);
	} catch (err) {
		console.error('\n  Marketplace API token failed.');
		console.error(`  ${(err as Error).message}`);
		console.error('  Check marketplaceApi.clientId in your config.\n');
		process.exit(1);
	}

	// Listing types from CDN
	const clientId = config.marketplaceApi.clientId;
	let listingTypes: ListingTypeInfo[];
	try {
		const url = `${ASSET_CDN_BASE}/${clientId}/a/latest/?assets=listings/listing-types.json`;
		const res = await fetch(url, { headers: { Accept: 'application/json' } });

		if (!res.ok) {
			throw new Error(`HTTP ${res.status}: ${await res.text()}`);
		}

		const json = (await res.json()) as {
			data: Array<{ attributes: { data: { listingTypes: ListingTypeInfo[] } } }>;
		};
		listingTypes = json.data?.[0]?.attributes?.data?.listingTypes ?? [];
	} catch (err) {
		console.error('\n  Failed to fetch listing types.');
		console.error(`  ${(err as Error).message}`);
		console.error('  Check that your marketplaceApi.clientId is correct.\n');
		process.exit(1);
	}

	if (listingTypes.length === 0) {
		console.error('\n  No listing types found in your marketplace.');
		console.error('  Go to Console → Build → Listing types and create at least one.\n');
		process.exit(1);
	}

	// Match default-negotiation process
	const match = listingTypes.find((lt) =>
		lt.transactionProcess.alias.startsWith('default-negotiation/'),
	);

	if (!match) {
		const available = listingTypes.map((lt) => `    - ${lt.transactionProcess.alias}`).join('\n');
		console.error(`\n  No listing type with default-negotiation process found.`);
		console.error(`  Available:\n${available}\n`);
		process.exit(1);
	}

	config.marketplace.negotiationListingType = match.id;
	config.marketplace.negotiationProcessAlias = match.transactionProcess.alias;

	// Access control (private marketplace)
	let acData: any;
	try {
		const acUrl = `${ASSET_CDN_BASE}/${clientId}/a/latest/?assets=general/access-control.json`;
		const acRes = await fetch(acUrl, { headers: { Accept: 'application/json' } });

		if (!acRes.ok) {
			throw new Error(`HTTP ${acRes.status}: ${await acRes.text()}`);
		}

		const acJson = (await acRes.json()) as any;
		acData = acJson?.data?.[0]?.attributes?.data;

		if (!acData) {
			console.error('\n  Failed to read access control settings.');
			console.error(`  Unexpected response: ${JSON.stringify(acJson).slice(0, 500)}\n`);
			process.exit(1);
		}

		config.marketplace.isPrivate = acData?.marketplace?.private === true;
	} catch (err) {
		console.error('\n  Failed to fetch access control settings.');
		console.error(`  ${(err as Error).message}\n`);
		process.exit(1);
	}

	// Require approval to join (needed for user/approve test)
	const requiresApproval = acData?.users?.requireApprovalToJoin === true;
	if (!requiresApproval) {
		console.error('\n  "Require approval to join" is not enabled.');
		console.error('  Enable it in Console → Build → General → Access control.\n');
		process.exit(1);
	}

	// Match default-purchase process (needed for stock/getReservation test)
	const purchaseMatch = listingTypes.find((lt) =>
		lt.transactionProcess.alias.startsWith('default-purchase/'),
	);

	if (!purchaseMatch) {
		console.error('\n  No listing type with default-purchase process found.');
		console.error('  Create a listing type in Console with the default-purchase process');
		console.error('  (finite stock / multiple items) to enable stock reservation tests.\n');
		process.exit(1);
	}

	config.marketplace.purchaseListingType = purchaseMatch.id;
	config.marketplace.purchaseProcessAlias = purchaseMatch.transactionProcess.alias;

	console.log('  Environment validated.\n');
}

// ─── Fixture setup ──────────────────────────────────────────────────────────

/** Auto-create fixture resources (users, listing, transaction) if not set in config */
async function setupFixtures(config: Config): Promise<void> {
	console.log('Setting up fixtures...\n');

	const anonymousToken = await getAnonymousToken(config);
	const integrationToken = await getIntegrationToken(config);

	// Ensure provider user
	if (!config.fixtures.userId) {
		console.log('  Ensuring provider user...');
		config.fixtures.userId = await ensureUser(
			config.testProvider,
			anonymousToken,
			integrationToken,
			config,
		);
	} else {
		console.log(`  Using configured userId: ${config.fixtures.userId}`);
	}

	// Ensure customer user — doubles as the pendingUserId for the user/approve test.
	// Created without approval on first run; on re-runs they're already approved.
	if (!config.fixtures.pendingUserId) {
		const existingId = await getUserIdByLogin(config.testUser, config);
		if (existingId) {
			console.log(`  Found existing customer: ${config.testUser.email} (${existingId})`);
			const stateRes = await fetch(
				`${SHARETRIBE_INTEG_API}/v1/integration_api/users/show?id=${existingId}`,
				{ headers: { Authorization: `Bearer ${integrationToken}` } },
			);
			if (stateRes.ok) {
				const stateData = (await stateRes.json()) as {
					data: { attributes: { state: string } };
				};
				if (stateData.data.attributes.state === 'pendingApproval') {
					config.fixtures.pendingUserId = existingId;
					console.log(`  Customer is pending — user/approve workflow will approve them.`);
				} else {
					console.log(
						`  Customer already approved (previous run). user/approve test will be skipped.`,
					);
				}
			}
		} else {
			console.log(`  Creating customer (pendingApproval): ${config.testUser.email}...`);
			const createRes = await fetch(`${SHARETRIBE_MARKETPLACE_API}/v1/api/current_user/create`, {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${anonymousToken}`,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					email: config.testUser.email,
					password: config.testUser.password,
					firstName: config.testUser.firstName,
					lastName: config.testUser.lastName,
				}),
			});
			if (!createRes.ok) {
				throw new Error(`Failed to create customer: ${createRes.status} ${await createRes.text()}`);
			}
			const newId = await getUserIdByLogin(config.testUser, config);
			if (!newId) {
				throw new Error('Created customer but could not log in to get their ID');
			}
			config.fixtures.pendingUserId = newId;
			console.log(`  Created customer: ${newId} (pendingApproval)`);
		}
	} else {
		console.log(`  Using configured pendingUserId: ${config.fixtures.pendingUserId}`);
	}

	// Create a fresh unverified user for the user/verifyEmail workflow.
	// emailVerified can never be flipped back to false once verified, so we always
	// sign up a brand-new user with a unique email instead of reusing one.
	console.log('  Creating unverified user for verifyEmail test...');
	const unverifiedEmail = `e2e-verify-${Date.now()}@test.example.com`;
	const unverifiedUserConfig: TestUserConfig = {
		email: unverifiedEmail,
		password: 'Test1234!',
		firstName: 'E2E',
		lastName: 'VerifyEmail',
	};
	config.fixtures.unverifiedUserId = await createUser(
		unverifiedUserConfig,
		anonymousToken,
		integrationToken,
		config,
	);
	config.fixtures.unverifiedUserEmail = unverifiedEmail;
	console.log(`  Created unverified user: ${config.fixtures.unverifiedUserId} (${unverifiedEmail})`);

	// Create listing as pendingApproval — the listing/approve workflow will publish it
	if (!config.fixtures.listingId) {
		console.log('  Creating test negotiation listing (pendingApproval)...');
		config.fixtures.listingId = await createTestListing(
			config.fixtures.userId,
			config.marketplace.negotiationListingType,
			integrationToken,
		);
		console.log(`  Created listing: ${config.fixtures.listingId}`);

		// Initialize stock so stock tests can adjust/compareAndSet
		console.log('  Initializing stock...');
		await initializeListingStock(config.fixtures.listingId, integrationToken);
		console.log('  Stock initialized.');
	} else {
		console.log(`  Using configured listingId: ${config.fixtures.listingId}`);
	}

	// Create purchase listing (approved + stock initialized) for stock reservation test.
	// The purchase transaction is created later (after the customer is approved).
	if (!config.fixtures.purchaseListingId) {
		console.log('  Creating purchase listing...');
		config.fixtures.purchaseListingId = await createTestListing(
			config.fixtures.userId,
			config.marketplace.purchaseListingType,
			integrationToken,
		);
		console.log(`  Created purchase listing: ${config.fixtures.purchaseListingId}`);

		console.log('  Approving purchase listing...');
		await approveListing(config.fixtures.purchaseListingId, integrationToken);
		console.log('  Purchase listing approved.');

		console.log('  Initializing purchase listing stock...');
		await initializeListingStock(config.fixtures.purchaseListingId, integrationToken);
		console.log('  Stock initialized.');
	} else {
		console.log(`  Using configured purchaseListingId: ${config.fixtures.purchaseListingId}`);
	}

	console.log('');
}

// ─── Credential management ──────────────────────────────────────────────────

/** Import the Sharetribe credential into n8n via import:credentials */
function setupCredential(config: Config): void {
	console.log('Setting up Sharetribe credential in n8n...');

	const credential = [
		{
			id: 'sharetribe-e2e',
			name: 'Sharetribe E2E',
			type: 'sharetribeOAuth2Api',
			data: {
				clientId: config.integrationApi.clientId,
				clientSecret: config.integrationApi.clientSecret,
				marketplaceApiClientId: config.marketplaceApi.clientId,
				planType: 'extend',
				environment: 'production',
				baseUrl: SHARETRIBE_INTEG_API,
				marketplaceApiBaseUrl: SHARETRIBE_MARKETPLACE_API,
				accessTokenUrl: `${SHARETRIBE_INTEG_API}/v1/auth/token`,
				scope: 'integ',
			},
		},
	];

	const tmpFile = path.join(os.tmpdir(), `.n8n-e2e-cred-${process.pid}.json`);

	const cleanup = () => {
		try {
			fs.unlinkSync(tmpFile);
		} catch {}
	};

	// Clean up on unexpected exit
	process.on('exit', cleanup);

	try {
		fs.writeFileSync(tmpFile, JSON.stringify(credential), { mode: 0o600 });
		n8nExec(`import:credentials --input="${tmpFile}"`, config);
		console.log('  Credential imported.\n');
	} catch {
		console.log('  Credential import failed (may already exist), continuing...\n');
	} finally {
		cleanup();
		process.removeListener('exit', cleanup);
	}
}

// ─── Workflow discovery ─────────────────────────────────────────────────────

/** Walk workflows/e2e-tests/<resource>/<operation>/*.json and return all discovered workflows */
function discoverWorkflows(): WorkflowFile[] {
	const workflows: WorkflowFile[] = [];

	const resources = fs.readdirSync(E2E_DIR, { withFileTypes: true }).filter((d) => d.isDirectory());

	for (const resourceDir of resources) {
		const resourcePath = path.join(E2E_DIR, resourceDir.name);
		const operations = fs
			.readdirSync(resourcePath, { withFileTypes: true })
			.filter((d) => d.isDirectory());

		for (const opDir of operations) {
			const opPath = path.join(resourcePath, opDir.name);
			const jsonFiles = fs
				.readdirSync(opPath)
				.filter((f) => f.endsWith('.json'))
				.sort();

			for (const jsonFile of jsonFiles) {
				const fullPath = path.join(opPath, jsonFile);
				const content = JSON.parse(fs.readFileSync(fullPath, 'utf-8'));
				workflows.push({
					path: fullPath,
					resource: resourceDir.name,
					operation: opDir.name,
					name: content.name ?? jsonFile,
				});
			}
		}
	}

	return workflows;
}

/** Replace {{FIXTURE_*}} placeholders in workflow JSON with real config values */
function replacePlaceholders(
	json: string,
	config: Config,
	extras: Record<string, string> = {},
): string {
	const replacements: Record<string, string> = {
		'{{FIXTURE_USER_ID}}': config.fixtures.userId,
		'{{FIXTURE_LISTING_ID}}': config.fixtures.listingId,
		'{{FIXTURE_TRANSACTION_ID}}': config.fixtures.transactionId,
		'{{FIXTURE_PENDING_USER_ID}}': config.fixtures.pendingUserId,
		'{{FIXTURE_UNVERIFIED_USER_ID}}': config.fixtures.unverifiedUserId,
		'{{FIXTURE_UNVERIFIED_USER_EMAIL}}': config.fixtures.unverifiedUserEmail,
		'{{FIXTURE_STOCK_RESERVATION_ID}}': config.fixtures.stockReservationId ?? '',
		'{{FIXTURE_CLOSED_LISTING_ID}}': config.fixtures.closedListingId ?? '',
		'{{MARKETPLACE_INITIAL_TRANSITION}}': config.marketplace.negotiationInitialTransition,
		'{{MARKETPLACE_DECLINE_TRANSITION}}': config.marketplace.negotiationDeclineTransition,
		...extras,
	};

	let result = json;
	for (const [placeholder, value] of Object.entries(replacements)) {
		result = result.split(placeholder).join(value);
	}
	return result;
}

/** Check if a workflow should be skipped due to missing fixture IDs or environment constraints */
function shouldSkip(workflow: WorkflowFile, config: Config): string | null {
	if (workflow.resource === 'transaction' && !config.fixtures.transactionId) {
		return 'No transactionId yet (listing/approve may have failed)';
	}

	if (
		workflow.resource === 'listing' &&
		workflow.operation === 'open' &&
		!config.fixtures.closedListingId
	) {
		return 'No closedListingId — listing/create workflow may have failed';
	}

	if (
		workflow.resource === 'stock' &&
		workflow.operation === 'getReservation' &&
		!config.fixtures.stockReservationId
	) {
		return 'No stockReservationId configured — set it in config from a real purchase transaction';
	}

	if (
		workflow.resource === 'listing' &&
		workflow.operation === 'getTimeslots' &&
		config.marketplace.isPrivate
	) {
		return 'Marketplace is private — timeslot API requires anonymous access';
	}

	return null;
}

// ─── Workflow import/execute/cleanup ─────────────────────────────────────────

/** Import a workflow JSON string into n8n (upserts by fixed ID) and return the workflow ID */
function importWorkflow(workflowJson: string, config: Config): string {
	const parsed = JSON.parse(workflowJson);
	const fixedId = parsed.id as string | undefined;

	// Add version tag from package.json
	const tags = (parsed.tags ?? []) as Array<{ name: string }>;
	const versionTag = `v${PKG_VERSION}`;
	if (!tags.some((t) => t.name === versionTag)) {
		tags.push({ name: versionTag });
		parsed.tags = tags;
	}

	const tmpFile = path.join(os.tmpdir(), `.n8n-e2e-wf-${process.pid}.json`);
	fs.writeFileSync(tmpFile, JSON.stringify(parsed, null, '\t'), { mode: 0o600 });

	try {
		const output = n8nExec(`import:workflow --input="${tmpFile}"`, config);
		// Prefer the fixed ID from the JSON; fall back to parsing n8n output
		if (fixedId) return fixedId;
		const idMatch = output.match(/"id"\s*:\s*"([^"]+)"/);
		return idMatch?.[1] ?? '';
	} finally {
		fs.unlinkSync(tmpFile);
	}
}

/** Execute an imported workflow by ID and return pass/fail with output */
function executeWorkflow(workflowId: string, config: Config): { success: boolean; output: string } {
	try {
		const output = n8nExec(`execute --id="${workflowId}"`, config);
		return { success: true, output };
	} catch (err: unknown) {
		const e = err as Error;
		return { success: false, output: e.message };
	}
}

// ─── Execution order ─────────────────────────────────────────────────────────

/** Sort workflows so read-only tests run first, mutating tests later */
function getExecutionOrder(workflows: WorkflowFile[]): WorkflowFile[] {
	const priorityOrder: Record<string, number> = {
		// Approve fixture listing first (created as pendingApproval)
		'listing/approve': 0,
		// Read-only operations
		'marketplace/get': 1,
		'asset/get': 2,
		'event/getMany': 3,
		'user/get': 10,
		'user/getMany': 11,
		'listing/get': 20,
		'listing/getMany': 21,
		'listing/getTimeslots': 22,
		'transaction/get': 30,
		'transaction/getMany': 31,
		'stock/getMany': 40,
		'stock/getReservation': 41,
		'availabilityExceptions/getMany': 50,
		// Mutating operations
		'user/updateProfile': 100,
		'user/updatePermissions': 101,
		'user/approve': 102,
		'listing/update': 110,
		'listing/create': 111,
		'listing/open': 112,
		'transaction/updateMetadata': 120,
		'transaction/transition': 121,
		'stock/adjustQuantity': 130,
		'stock/compareAndSet': 131,
		'availabilityExceptions/create': 140,
		'image/upload': 150,
	};

	return [...workflows].sort((a, b) => {
		const keyA = `${a.resource}/${a.operation}`;
		const keyB = `${b.resource}/${b.operation}`;
		return (priorityOrder[keyA] ?? 999) - (priorityOrder[keyB] ?? 999);
	});
}

// ─── CLI args ────────────────────────────────────────────────────────────────

/** Parse --filter arg from CLI: matches against resource/operation/filename */
function parseFilter(): string | null {
	const idx = process.argv.indexOf('--filter');
	if (idx === -1 || idx + 1 >= process.argv.length) return null;
	return process.argv[idx + 1];
}

// ─── Transaction fixture creation ────────────────────────────────────────────

/**
 * Create negotiation transaction fixtures on the negotiation listing.
 * - One for the read-only fixture (transaction/get, transaction/getMany)
 * - One for the transition test (operator decline via transaction/transition)
 * Returns the transition test transaction ID.
 */
async function createNegotiationFixtures(config: Config): Promise<string> {
	let transitionTxnId = '';

	await new Promise((r) => setTimeout(r, 2000));

	try {
		if (!config.fixtures.transactionId) {
			config.fixtures.transactionId = await createNegotiationTransaction(
				config,
				config.fixtures.listingId,
			);
			console.log(`  Created negotiation fixture transaction: ${config.fixtures.transactionId}`);
		}

		transitionTxnId = await createNegotiationTransaction(config, config.fixtures.listingId);
		console.log(`  Created negotiation transition test transaction: ${transitionTxnId}`);
	} catch (err) {
		console.error(`  Failed to create negotiation transactions: ${(err as Error).message}`);
		console.error('  Transaction tests will be skipped.');
	}

	return transitionTxnId;
}

/**
 * Create a purchase transaction on the purchase listing to generate a stock reservation.
 * Captures the stockReservationId for the stock/getReservation workflow test.
 */
async function createPurchaseFixture(config: Config): Promise<void> {
	if (!config.fixtures.purchaseListingId || config.fixtures.stockReservationId) return;

	try {
		console.log('  Creating purchase transaction for stock reservation...');
		const result = await createPurchaseTransaction(config, config.fixtures.purchaseListingId);
		config.fixtures.stockReservationId = result.stockReservationId;
		if (result.stockReservationId) {
			console.log(`  Stock reservation captured: ${result.stockReservationId}`);
		} else {
			console.log('  Warning: Could not capture stock reservation ID.');
			console.log('  stock/getReservation test will be skipped.');
		}
	} catch (err) {
		console.error(`  Failed to create purchase transaction: ${(err as Error).message}`);
		console.error('  stock/getReservation test will be skipped.');
	}
}

// ─── Main ────────────────────────────────────────────────────────────────────

/** Entry point: load config, setup fixtures/credentials, discover/run/cleanup workflows */
async function main(): Promise<void> {
	console.log('\n=== Sharetribe E2E Test Runner ===\n');

	// Stop n8n dev server if running (shared SQLite DB)
	await ensureN8nStopped();

	const filter = parseFilter();
	if (filter) {
		console.log(`Filter: ${filter}\n`);
	}

	// 1. Load config
	const config = loadConfig();
	console.log('Config loaded.\n');

	// 2. Validate environment (tokens, listing types, access control)
	await validateEnvironment(config);

	// 3. Setup fixtures (users + pendingApproval listing — transaction created after approve)
	await setupFixtures(config);

	// 4. Setup n8n credential
	setupCredential(config);

	// 5. Discover workflow files
	let workflows = discoverWorkflows();

	if (filter) {
		workflows = workflows.filter((wf) => {
			const key = `${wf.resource}/${wf.operation}/${path.basename(wf.path)}`;
			return key.includes(filter);
		});
	}

	console.log(`\nDiscovered ${workflows.length} workflow files:\n`);
	for (const wf of workflows) {
		console.log(`  ${wf.resource}/${wf.operation} - ${wf.name}`);
	}

	// 6. Order workflows for execution
	const ordered = getExecutionOrder(workflows);

	// 7. Transaction fixtures are created after the listing/approve workflow runs.
	//    The listing starts as pendingApproval, so we can't transact until it's published.
	let createdTransactionId = '';

	// 8. Import, execute, and collect results
	const results: TestResult[] = [];

	console.log('\n--- Running tests ---\n');

	for (const workflow of ordered) {
		const label = `${workflow.resource}/${workflow.operation}/${path.basename(workflow.path)}`;

		// Check if this test should be skipped
		const skipReason = shouldSkip(workflow, config);
		if (skipReason) {
			console.log(`SKIP  ${label}`);
			console.log(`      ${skipReason}\n`);
			results.push({ workflow, success: true, output: '', skipped: true, skipReason });
			continue;
		}

		// Skip transition test if we couldn't create a transaction
		if (
			workflow.resource === 'transaction' &&
			workflow.operation === 'transition' &&
			!createdTransactionId
		) {
			console.log(`SKIP  ${label}`);
			console.log(`      Could not create test transaction\n`);
			results.push({
				workflow,
				success: true,
				output: '',
				skipped: true,
				skipReason: 'Could not create test transaction',
			});
			continue;
		}

		// Read and process workflow JSON
		let json = fs.readFileSync(workflow.path, 'utf-8');

		const extras: Record<string, string> = {};
		if (createdTransactionId) {
			extras['{{CREATED_TRANSACTION_ID}}'] = createdTransactionId;
		}
		json = replacePlaceholders(json, config, extras);

		// Import workflow
		process.stdout.write(`RUN   ${label} ... `);
		let workflowId: string;
		try {
			workflowId = importWorkflow(json, config);
		} catch (err) {
			console.log('FAIL (import)');
			console.log(`      ${(err as Error).message}\n`);
			results.push({ workflow, success: false, output: (err as Error).message });
			continue;
		}

		// Execute workflow
		if (!workflowId) {
			console.log('FAIL (no workflow ID after import)');
			results.push({ workflow, success: false, output: 'No workflow ID returned from import' });
			continue;
		}

		const { success, output } = executeWorkflow(workflowId, config);
		if (success) {
			console.log('PASS');
		} else {
			console.log('FAIL');
			console.log(`      ${output.slice(0, 200)}\n`);
		}
		results.push({ workflow, success, output });

		// After listing/approve passes: if customer is already approved (re-run),
		// create transactions now. Otherwise wait for user/approve.
		if (workflow.resource === 'listing' && workflow.operation === 'approve' && success) {
			if (!config.fixtures.pendingUserId) {
				console.log('\n  Listing approved. Customer already approved — creating transactions...');
				createdTransactionId = await createNegotiationFixtures(config);
				await createPurchaseFixture(config);
			} else {
				console.log('\n  Listing approved. Transactions deferred until customer is approved.\n');
			}
		}

		// After user/approve passes: customer is now approved, create all transactions.
		if (workflow.resource === 'user' && workflow.operation === 'approve' && success) {
			if (!createdTransactionId) {
				console.log('\n  Customer approved. Creating transaction fixtures...');
				createdTransactionId = await createNegotiationFixtures(config);
				await createPurchaseFixture(config);
			}
		}

		// After listing/create workflow passes, capture the closed listing for listing/open test
		if (workflow.resource === 'listing' && workflow.operation === 'create' && success) {
			if (!config.fixtures.closedListingId) {
				try {
					const integrationToken = await getIntegrationToken(config);
					const queryRes = await fetch(`${SHARETRIBE_INTEG_API}/v1/integration_api/listings/query`, {
						method: 'POST',
						headers: {
							Authorization: `Bearer ${integrationToken}`,
							'Content-Type': 'application/json',
						},
						body: JSON.stringify({
							authorId: config.fixtures.userId,
							states: ['closed'],
							perPage: 1,
						}),
					});
					if (queryRes.ok) {
						const queryData = (await queryRes.json()) as { data: Array<{ id: string }> };
						if (queryData.data.length > 0) {
							config.fixtures.closedListingId = queryData.data[0].id;
							console.log(`\n  Captured closed listing: ${config.fixtures.closedListingId}`);
						}
					}
				} catch (err) {
					console.error(`  Failed to capture closed listing: ${(err as Error).message}`);
				}
			}
		}
	}

	// 9. Print summary
	console.log('\n\n=== Test Summary ===\n');

	const passed = results.filter((r) => r.success && !r.skipped);
	const failed = results.filter((r) => !r.success);
	const skipped = results.filter((r) => r.skipped);

	for (const r of results) {
		const label = `${r.workflow.resource}/${r.workflow.operation}/${path.basename(r.workflow.path)}`;
		if (r.skipped) {
			console.log(`  SKIP  ${label}`);
		} else if (r.success) {
			console.log(`  PASS  ${label}`);
		} else {
			console.log(`  FAIL  ${label}`);
		}
	}

	console.log(`\n  Passed: ${passed.length}  Failed: ${failed.length}  Skipped: ${skipped.length}`);
	console.log(`  Total:  ${results.length}`);

	console.log(`\n  Workflows and executions are available at http://localhost:5678`);
	console.log(`  Start n8n to inspect results: npm run dev\n`);

	if (failed.length > 0) {
		process.exit(1);
	}
}

main().catch((err) => {
	console.error(`\nFatal error: ${err.message}\n`);
	process.exit(1);
});
