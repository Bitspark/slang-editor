module.exports = {
	preset: "ts-jest",
	testEnvironment: "node",
	coverageThreshold: {
		"./src/slang/core/abstract": {
			functions: 83,
			branches: 75,
			statements: 73,
		},
		"./src/slang/core/models": {
			functions: 65,
			branches: 67,
			statements: 67,
		},
	},
	coveragePathIgnorePatterns: [
		"/node_modules/",
	],
};
