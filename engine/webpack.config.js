const path = require('path')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const CopyWebpackPlugin = require('copy-webpack-plugin')

module.exports = {
  mode: 'development',
  entry: './engine/src/index.js',
  output: {
    filename: 'sj-engine.js',
    path: path.resolve(__dirname, '../dist'),
    library: {
      name: 'SJEngine',
      type: 'umd',
      export: 'default',
    },
    globalObject: 'this',
    clean: true,
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env'],
          },
        },
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './engine/src/index.html',
      filename: 'index.html',
    }),
    new CopyWebpackPlugin({
      patterns: [
        {
          from: 'engine/schema',
          to: 'schema',
          noErrorOnMissing: true,
        },
        {
          from: 'external',
          to: 'external',
          noErrorOnMissing: true,
        },
      ],
    }),
  ],
  devServer: {
    static: [
      {
        directory: path.resolve(__dirname, '../dist'),
        publicPath: '/',
      },
      {
        directory: path.resolve(__dirname, '../examples'),
        publicPath: '/examples',
      },
      {
        directory: path.resolve(__dirname, '../external'),
        publicPath: '/external',
      },
    ],
    port: 8080,
    hot: true,
    client: {
      overlay: false,  // Disable error overlay (cross-origin CDN scripts cause "Script error")
    },
  },
  resolve: {
    extensions: ['.js'],
  },
  externals: {
    three: 'THREE',
  },
}
