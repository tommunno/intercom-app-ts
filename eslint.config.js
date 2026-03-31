import { defineConfig } from "eslint/config";
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";

export default defineConfig(
  {
    files: ["src/server/**/*.ts", "src/shared/**/*.ts"],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    rules: {
      //Allow unused variables to be _ or _example only:
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
        },
      ],
    },
  },
  {
    files: ["src/client/**/*.ts", "src/client/**/*.tsx"],
    plugins: {
      "react-hooks": reactHooks,
    },
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    rules: {
      //Allow unused variables to be _ or _example only:
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
        },
      ],
      ...reactHooks.configs.recommended.rules,
    },
  },
);
