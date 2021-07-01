const TerserPlugin = require('terser-webpack-plugin');
const path = require('path');

module.exports = {
  // Specify the entry point for our app
  entry: [
    path.join(__dirname, 'index.js')
  ],
  // Specify the output file containing our bundled code
  output: {
    path: __dirname,
    filename: 'bundle.js'
  },
  // Let webpack know to generate a Node.js bundle
  target: 'node',
  optimization: {
    minimizer: [new TerserPlugin({
      extractComments: false,
    })]
  }
}