const Path = require("path");
const Webpack = require('webpack');
const CleanWebpackPlugin = require("clean-webpack-plugin");
const CopyWebpackPlugin = require("copy-webpack-plugin");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const {BaseHrefWebpackPlugin} = require('base-href-webpack-plugin');
const configurations = [
	{
		"name": "standalone",
		"html": "html/standalone.html",
		"ts": "entries/standalone.ts"
	},
	{
		"name": "embedded",
		"html": "html/embedded.html",
		"ts": "entries/embedded.ts"
	},
	{
		"name": "documentation",
		"html": "html/documentation.html",
		"ts": "entries/documentation.ts"
	},
	{
		"name": "tutorial",
		"html": "html/tutorial.html",
		"ts": "entries/tutorial.ts"
	}
];

function getConfiguration(env) {
	const fallback = configurations[0];
	if (!env || !env['slangMode']) {
		return fallback;
	}

	const configuration = configurations.find(configuration => configuration.name === env['slangMode']);

	return configuration || fallback;
}

module.exports = env => {
	const configuration = getConfiguration(env);
	return {
		entry: {
			app: Path.resolve(__dirname, `../src/${configuration.ts}`)
		},
		output: {
			path: Path.join(__dirname, `../build/${configuration.name}`),
			filename: "js/[name].js",
		},
		optimization: {
			splitChunks: {
				chunks: "all",
				name: false
			}
		},
		plugins: [
			new Webpack.DefinePlugin({
				'APIURL': JSON.stringify(env.apiUrl)
			}),
			new CleanWebpackPlugin(["build"], {root: Path.resolve(__dirname, "..", "..")}),
			new CopyWebpackPlugin([
				{from: Path.resolve(__dirname, "../public"), to: "public"}
			]),
			new HtmlWebpackPlugin({
				template: Path.resolve(__dirname, `../src/${configuration.html}`),
				templateParameters: {
					'BASEHREF': (env.baseHref) ? env.baseHref : "/",
				},
			}),
		],
		resolve: {
			alias: {
				"~": Path.resolve(__dirname, "../src")
			},
			extensions: [".tsx", ".ts", ".js"]
		},
		module: {
			rules: [
				{
					test: /\.tsx?$/,
					use: "ts-loader",
					exclude: /node_modules/
				},
				{
					test: /\.mjs$/,
					include: /node_modules/,
					type: "javascript/auto"
				},
				{
					test: /\.(ico|jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2)(\?.*)?$/,
					use: {
						loader: "file-loader",
						options: {
							name: "[path][name].[ext]"
						}
					}
				}
			]
		}
	};
};