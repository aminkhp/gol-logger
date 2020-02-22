import path from "path";
import HtmlPlugin  from "html-webpack-plugin";
import { CleanWebpackPlugin } from "clean-webpack-plugin";

export default {
  entry: "./examples/index.ts",
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "[name].bundle.js"
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        loader: "ts-loader"
      }
    ]
  },
  devServer: {
    contentBase: "./dist",
    liveReload: false,
    hot: false,
  },
  plugins: [
    new HtmlPlugin({
      template: "./examples/index.html"
    }),
    new CleanWebpackPlugin()
  ],
  mode: "development",
  devtool: "source-map"
}