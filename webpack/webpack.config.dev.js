const Path = require("path");
const Webpack = require("webpack");
const merge = require("webpack-merge");
const common = require("./webpack.common.js");
const Html = require("html-webpack-plugin");

const dest = Path.join(__dirname, "../dist");

module.exports = env => (merge(common(env), {
	mode: "development",
	devtool: "cheap-eval-source-map",
	devServer: {
		contentBase: dest,
		inline: true,
		historyApiFallback: {
			disableDotRule: true,
		},
	},
	plugins: [
		new Webpack.DefinePlugin({
			"process.env.NODE_ENV": JSON.stringify("development"),
		}),
		new Html({
			template: Path.resolve(__dirname, `../src/example/index.html`),
		}),
	],
	module: {
		rules: [
			{
				test: /\.(js)$/,
				include: Path.resolve(__dirname, "../src"),
				enforce: "pre",
				loader: "eslint-loader",
				options: {
					emitWarning: true,
				},
			},
			{
				test: /\.(js)$/,
				include: Path.resolve(__dirname, "../src"),
				loader: "babel-loader",
			},
			{
				test: /\.s?css$/i,
				use: ["to-string-loader", "css-loader?sourceMap=true", "sass-loader"],
			},
		],
	},
}));
