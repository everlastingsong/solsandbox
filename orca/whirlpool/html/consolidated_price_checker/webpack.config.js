const path = require('path'); // Node.jsの組み込みのモジュール
const webpack = require('webpack');

// 各種設定を含んだオブジェクトをexportするのが基本の書き方。
module.exports = {
  entry: './index.ts', // エントリーポイントとなるjs
  output: {
    filename: 'bundle.js', // バンドルされて出力されるjsのファイル名
    path: path.resolve(__dirname, 'dist')　// バンドルの出力先ディレクトリ
    // pathは絶対パスである必要があり、絶対パスを簡単に指定するためにpath.resolve()を使っている。
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        loader: 'ts-loader'
      }
    ]
  },
  plugins: [
    // Work around for Buffer is undefined:
    // https://github.com/webpack/changelog-v5/issues/10
    new webpack.ProvidePlugin({
        Buffer: ['buffer', 'Buffer'],
    }),
    new webpack.ProvidePlugin({
        process: 'process/browser',
    }),
  ],
  resolve: {
    extensions: ['.ts', '.js'],
    fallback: {
      "stream": require.resolve("stream-browserify"),
      "buffer": require.resolve("buffer")
    }
  }
};