const Path = require("path");
const Webpack = require('webpack');
const {CleanWebpackPlugin} = require("clean-webpack-plugin");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const {BaseHrefWebpackPlugin} = require('base-href-webpack-plugin');

module.exports = env => {
	return {
		entry: {
			index: Path.resolve(__dirname, `../src/example/index.ts`),
		},
		optimization: {
			splitChunks: {
				chunks: "all",
				name: false,
			},
		},
		plugins: [
			new Webpack.DefinePlugin({
				'APIURL': JSON.stringify(env.apiUrl)
			}),
			new CleanWebpackPlugin({
				cleanAfterEveryBuildPatterns: ["dist"],
				root: Path.resolve(__dirname, "..", ".."),
			}),
		],
		resolve: {
			extensions: [".tsx", ".ts", ".js"],
			alias: {
				'@styles': Path.resolve('src/styles'),
			}
		},
		module: {
			rules: [
				{
					test: /\.tsx?$/,
					use: "ts-loader",
					exclude: /node_modules/,
				},
				{
					test: /\.mjs$/,
					include: /node_modules/,
					type: "javascript/auto",
				},
				{
					test: /\.(ico|jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2)(\?.*)?$/,
					use: {
						loader: "file-loader",
						options: {
							name: "[path][name].[ext]",
						},
					},
				},
			],
		},
	};
};
