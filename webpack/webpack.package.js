const Path = require("path");
const CopyPkgJson = require("copy-pkg-json-webpack-plugin");

module.exports = {
	mode: "production",
	stats: "errors-only",
	entry: {
		index: Path.resolve(__dirname, `../src/example/index.html`),
	},
	output: {
		path: Path.join(__dirname, `../dist`),
	},
	plugins: [
		new CopyPkgJson({
			remove: ["devDependencies"],
			replace: {scripts: {start: "node index.js"}},
		}),
	],
	module: {
		rules: [
			{
				test: /\.(html)$/,
				loader: "null-loader",
			},
		],
	},
};
