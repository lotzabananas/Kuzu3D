const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
// const ESLintPlugin = require('eslint-webpack-plugin'); // Temporarily disabled
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
	mode: 'development',
	entry: {
		index: './src/app-simple.js',
	},
	devServer: {
		static: [
			{
				directory: path.join(__dirname, 'dist'),
			},
			{
				directory: path.join(__dirname, '.'),
				publicPath: '/',
				serveIndex: false
			}
		],
		host: '0.0.0.0',
		server: 'https',
		compress: true,
		port: 8081,
		client: {
			overlay: { warnings: false, errors: false },
		},
		proxy: [
			{
				context: ['/api'],
				target: 'http://localhost:3000',
				secure: false,
				changeOrigin: true
			}
		]
	},
	output: {
		filename: '[name].bundle.js',
		path: path.resolve(__dirname, 'dist'),
		clean: true,
	},
	plugins: [
		// ESLint plugin temporarily disabled due to flat config issues
		// new ESLintPlugin({
		// 	extensions: ['js'],
		// 	eslintPath: require.resolve('eslint'),
		// 	overrideConfigFile: path.resolve(__dirname, './eslint.config.cjs'),
		// }),
		new HtmlWebpackPlugin({
			template: './src/index.html',
		}),
		new CopyPlugin({
			patterns: [{ from: 'src/assets', to: 'assets' }],
		}),
	],
	devtool: 'source-map',
};
