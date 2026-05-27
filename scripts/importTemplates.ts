/**
 * Imports public-template workflows from
 *
 *   workflows/public-templates/<status>/<useCase>/*.json
 *
 * into n8n, tagging each workflow with both the status (`development` /
 * `published`) and the use-case folder name (e.g. `bookings`, `stripe-integrations`)
 * so they're filterable in the n8n UI.
 *
 * Run via `npm run import:templates`. Uses the same n8n CLI as `npm run n8n`.
 */

import { execSync } from 'node:child_process';
import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const TEMPLATES_ROOT = path.resolve(__dirname, '../workflows/public-templates');
const N8N_USER_FOLDER = process.env.N8N_USER_FOLDER || `${process.env.HOME}/.n8n-node-cli`;

interface WorkflowTag {
	name: string;
}

interface Workflow {
	tags?: WorkflowTag[];
	[key: string]: unknown;
}

function listSubdirs(root: string): string[] {
	return readdirSync(root, { withFileTypes: true })
		.filter((entry) => entry.isDirectory())
		.map((entry) => entry.name);
}

function listJsonFiles(dir: string): string[] {
	return readdirSync(dir)
		.filter((name) => name.endsWith('.json'))
		.map((name) => path.join(dir, name));
}

function ensureTags(workflow: Workflow, tagNames: string[]): Workflow {
	const tags = workflow.tags ?? [];
	for (const name of tagNames) {
		if (!tags.some((t) => t.name === name)) {
			tags.push({ name });
		}
	}
	return { ...workflow, tags };
}

function importTaggedFiles(files: string[], tags: string[]): void {
	if (files.length === 0) return;
	const label = tags.join('/');
	const tempDir = mkdtempSync(path.join(tmpdir(), `n8n-templates-${tags.join('-')}-`));
	try {
		for (const file of files) {
			const raw = readFileSync(file, 'utf8');
			const tagged = ensureTags(JSON.parse(raw) as Workflow, tags);
			writeFileSync(path.join(tempDir, path.basename(file)), JSON.stringify(tagged, null, 2));
		}
		console.log(`  Importing ${files.length} workflow(s) from ${label}/ (tags: ${tags.join(', ')})...`);
		execSync(
			`N8N_USER_FOLDER=${N8N_USER_FOLDER} npx n8n@latest import:workflow --separate --input=${tempDir}`,
			{ stdio: 'inherit' },
		);
	} finally {
		rmSync(tempDir, { recursive: true, force: true });
	}
}

function main(): void {
	console.log(`Importing public templates from ${TEMPLATES_ROOT}\n`);

	const statuses = listSubdirs(TEMPLATES_ROOT);
	if (statuses.length === 0) {
		console.log('No subfolders found — nothing to import.');
		return;
	}

	let importedAny = false;
	for (const status of statuses) {
		const statusDir = path.join(TEMPLATES_ROOT, status);
		const useCases = listSubdirs(statusDir);

		// Allow workflows to sit directly under <status>/ (no use-case folder) — tag with status only.
		const flatFiles = listJsonFiles(statusDir);
		if (flatFiles.length > 0) {
			importTaggedFiles(flatFiles, [status]);
			importedAny = true;
		}

		for (const useCase of useCases) {
			const useCaseDir = path.join(statusDir, useCase);
			const files = listJsonFiles(useCaseDir);
			importTaggedFiles(files, [status, useCase]);
			if (files.length > 0) importedAny = true;
		}
	}

	console.log(importedAny ? '\n✓ Done.' : '\nNo workflows imported.');
}

main();
