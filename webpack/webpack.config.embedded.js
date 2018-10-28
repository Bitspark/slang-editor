const Path = require('path');
const Webpack = require('webpack');
const CleanWebpackPlugin = require('clean-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const merge = require('webpack-merge');
const common = require('./webpack.common.js');

const dest = Path.join(__dirname, '../dist');

module.exports = merge(common, {
    entry: {
        app: Path.resolve(__dirname, '../src/app/app-embedded.ts')
    },
    mode: 'development',
    devtool: 'cheap-eval-source-map',
    output: {
        chunkFilename: 'js/[name].chunk.js'
    },
    devServer: {
        contentBase: dest,
        inline: true,
        historyApiFallback: {
            disableDotRule: true
        }
    },
    plugins: [
        new CleanWebpackPlugin(['build'], {root: Path.resolve(__dirname, '..')}),
        new CopyWebpackPlugin([
            {from: Path.resolve(__dirname, '../public'), to: 'public'}
        ]),
        new HtmlWebpackPlugin({
            template: Path.resolve(__dirname, '../src/index-embedded.html')
        })
    ],
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                use: 'ts-loader',
                exclude: /node_modules/
            },
            {
                test: /\.(js)$/,
                include: Path.resolve(__dirname, '../src'),
                enforce: 'pre',
                loader: 'eslint-loader',
                options: {
                    emitWarning: true,
                }
            },
            {
                test: /\.(js)$/,
                include: Path.resolve(__dirname, '../src'),
                loader: 'babel-loader'
            },
            {
                test: /\.s?css$/i,
                use: ['style-loader', 'css-loader?sourceMap=true', 'sass-loader']
            },
        ]
    }
});
