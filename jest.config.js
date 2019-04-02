module.exports = {
	preset: "ts-jest",
	testEnvironment: "node",
	coverageThreshold: {
		"./src/slang/definitions/": {
			functions: 100,
			branches: 100,
			statements: 100,
		},
		"./src/slang/core/abstract": {
			functions: 83,
			branches: 76,
			statements: 74,
		},
		"./src/slang/core/models": {
			functions: 64,
			branches: 67,
			statements: 67,
		},
	},
	coveragePathIgnorePatterns: [
		"/node_modules/",
	],
};
