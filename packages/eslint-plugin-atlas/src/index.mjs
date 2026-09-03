import { Linter } from "eslint";
import css from "@eslint/css";
import tseslint from "typescript-eslint";
import componentApproved from "./rules/component-approved.mjs";
import componentUsage from "./rules/component-usage.mjs";
import componentVariants from "./rules/component-variants.mjs";
import tableVariant from "./rules/table-variant.mjs";
import collectionItemName from "./rules/collection-item-name.mjs";
import formLabel from "./rules/form-label.mjs";
import contactEmail from "./rules/contact-email.mjs";
import linkSemantics from "./rules/link-semantics.mjs";
import actionConfirmation from "./rules/action-confirmation.mjs";
import focusManagement from "./rules/focus-management.mjs";
import noRawColor from "./rules/no-raw-color.mjs";
import componentThemeImport from "./rules/component-theme-import.mjs";

export const rules = {
  "component-approved": componentApproved,
  "component-usage": componentUsage,
  "component-variants": componentVariants,
  "table-variant": tableVariant,
  "collection-item-name": collectionItemName,
  "form-label": formLabel,
  "contact-email": contactEmail,
  "link-semantics": linkSemantics,
  "action-confirmation": actionConfirmation,
  "focus-management": focusManagement,
  "no-raw-color": noRawColor,
  "component-theme-import": componentThemeImport,
};

/** plugin rule 名 → design/rules.json の id */
export const ruleIdByPluginRule = {
  "component-approved": "component.approved",
  "component-usage": "component.usage",
  "component-variants": "component.variants",
  "table-variant": "component.table.variant",
  "collection-item-name": "a11y.collection-item-name",
  "form-label": "a11y.form-label",
  "contact-email": "business.contact-email",
  "link-semantics": "navigation.link-semantics",
  "action-confirmation": "action.confirmation",
  "focus-management": "a11y.focus-management",
  "no-raw-color": "token.no-raw-color",
  "component-theme-import": "token.radius",
};

export const cssRules = ["no-raw-color", "component-theme-import"];

// 「画面のどこかに存在すること」を求めるルール。ファイル単位で走らせると
// main.tsx や fixtures.ts で誤検知するので、画面の入口ファイルにだけ適用する
export const entryFileRules = [
  "component-usage",
  "table-variant",
  "form-label",
  "contact-email",
  "link-semantics",
  "action-confirmation",
  "focus-management",
];
export const entryStylesRules = ["component-theme-import"];

const plugin = { meta: { name: "eslint-plugin-atlas", version: "0.1.0" }, rules };

function ruleEntries(names, options) {
  return Object.fromEntries(
    names.map((name) => {
      const ruleOption = ruleOptions(name, options);
      return [`atlas/${name}`, ruleOption ? ["error", ruleOption] : "error"];
    }),
  );
}

function ruleOptions(name, options) {
  switch (name) {
    case "component-approved":
      return { approvedImports: options.approvedImports, forbiddenText: options.forbiddenText };
    case "component-usage":
      return { componentUsage: options.componentUsage };
    case "component-variants":
      return { variants: options.variants };
    case "table-variant":
      return { variant: options.tableVariant };
    case "link-semantics":
      return options.linkSemantics;
    case "component-theme-import":
      return { path: options.componentThemeImport };
    default:
      return undefined;
  }
}

/**
 * Atlas ルールの flat config ブロック。parser は含めない(TSX の parser は利用側の
 * typescript-eslint 設定が担う)。CSS ブロックは @eslint/css の language を使う
 */
export function atlasConfigs({ options, tsxFiles = ["**/*.tsx"], entryFile = "src/App.tsx", cssFiles = ["**/*.css"], entryStyles = "src/styles.css" }) {
  const tsxRuleNames = Object.keys(rules).filter((name) => !cssRules.includes(name) && !entryFileRules.includes(name));
  const cssRuleNames = cssRules.filter((name) => !entryStylesRules.includes(name));
  return [
    { name: "atlas/tsx", files: tsxFiles, plugins: { atlas: plugin }, rules: ruleEntries(tsxRuleNames, options) },
    { name: "atlas/tsx-entry", files: [entryFile], plugins: { atlas: plugin }, rules: ruleEntries(entryFileRules, options) },
    { name: "atlas/css", files: cssFiles, plugins: { css, atlas: plugin }, language: "css/css", rules: ruleEntries(cssRuleNames, options) },
    { name: "atlas/css-entry", files: [entryStyles], plugins: { css, atlas: plugin }, language: "css/css", rules: ruleEntries(entryStylesRules, options) },
  ];
}

/**
 * App.tsx と styles.css の文字列を同期で lint し、plugin rule 名ごとの messages を返す。
 * 構文エラーなど rule に属さないメッセージは fatal に分けて返す。
 * 評価器(scripts/evaluate-experiment.mjs)がこれを使う
 */
export function lintAtlasSources({ app, styles, options }) {
  const linter = new Linter();
  const config = [
    { files: ["**/*.tsx"], languageOptions: { parser: tseslint.parser, parserOptions: { ecmaFeatures: { jsx: true } } } },
    ...atlasConfigs({ options }),
  ];
  const messages = [
    ...linter.verify(app, config, { filename: "src/App.tsx" }),
    ...linter.verify(styles, config, { filename: "src/styles.css" }),
  ];
  const messagesByRule = new Map(Object.keys(rules).map((name) => [name, []]));
  const fatal = [];
  for (const message of messages) {
    if (!message.ruleId) {
      fatal.push(message);
      continue;
    }
    messagesByRule.get(message.ruleId.replace(/^atlas\//, "")).push(message);
  }
  return { messagesByRule, fatal };
}

export default plugin;
