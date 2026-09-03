import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { buildAtlasLintOptions } from "../src/options.mjs";
import { lintAtlasSources, ruleIdByPluginRule } from "../src/index.mjs";

// mvp-11 の保存ソースをアンカーにして、移行した 12 ルールが評価器と同じ合否を返すことを確かめる
const rootDir = resolve(import.meta.dirname, "..", "..", "..");
const runsDir = resolve(rootDir, "experiments", "account-management", "runs", "mvp-11");
const options = buildAtlasLintOptions({
  componentsDir: resolve(rootDir, "design", "components"),
  examplePath: resolve(rootDir, "design", "examples", "account-management.json"),
});

function lintRun(mode) {
  const dir = resolve(runsDir, mode, "source");
  const app = readFileSync(resolve(dir, "App.tsx"), "utf8");
  const styles = readFileSync(resolve(dir, "styles.css"), "utf8");
  const lint = lintAtlasSources({ app, styles, options });
  expect(lint.fatal).toEqual([]);
  return lint.messagesByRule;
}

function failedRuleIds(messagesByRule) {
  return [...messagesByRule.entries()]
    .filter(([, messages]) => messages.length > 0)
    .map(([rule]) => ruleIdByPluginRule[rule])
    .sort();
}

describe("mvp-11 の保存ソースに対する lint 結果", () => {
  it("harness-corrected は 12 ルールすべてに違反しない", () => {
    const messages = lintRun("harness-corrected");
    expect(messages.size).toBe(12);
    expect(failedRuleIds(messages)).toEqual([]);
  });

  it("baseline は保存済み評価と同じ 9 ルールに違反する", () => {
    expect(failedRuleIds(lintRun("baseline"))).toEqual(
      [
        "a11y.focus-management",
        "action.confirmation",
        "business.contact-email",
        "component.approved",
        "component.table.variant",
        "component.usage",
        "navigation.link-semantics",
        "token.no-raw-color",
        "token.radius",
      ].sort(),
    );
  });

  it("harness は Toolbar 未使用、確認ダイアログ、Drawer の 3 ルールに違反する", () => {
    expect(failedRuleIds(lintRun("harness"))).toEqual(
      ["a11y.focus-management", "action.confirmation", "component.usage"].sort(),
    );
  });

  it("options は design/ の契約から導かれ JSON 化できる", () => {
    expect(JSON.parse(JSON.stringify(options))).toEqual(options);
    expect(options.componentUsage.map((entry) => entry.implementation)).toContain("Toolbar");
    expect(options.approvedImports).toContain("Button");
    expect(options.tableVariant).toBe("primary");
  });
});
