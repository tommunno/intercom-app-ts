import path from "path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default {
  mode: "development",
  entry: {
    panel: "./src/client/panel/main.ts",
    setup: "./src/client/setup/main.tsx",
  },

  module: {
    rules: [
      {
        test: /\.tsx?$/,
        loader: "ts-loader",
        exclude: /node_modules/,
        options: { configFile: "src/client/tsconfig.client.json" },
      },
    ],
  },
  resolve: {
    extensions: [".tsx", ".ts", ".js"],
    extensionAlias: {
      ".js": [".ts", ".js"],
      ".jsx": [".tsx", ".jsx"],
    },
  },
  output: {
    filename: "[name].bundle.js",
    path: path.resolve(__dirname, "public/assets/js"),
  },
};
