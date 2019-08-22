const Path = require("path");
const Webpack = require("webpack");
const merge = require("webpack-merge");
const MinifyCss = require("mini-css-extract-plugin");
const CopyPkgJson = require("copy-pkg-json-webpack-plugin");
const common = require("./webpack.common.js");

module.exports = env => merge(common(env), {
	mode: "production",
	stats: "errors-only",
	bail: true,
	entry: {
		index: Path.resolve(__dirname, `../src/index.ts`),
	},
	plugins: [
		new Webpack.DefinePlugin({
			"process.env.NODE_ENV": JSON.stringify("production"),
		}),
		new Webpack.optimize.ModuleConcatenationPlugin(),
		new MinifyCss({
			filename: "bundle.css",
		}),
		new CopyPkgJson({
			remove: ["devDependencies"],
			replace: {scripts: {start: "node index.js"}},
		}),
	],
	module: {
		rules: [
			{
				test: /\.(js)$/,
				exclude: /node_modules/,
				use: {
					loader: "babel-loader",
					options: {
						presets: ["es2015"],
					},
				},
			},
			{
				test: /\.s?css/i,
				use: [
					MinifyCss.loader,
					"css-loader",
					"sass-loader",
				],
			},
		],
	},
});
