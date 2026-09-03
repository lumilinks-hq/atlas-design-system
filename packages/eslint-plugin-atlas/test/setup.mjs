import { RuleTester } from "eslint";
import css from "@eslint/css";
import tseslint from "typescript-eslint";
import { afterAll, describe, it } from "vitest";

RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;
RuleTester.afterAll = afterAll;

export const tsxTester = new RuleTester({
  languageOptions: {
    parser: tseslint.parser,
    parserOptions: { ecmaFeatures: { jsx: true } },
  },
});

export const cssTester = new RuleTester({
  plugins: { css },
  language: "css/css",
});
