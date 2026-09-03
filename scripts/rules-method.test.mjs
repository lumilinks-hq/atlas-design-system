import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { evaluateSource } from "./evaluate-experiment.mjs";
import { rootDir } from "./lib.mjs";

// design/rules.jsonのmethod宣言と、実際の判定手段が食い違っていないかを守る契約テスト。
//
// 判定手段の確認にはmvp-11 harness-correctedのソースを「アンカー」として使う。
// つまりここで見ているのは任意のソースに対する普遍的な制約ではなく、
// このソースを入力したときの実測結果である。別ソースでは同じruleでも結果が変わりうる:
//   - automaticのcomponent.variantsは、動的variantを含むソースではreviewを返す設計
//   - automaticのlayout.groupingは、measurementsが無いソースではreviewにフォールバックする
// それでも「同一入力に対してhumanのruleがpassed/failedになる」ような食い違いは
// 判定手段の宣言が誤っている証拠になるため、アンカーとして十分に機能する。

const correctedDir = resolve(
  rootDir,
  "experiments",
  "account-management",
  "runs",
  "mvp-11",
  "harness-corrected",
);

/** @type {{ id: string, method: string }[]} */
let declaredRules;
/** @type {Map<string, string>} */
let statusById;

beforeAll(async () => {
  const [app, fixtures, styles, componentTheme, measurements, rulesDocument] = await Promise.all([
    readFile(resolve(correctedDir, "source", "App.tsx"), "utf8"),
    readFile(resolve(correctedDir, "source", "fixtures.ts"), "utf8"),
    readFile(resolve(correctedDir, "source", "styles.css"), "utf8"),
    readFile(resolve(rootDir, "design", "component-theme.css"), "utf8"),
    // 幾何実測込みで判定するruleがあるため、check-design-conformanceと同じmeasurementsを渡す
    readFile(resolve(correctedDir, "measurements.json"), "utf8").then(JSON.parse),
    readFile(resolve(rootDir, "design", "rules.json"), "utf8").then(JSON.parse),
  ]);

  declaredRules = rulesDocument.rules;
  const evaluated = evaluateSource({ app, fixtures, styles, componentTheme, measurements });
  statusById = new Map(evaluated.map((rule) => [rule.id, rule.status]));
});

/** 宣言methodがmethodValueのruleについて、statusが期待集合から外れたものを列挙する */
function violations(methodValue, allowedStatuses) {
  return declaredRules
    .filter((rule) => rule.method === methodValue)
    .map((rule) => ({ id: rule.id, status: statusById.get(rule.id) }))
    .filter((entry) => !allowedStatuses.includes(entry.status));
}

describe("rules.jsonのmethod宣言と判定実装の整合（mvp-11 harness-correctedを入力にした実測）", () => {
  it("automaticのruleはこの入力に対して機械判定（passed/failed）が付く", () => {
    expect(violations("automatic", ["passed", "failed"])).toEqual([]);
  });

  it("lintのruleはESLint経由で機械判定（passed/failed）が付く", () => {
    // component.variantsだけは動的variantが混ざるとreviewになる設計なので、この入力ではpassedを確認する
    expect(violations("lint", ["passed", "failed"])).toEqual([]);
  });

  it("ai-reviewのruleは機械判定せずreviewを返す", () => {
    expect(violations("ai-review", ["review"])).toEqual([]);
  });

  it("humanのruleは機械判定せずreviewを返す", () => {
    // 修正後はhumanのruleが0件になる想定で、その場合このテストは空集合を確認するだけになる。
    // humanという選択肢自体はスキーマに残るため、宣言が復活したときに備えて検査は残す。
    expect(violations("human", ["review"])).toEqual([]);
  });
});

describe("selectReviewRuleIds", () => {
  it("rules.jsonのai-review宣言からレビュー対象ruleを選ぶ", async () => {
    // 未実装の段階でもこのテストだけが落ちるよう、静的importではなく動的importで受ける
    const module = await import("./review-experiment.mjs");
    expect(typeof module.selectReviewRuleIds).toBe("function");

    const rulesDocument = JSON.parse(
      await readFile(resolve(rootDir, "design", "rules.json"), "utf8"),
    );
    const expected = rulesDocument.rules
      .filter((rule) => rule.method === "ai-review")
      .map((rule) => rule.id);

    expect([...module.selectReviewRuleIds(rulesDocument)].sort()).toEqual([...expected].sort());
  });
});
