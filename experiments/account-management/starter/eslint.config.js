import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

// baseline と harness で共通の土台。harness では scripts/harness-context.mjs が
// このファイルを Atlas ルール付きの設定で上書きする
export default tseslint.config(
  { ignores: ["dist", "node_modules", ".agents"] },
  // CSS も lint 対象に入るため、JS/TS 向けの推奨ルールはファイル種別を限定して適用する
  {
    files: ["**/*.{js,mjs,cjs,ts,tsx}"],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: { parserOptions: { tsconfigRootDir: import.meta.dirname } },
  },
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: { ecmaVersion: 2023, globals: globals.browser },
  },
);
