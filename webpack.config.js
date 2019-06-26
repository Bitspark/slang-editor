const path = require("path");
// const webpack = require("webpack");
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
// const UglifyJsPlugin = require("uglifyjs-webpack-plugin");

module.exports = (env) => {
	return {
		node: {
			fs: 'empty',
		},
		entry: {
			'index': path.resolve(__dirname, `./src/index.ts`)
		},
		output: {
			path: path.resolve(__dirname, "dist"),
			filename: '[name].js',
			libraryTarget: 'umd',
			library: "SlangStudio"
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
					use: "ts-loader",
					exclude: /node_modules/
				},
				// {
				// 	test: /\.mjs$/,
				// 	include: /node_modules/,
				// 	type: "javascript/auto"
				// },
				// {
				// 	test: /\.(ico|jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2)(\?.*)?$/,
				// 	use: {
				// 		loader: "file-loader",
				// 		options: {
				// 			name: "[path][name].[ext]"
				// 		}
				// 	}
				// },
			]
		},
		optimization: {
			// splitChunks: {
			// 	chunks: "all"
			// },
			// runtimeChunk: 'single',
			// splitChunks: {
			// 	chunks: 'all',
			// 	maxInitialRequests: Infinity,
			// 	minSize: 0,
			// 	cacheGroups: {
			// 		vendor: {
			// 			test: /[\\/]node_modules[\\/]/,
			// 			name(module) {
			// 				// get the name. E.g. node_modules/packageName/not/this/part.js
			// 				// or node_modules/packageName
			// 				const packageName = module.context.match(/[\\/]node_modules[\\/](.*?)([\\/]|$)/)[1];
			//
			// 				// npm package names are URL-safe, but some servers don't like @ symbols
			// 				return `npm.${packageName.replace('@', '')}`;
			// 			},
			// 		},
			// 	},
			// },
			// minimizer: [
			// 	new UglifyJsPlugin({
			// 		cache: true,
			// 		parallel: true,
			// 		uglifyOptions: {
			// 			compress: true,
			// 		},
			// 		sourceMap: true,
			// 		include: /\.min\.js$/
			// 	})
			// ]
		}
	};
};
