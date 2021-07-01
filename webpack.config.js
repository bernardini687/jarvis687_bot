const TerserPlugin = require('terser-webpack-plugin');
const path = require('path');

module.exports = {
  entry: [
    path.join(__dirname, 'index.js')
  ],
  output: {
    path: path.join(__dirname, 'dist'),
    filename: 'bundle.js',
    libraryTarget: 'commonjs' // need this for lambda to have access to `bundle.handler`
  },
  target: 'node',
  optimization: {
    minimizer: [
      new TerserPlugin({
        extractComments: false,
      })
    ]
  }
}
