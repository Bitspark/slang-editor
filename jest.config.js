module.exports = {
	preset: "ts-jest",
	testEnvironment: "node",
	coverageThreshold: {
		"./src/slang/core/mapper.ts": {
			lines: 100,
		},
		"./src/slang/core/abstract": {
			branches: 70,
			functions: 70,
			statements: 70,
		},
		"./src/slang/core/models": {
			branches: 50,
			functions: 50,
			statements: 50,
		},
	},
	coveragePathIgnorePatterns: [
		"/node_modules/",
	],
};