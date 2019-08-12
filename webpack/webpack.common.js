const Path = require("path");
const {CleanWebpackPlugin} = require("clean-webpack-plugin");

module.exports = env => ({
		entry: {
			index: Path.resolve(__dirname, `../src/index.ts`),
		},
		output: {
			path: Path.join(__dirname, `../dist`),
			filename: "[name].js",
		},
		optimization: {
			splitChunks: {
				chunks: "all",
				name: false,
			},
		},
		plugins: [
			new CleanWebpackPlugin({root: Path.resolve(__dirname, "..")}),
		],
		resolve: {
			alias: {
				"slang": Path.resolve(__dirname, "../src/slang"),
			},
			extensions: [".tsx", ".ts", ".js"],
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
	});
