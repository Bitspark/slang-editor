module.exports = {
	preset: "ts-jest",
	testEnvironment: "node",
	coverageThreshold: {
		"./src/slang/core/abstract": {
			functions: 83,
			branches: 76,
			statements: 73,
		},
		"./src/slang/core/models": {
			functions: 50,
			branches: 75,
			statements: 58,
		},
	},
	coveragePathIgnorePatterns: [
		"/node_modules/",
	],
};