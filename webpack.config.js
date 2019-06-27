const path = require("path");
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const UglifyJsPlugin = require("uglifyjs-webpack-plugin");

module.exports = () => {
	return {
		node: {
			fs: 'empty',
		},
		entry: {
			'index': path.resolve(__dirname, `./src/index.ts`),
		},
		output: {
			path: path.resolve(__dirname, "dist"),
			filename: '[name].js',
		},
		plugins: [
			new CleanWebpackPlugin(),
		],
		devtool: "source-map",
		resolve: {
			alias: {
				"~": path.resolve(__dirname, "./src")
			},
			extensions: [".tsx", ".ts", ".js"]
		},
		module: {
			rules: [
				{
					test: /\.(js)$/,
					exclude: /node_modules/,
					use: {
						loader: "babel-loader",
						options: {
							presets: ["es2015"]
						}
					}
				},
				{
					test: /\.s?css$/i,
					use: ["style-loader", "css-loader?sourceMap=true", "sass-loader"]
				},
				{
					test: /\.tsx?$/,
					use: {
						loader: "ts-loader",
						query: {
							compilerOptions: {
								declaration: true,
							},
						},
					},
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
				},
			]
		},
		optimization: {
			minimizer: [
				new UglifyJsPlugin({
					uglifyOptions: {
						compress: true,
					},
					sourceMap: true,
				})
			]
		}
	};
};
