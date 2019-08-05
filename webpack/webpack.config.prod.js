const Path = require("path");
const Webpack = require("webpack");
const merge = require("webpack-merge");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const CopyPkgJsonPlugin = require("copy-pkg-json-webpack-plugin");
const common = require("./webpack.common.js");

module.exports = env => merge(common(env), {
	mode: "production",
	stats: "errors-only",
	bail: true,
	output: {
		filename: "[name].js",
		chunkFilename: "[name].chunk.js",
	},
	plugins: [
		new Webpack.DefinePlugin({
			"process.env.NODE_ENV": JSON.stringify("production"),
		}),
		new Webpack.optimize.ModuleConcatenationPlugin(),
		new MiniCssExtractPlugin({
			filename: "bundle.css",
		}),
		new CopyPkgJsonPlugin({
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
					MiniCssExtractPlugin.loader,
					"css-loader",
					"sass-loader",
				],
			},
		],
	},
});
