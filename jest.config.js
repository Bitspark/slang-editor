module.exports = {
	preset: "ts-jest",
	automock: false,
	collectCoverage: true,
	coverageReporters: [
		"text", "text-summary", "html"
	],
	setupFiles: [
		"./jest.setup.ts"
	],
	testEnvironment: "node",
	coverageThreshold: {
		"./src/slang/definitions/parsing.ts": {
			functions: 100,
			branches: 82,
			statements: 86,
		},
		"./src/slang/definitions/type.ts": {
			functions: 100,
			branches: 90,
			statements: 84,
		},
		"./src/slang/core/abstract": {
			functions: 85,
			branches: 73,
			statements: 80,
		},
		"./src/slang/core/": {
			functions: 80,
			branches: 71,
			statements: 79,
		},
	},
	coveragePathIgnorePatterns: [
		"/node_modules/",
	],
};