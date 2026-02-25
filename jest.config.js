// Avoid tests failing because of difference between local and GitHub actions timezone
process.env.TZ = 'UTC';

/** @type {import('jest').Config} */
module.exports = {
	preset: 'ts-jest',
	testEnvironment: 'node',
	roots: ['<rootDir>/nodes', '<rootDir>/credentials'],
	testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
	transform: {
		'^.+\\.ts$': ['ts-jest', {
			tsconfig: {
				esModuleInterop: true,
				allowSyntheticDefaultImports: true,
				moduleResolution: 'node',
				resolveJsonModule: true,
			},
		}],
	},
	collectCoverageFrom: [
		'nodes/**/*.ts',
		'credentials/**/*.ts',
		'!nodes/**/test/**',
		'!**/*.test.ts',
		'!**/*.spec.ts',
		'!**/node_modules/**',
	],
	coverageReporters: ['text'],
	coverageThreshold: {
		global: {
			branches: 70,
			functions: 70,
			lines: 70,
			statements: 70,
		},
	},
	moduleNameMapper: {
		'^n8n-workflow$': '<rootDir>/node_modules/n8n-workflow',
		'^n8n-core$': '<rootDir>/node_modules/n8n-core',
	},
	testTimeout: 10000,
	verbose: true,
};
