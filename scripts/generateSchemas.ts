/**
 * Auto-generate flat JSON schema files for n8n's output preview.
 *
 * Reads TypeScript interfaces from Sharetribe.types.ts, generates full
 * JSON Schema via ts-json-schema-generator, then flattens the JSON:API
 * structure the same way flattenSharetribeResponse does at runtime:
 *   - attributes moved to root level
 *   - relationships resolved to { id, type } refs (or arrays thereof)
 *   - $ref/$definitions resolved inline
 *
 * Output matches n8n convention: flat type/properties + root "version" key.
 */

/* eslint-disable @n8n/community-nodes/no-restricted-imports */
/* eslint-disable @n8n/community-nodes/no-restricted-globals */
/* eslint-disable no-console */

import * as fs from 'fs';
import * as path from 'path';
import * as tsj from 'ts-json-schema-generator';

const SCHEMA_VERSION = 1;
const SCHEMA_BASE_PATH = path.join(__dirname, '../nodes/Sharetribe/__schema__/v1');
const TYPES_FILE_PATH = path.join(__dirname, '../nodes/Sharetribe/v1/helpers/Sharetribe.types.ts');

// ── Schema generation from TypeScript types ────────────────────────

function generateRawSchema(typeName: string): Record<string, unknown> {
	const config: tsj.Config = {
		path: TYPES_FILE_PATH,
		tsconfig: path.join(__dirname, '../tsconfig.json'),
		type: typeName,
		skipTypeCheck: true,
		expose: 'export',
		topRef: false,
		jsDoc: 'extended',
		additionalProperties: false,
	};
	return tsj.createGenerator(config).createSchema(typeName) as Record<string, unknown>;
}

// ── $ref resolver ──────────────────────────────────────────────────

type JsonSchema = Record<string, unknown>;

/**
 * Recursively resolves all $ref pointers in a JSON Schema, inlining
 * the referenced definitions. Handles circular refs by returning
 * { type: 'object' } as a fallback.
 */
function resolveRefs(
	node: unknown,
	definitions: Record<string, JsonSchema>,
	seen = new Set<string>(),
): unknown {
	if (node === null || node === undefined || typeof node !== 'object') {
		return node;
	}

	if (Array.isArray(node)) {
		return node.map((item) => resolveRefs(item, definitions, seen));
	}

	const obj = node as JsonSchema;

	// Resolve $ref
	if (typeof obj.$ref === 'string') {
		const refPath = (obj.$ref as string).replace('#/definitions/', '');
		if (seen.has(refPath)) return { type: 'object' }; // circular
		seen.add(refPath);
		const resolved = definitions[refPath];
		if (!resolved) return { type: 'object' };
		return resolveRefs(resolved, definitions, new Set(seen));
	}

	// Handle anyOf/oneOf by picking the first non-null/undefined option
	for (const keyword of ['anyOf', 'oneOf'] as const) {
		if (Array.isArray(obj[keyword])) {
			const options = obj[keyword] as JsonSchema[];
			const meaningful = options.filter(
				(o) => o.type !== 'null' && !(typeof o.const === 'undefined' && Object.keys(o).length === 0),
			);
			if (meaningful.length > 0) {
				return resolveRefs(meaningful[0], definitions, seen);
			}
			return resolveRefs(options[0], definitions, seen);
		}
	}

	// Recurse into all properties
	const result: JsonSchema = {};
	for (const [key, value] of Object.entries(obj)) {
		if (key === 'definitions' || key === '$schema') continue;
		result[key] = resolveRefs(value, definitions, seen);
	}
	return result;
}

// ── Flatten JSON:API → normalized output ───────────────────────────

/**
 * Simplifies a relationship schema to just { id, type } or an array of those.
 * Mirrors how flattenSharetribeResponse resolves relationships.
 */
function simplifyRelationship(relSchema: JsonSchema): JsonSchema {
	// Relationship shape is { data: { id, type } } or { data: [{ id, type }] }
	const dataSchema = (relSchema.properties as JsonSchema)?.data as JsonSchema | undefined;
	if (!dataSchema) return { type: 'object', properties: { id: { type: 'string' }, type: { type: 'string' } } };

	// Array relationship
	if (dataSchema.type === 'array' && dataSchema.items) {
		return { type: 'array', items: { type: 'object', properties: { id: { type: 'string' }, type: { type: 'string' } } } };
	}

	// Single relationship — extract type const if present
	const props: JsonSchema = { id: { type: 'string' }, type: { type: 'string' } };
	if (dataSchema.properties) {
		const typeField = (dataSchema.properties as JsonSchema).type as JsonSchema | undefined;
		if (typeField?.const) {
			props.type = { type: 'string', const: typeField.const };
		}
	}
	return { type: 'object', properties: props };
}

