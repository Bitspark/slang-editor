module.exports = {
	preset: "ts-jest",
	automock: false,
	setupFiles: [
		"./jest.setup.ts"
	],
	testEnvironment: "node",
	coverageThreshold: {
		"./src/slang/definitions/": {
			functions: 100,
			branches: 90,
			statements: 86,
		},
		"./src/slang/core/abstract": {
			functions: 85,
			branches: 81,
			statements: 80,
		},
		"./src/slang/core/": {
			functions: 80,
			branches: 82,
			statements: 79,
		},
	},
	coveragePathIgnorePatterns: [
		"/node_modules/",
	],
};