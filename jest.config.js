module.exports = {
	preset: "ts-jest",
	testEnvironment: "node",
	coverageThreshold: {
		"./src/slang/definitions/": {
			functions: 100,
			branches: 83,
			statements: 83,
		},
		"./src/slang/core/abstract": {
			functions: 85,
			branches: 81,
			statements: 80,
		},
		"./src/slang/core/models": {
			functions: 63,
			branches: 73,
			statements: 67,
		},
	},
	coveragePathIgnorePatterns: [
		"/node_modules/",
	],
};