/**
 * Flattens a JSON:API resource schema into the normalized output shape.
 * Moves attributes to root, resolves relationships, strips metadata.
 */
function flattenSchema(resolved: JsonSchema): JsonSchema {
	const props = resolved.properties as JsonSchema | undefined;
	if (!props) return { type: 'object', properties: {}, version: SCHEMA_VERSION };

	const output: JsonSchema = {};

	// Root-level id and type
	if (props.id) output.id = cleanProp(props.id as JsonSchema);
	if (props.type) output.type = cleanProp(props.type as JsonSchema);

	// Flatten attributes to root
	const attrs = props.attributes as JsonSchema | undefined;
	if (attrs?.properties) {
		for (const [key, value] of Object.entries(attrs.properties as JsonSchema)) {
			output[key] = cleanProp(value as JsonSchema);
		}
	}

	// Flatten relationships
	const rels = props.relationships as JsonSchema | undefined;
	if (rels?.properties) {
		for (const [key, value] of Object.entries(rels.properties as JsonSchema)) {
			output[key] = simplifyRelationship(value as JsonSchema);
		}
	}

	return { type: 'object', properties: output, version: SCHEMA_VERSION };
}

/**
 * Strips validation-only keywords from a property schema, keeping only
 * what n8n's schema preview needs.
 */
function cleanProp(schema: unknown): unknown {
	if (schema === null || schema === undefined || typeof schema !== 'object') return schema;
	if (Array.isArray(schema)) return schema.map(cleanProp);

	const obj = schema as JsonSchema;
	const result: JsonSchema = {};

	for (const [key, value] of Object.entries(obj)) {
		// Skip validation-only keywords
		if (['required', 'additionalProperties', 'minItems', 'maxItems', 'enum'].includes(key)) continue;

		if (key === 'properties' && typeof value === 'object' && value !== null) {
			const cleaned: JsonSchema = {};
			for (const [pKey, pValue] of Object.entries(value as JsonSchema)) {
				cleaned[pKey] = cleanProp(pValue);
			}
			result.properties = cleaned;
		} else if (key === 'items') {
			result.items = cleanProp(value);
		} else {
			result[key] = value;
		}
	}

	return result;
}

// ── Resource → operation mapping ───────────────────────────────────

const resourceMappings: Record<string, { type: string; operations: string[] }> = {
	user: { type: 'User', operations: ['get', 'getMany', 'verifyEmail'] },
	listing: { type: 'Listing', operations: ['get', 'getMany', 'create', 'update'] },
	transaction: { type: 'Transaction', operations: ['get', 'getMany'] },
	stock: { type: 'Stock', operations: ['getMany', 'adjustQuantity', 'updateStockQuantity'] },
	availabilityExceptions: { type: 'AvailabilityException', operations: ['getMany', 'create', 'delete'] },
	marketplace: { type: 'Marketplace', operations: ['get'] },
	image: { type: 'Image', operations: ['upload'] },
	asset: { type: 'Asset', operations: ['get'] },
};

// Extra schemas for types not in the main mapping
const extraSchemas: Record<string, { type: string; resource: string; operation: string }[]> = {
	StockReservation: [{ type: 'StockReservation', resource: 'stock', operation: 'getReservation' }],
};

// ── Writer ─────────────────────────────────────────────────────────

function writeSchema(resourcePath: string, operation: string, schema: JsonSchema): void {
	const dir = path.join(SCHEMA_BASE_PATH, resourcePath);
	const filePath = path.join(dir, `${operation}.json`);

	if (!fs.existsSync(dir)) {
		fs.mkdirSync(dir, { recursive: true });
	}

	fs.writeFileSync(filePath, JSON.stringify(schema, null, '\t') + '\n', 'utf8');
	console.log(`✓ Generated ${resourcePath}/${operation}.json`);
}

function processType(typeName: string): JsonSchema {
	const raw = generateRawSchema(typeName);
	const definitions = (raw.definitions || {}) as Record<string, JsonSchema>;
	const resolved = resolveRefs(raw, definitions) as JsonSchema;
	return flattenSchema(resolved);
}

function generateSchemas(): void {
	console.log('Generating JSON schema files for n8n output preview...\n');

	for (const [resource, { type, operations }] of Object.entries(resourceMappings)) {
		const schema = processType(type);
		for (const operation of operations) {
			writeSchema(resource, operation, schema);
		}
	}

	for (const [type, entries] of Object.entries(extraSchemas)) {
		const schema = processType(type);
		for (const { resource, operation } of entries) {
			writeSchema(resource, operation, schema);
		}
	}

	console.log('\n✓ All schema files generated successfully!');
}

generateSchemas();
