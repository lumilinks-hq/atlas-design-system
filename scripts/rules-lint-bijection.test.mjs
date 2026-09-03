import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { ruleIdByPluginRule, rules } from "eslint-plugin-atlas";
import { rootDir } from "./lib.mjs";

// design/rules.json で method="lint" と宣言した rule と、eslint-plugin-atlas の rule が
// 過不足なく 1 対 1 に対応していることを守る。片方だけ増やすと落ちる
describe("rules.json の lint 宣言と eslint-plugin-atlas の対応", () => {
  it("method=lint の id 集合と plugin の対応表が一致する", async () => {
    const rulesDocument = JSON.parse(await readFile(resolve(rootDir, "design", "rules.json"), "utf8"));
    const declared = rulesDocument.rules.filter((rule) => rule.method === "lint").map((rule) => rule.id).sort();
    const mapped = Object.values(ruleIdByPluginRule).sort();
    expect(declared).toEqual(mapped);
    expect(Object.keys(ruleIdByPluginRule).sort()).toEqual(Object.keys(rules).sort());
  });

  it("lint の rule は fix に plugin の rule 名を含む", async () => {
    const rulesDocument = JSON.parse(await readFile(resolve(rootDir, "design", "rules.json"), "utf8"));
    const pluginRuleById = Object.fromEntries(Object.entries(ruleIdByPluginRule).map(([name, id]) => [id, name]));
    for (const rule of rulesDocument.rules.filter((item) => item.method === "lint")) {
      expect(rule.fix, rule.id).toContain(`atlas/${pluginRuleById[rule.id]}`);
    }
  });
});
