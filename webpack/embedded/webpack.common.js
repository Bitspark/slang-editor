const Path = require('path');
const CleanWebpackPlugin = require('clean-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
    entry: {
        app: Path.resolve(__dirname, '../../src/app/app-embedded.ts')
    },
    output: {
        path: Path.join(__dirname, '../../build/embedded'),
        filename: 'js/[name].js',
    },
    optimization: {
        splitChunks: {
            chunks: 'all',
            name: false
        }
    },
    plugins: [
        new CleanWebpackPlugin(['build'], {root: Path.resolve(__dirname, '..', '..')}),
        new CopyWebpackPlugin([
            {from: Path.resolve(__dirname, '../../public'), to: 'public'}
        ]),
        new HtmlWebpackPlugin({
            template: Path.resolve(__dirname, '../../src/index-embedded.html')
        })
    ],
    resolve: {
        alias: {
            '~': Path.resolve(__dirname, '../../src')
        },
        extensions: ['.tsx', '.ts', '.js']
    },
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                use: 'ts-loader',
                exclude: /node_modules/
            },
            {
                test: /\.mjs$/,
                include: /node_modules/,
                type: 'javascript/auto'
            },
            {
                test: /\.(ico|jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2)(\?.*)?$/,
                use: {
                    loader: 'file-loader',
                    options: {
                        name: '[path][name].[ext]'
                    }
                }
            },
        ]
    }
};
