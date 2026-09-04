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
import { dirname } from "node:path";
import { collectScreenSourcesSync } from "./screen-sources.mjs";

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

/** processor が作る仮想ファイル。App.tsx から import で辿れる画面全体を 1 本に連結したもの */
export const screenBlockGlob = "**/App.tsx/*_screen.tsx";
const isEntryRuleId = (ruleId) => entryFileRules.includes(ruleId?.replace(/^atlas\//, ""));

/**
 * src/App.tsx を lint するとき、import で辿れる .tsx を連結した「画面」ブロックを足す processor。
 * 存在判定系(entryFileRules)はこのブロックにだけ適用し、App.tsx 単体には適用しない。
 * これで生成物を複数ファイルに分けても workspace の pnpm lint が誤検知しない
 */
const screenProcessor = {
  meta: { name: "atlas/screen", version: "0.1.0" },
  preprocess(text, filename) {
    const sources = collectScreenSourcesSync(dirname(filename), { entryText: text });
    // 本文が App.tsx と同一だと ESLint がブロックの設定を再解決しないので、末尾に印を足して必ず別内容にする
    return [text, { text: `${sources.app}\n// atlas:screen\n`, filename: "screen.tsx" }];
  },
  postprocess([own = [], screen = []], filename) {
    void filename;
    // 画面ブロック側は存在判定だけを採用し、行番号は App.tsx の範囲外なら 1:1 に寄せる
    const entryMessages = screen
      .filter((message) => isEntryRuleId(message.ruleId))
      .map((message) => ({ ...message, line: 1, column: 1, endLine: undefined, endColumn: undefined, fix: undefined }));
    return [...own.filter((message) => !isEntryRuleId(message.ruleId)), ...entryMessages];
  },
};

const plugin = { meta: { name: "eslint-plugin-atlas", version: "0.1.0" }, rules, processors: { screen: screenProcessor } };

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
export function atlasConfigs({ options, tsxFiles = ["**/*.tsx"], entryFile = "src/App.tsx", cssFiles = ["**/*.css"], entryStyles = "src/styles.css", screen = false }) {
  const tsxRuleNames = Object.keys(rules).filter((name) => !cssRules.includes(name) && !entryFileRules.includes(name));
  const cssRuleNames = cssRules.filter((name) => !entryStylesRules.includes(name));
  // screen: true では App.tsx を processor に通し、存在判定は連結した画面ブロックにだけ適用する
  const entryFiles = screen ? [screenBlockGlob] : [entryFile];
  return [
    ...(screen ? [{ name: "atlas/screen", files: ["**/App.tsx"], ignores: [screenBlockGlob], processor: screenProcessor }] : []),
    { name: "atlas/tsx", files: tsxFiles, ...(screen ? { ignores: [screenBlockGlob] } : {}), plugins: { atlas: plugin }, rules: ruleEntries(tsxRuleNames, options) },
    { name: "atlas/tsx-entry", files: entryFiles, plugins: { atlas: plugin }, rules: ruleEntries(entryFileRules, options) },
    { name: "atlas/css", files: cssFiles, plugins: { css, atlas: plugin }, language: "css/css", rules: ruleEntries(cssRuleNames, options) },
    { name: "atlas/css-entry", files: [entryStyles], plugins: { css, atlas: plugin }, language: "css/css", rules: ruleEntries(entryStylesRules, options) },
  ];
}

/**
 * 画面ソースを同期で lint し、plugin rule 名ごとの messages を返す。
 * 構文エラーなど rule に属さないメッセージは fatal に分けて返す。
 * 評価器(scripts/evaluate-experiment.mjs)がこれを使う
 *
 * - app: 画面を構成する .tsx を App.tsx を先頭に連結した文字列。存在判定系(entryFileRules)は
 *   画面を複数ファイルに分けても誤検知しないよう、この連結全体を src/App.tsx として検査する
 * - tsxFiles: 省略可。渡すとファイル内で完結するルールは各ファイルを実名で検査し、
 *   message.filename に由来ファイルを付ける(単一ファイルなら省略時と同じ結果)
 */
export function lintAtlasSources({ app, styles, options, tsxFiles }) {
  const linter = new Linter();
  const config = [
    { files: ["**/*.tsx"], languageOptions: { parser: tseslint.parser, parserOptions: { ecmaFeatures: { jsx: true } } } },
    ...atlasConfigs({ options }),
  ];
  const isEntryRule = (message) => entryFileRules.includes(message.ruleId?.replace(/^atlas\//, ""));
  const withFilename = (messages, filename) => messages.map((message) => ({ ...message, filename }));
  const files = tsxFiles ?? [{ filename: "src/App.tsx", text: app }];
  const singleEntry = files.length === 1 && files[0].filename === "src/App.tsx" && files[0].text === app;
  const messages = singleEntry
    ? withFilename(linter.verify(app, config, { filename: "src/App.tsx" }), "src/App.tsx")
    : [
        // 存在判定は連結した画面全体で 1 回
        ...withFilename(linter.verify(app, config, { filename: "src/App.tsx" }).filter((message) => isEntryRule(message) || !message.ruleId), "src/App.tsx"),
        // ファイル内ルールは各ファイルを実名で
        ...files.flatMap((file) =>
          withFilename(linter.verify(file.text, config, { filename: file.filename }).filter((message) => message.ruleId && !isEntryRule(message)), file.filename),
        ),
      ];
  messages.push(...withFilename(linter.verify(styles, config, { filename: "src/styles.css" }), "src/styles.css"));
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
