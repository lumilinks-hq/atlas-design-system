import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist", ".runs", "experiments/**/runs/**"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  { languageOptions: { parserOptions: { tsconfigRootDir: import.meta.dirname } } },
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2023,
      globals: globals.browser,
    },
  },
  {
    files: ["scripts/**/*.mjs", "skills/*/scripts/**/*.mjs", "packages/**/*.mjs"],
    languageOptions: {
      ecmaVersion: 2023,
      globals: globals.node,
    },
  },
);
