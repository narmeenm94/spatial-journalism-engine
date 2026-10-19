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
      export: 'default'
    },
    globalObject: 'this',
    clean: true
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env']
          }
        }
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
      }
    ]
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './engine/src/index.html',
      filename: 'index.html',
      minify: { removeComments: false }
    }),
    new CopyWebpackPlugin({
      patterns: [
        {
          from: 'node_modules/@8thwall/engine/dist',
          to: 'vendor/8thwall',
          info: { minimized: true }
        },
        {
          from: 'node_modules/@8thwall/engine/LICENSE',
          to: 'vendor/8thwall/LICENSE'
        },
        {
          from: 'external/xr',
          to: 'vendor/8thwall-slam',
          info: { minimized: true }
        },
        {
          from: 'engine/schema',
          to: 'schema',
          noErrorOnMissing: true
        },
        {
          from: 'node_modules/three-runtime/build/three.min.js',
          to: 'vendor/three.min.js'
        },
        {
          from: 'node_modules/three-runtime/examples/js/loaders/GLTFLoader.js',
          to: 'vendor/GLTFLoader.js'
        },
        {
          from: 'node_modules/three-runtime/examples/js/controls/OrbitControls.js',
          to: 'vendor/OrbitControls.js'
        },
        ...['EffectComposer', 'RenderPass', 'OutlinePass', 'ShaderPass'].map(
          (name) => ({
            from:
              'node_modules/three-runtime/examples/js/postprocessing/' +
              name +
              '.js',
            to: 'vendor/' + name + '.js'
          })
        ),
        {
          from: 'node_modules/three-runtime/examples/js/shaders/CopyShader.js',
          to: 'vendor/CopyShader.js'
        },
        {
          from: 'node_modules/three-runtime/LICENSE',
          to: 'vendor/THREE-LICENSE.txt'
        }
      ]
    })
  ],
  devServer: {
    static: [
      {
        directory: path.resolve(__dirname, '../dist'),
        publicPath: '/'
      },
      {
        directory: path.resolve(__dirname, '../examples'),
        publicPath: '/examples'
      },
      {
        directory: path.resolve(__dirname, '../external'),
        publicPath: '/external'
      }
    ],
    port: 8080,
    hot: true,
    client: {
      overlay: false // Disable error overlay (cross-origin CDN scripts cause "Script error")
    }
  },
  resolve: {
    extensions: ['.js']
  },
  externals: {
    three: 'THREE'
  }
}
