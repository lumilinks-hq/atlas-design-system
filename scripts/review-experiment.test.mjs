import { describe, expect, it } from "vitest";
import { buildCaptureTargets } from "./capture-targets.mjs";
import { formatReviewImages, parseReviewFindings, selectReviewTargets } from "./review-experiment.mjs";

describe("parseReviewFindings", () => {
  it("素のJSONからfindingsを取り出す", () => {
    const text = '{"findings":[{"ruleId":"layout.grouping","verdict":"pass","note":"間隔で所属が読める"}]}';
    expect(parseReviewFindings(text)).toEqual([
      { ruleId: "layout.grouping", verdict: "pass", note: "間隔で所属が読める" },
    ]);
  });

  it("コードフェンスや前置き付きの出力からもfindingsを取り出す", () => {
    const text = [
      "所見は次の通りです。",
      "```json",
      '{ "findings": [ { "ruleId": "color.semantic", "verdict": "concern", "note": "dangerが装飾に見える" } ] }',
      "```",
    ].join("\n");
    expect(parseReviewFindings(text)).toEqual([
      { ruleId: "color.semantic", verdict: "concern", note: "dangerが装飾に見える" },
    ]);
  });

  it("JSONが無い出力はundefinedを返す", () => {
    expect(parseReviewFindings("画像を確認しました。特に問題ありません。")).toBeUndefined();
  });

  it("findings配列が無いJSONはundefinedを返す", () => {
    expect(parseReviewFindings('{"summary":"ok"}')).toBeUndefined();
  });

  it("verdictがpass/concern以外、または必須キー欠落の要素を含む場合はundefinedを返す", () => {
    expect(parseReviewFindings('{"findings":[{"ruleId":"a","verdict":"fail","note":"x"}]}')).toBeUndefined();
    expect(parseReviewFindings('{"findings":[{"ruleId":"a","verdict":"pass"}]}')).toBeUndefined();
  });

  it("findingsの前後に余分なJSONが混ざっても最後のfindingsオブジェクトを取り出す", () => {
    const text = '{"thinking":"..."}\n{"findings":[{"ruleId":"a","verdict":"pass","note":"ok"}]}';
    expect(parseReviewFindings(text)).toEqual([{ ruleId: "a", verdict: "pass", note: "ok" }]);
  });
});

describe("selectReviewTargets", () => {
  const contract = {
    screens: [
      { id: "collection", route: "/things" },
      { id: "detail", route: "/things/one", overlays: [{ component: "component.drawer" }] },
    ],
  };
  const targets = buildCaptureTargets(contract, { requiredStates: ["default", "invalid-email", "failure"] });

  it("既定の状態と失敗状態を渡し、入力検証の画面は渡さない", () => {
    expect(selectReviewTargets(targets, "harness-corrected").map((target) => target.suffix)).toEqual([
      "",
      "-detail",
      "-mobile",
      "-detail-mobile",
      "-failure",
    ]);
  });

  it("どのモードにも同じ画面を渡す", () => {
    const suffixes = (mode) => selectReviewTargets(targets, mode).map((target) => target.suffix);
    expect(suffixes("baseline")).toEqual(suffixes("harness-corrected"));
  });
});

describe("formatReviewImages", () => {
  it("画像ごとにファイル名、画面、viewport、状態を順に書く", () => {
    const targets = [
      { screenId: "collection", state: "default", suffix: "", viewport: { name: "desktop" } },
      { screenId: "detail", state: "failure", suffix: "-failure", viewport: { name: "desktop" } },
    ];
    expect(formatReviewImages(targets, "harness")).toBe(
      ["1. harness.png: collection 画面、desktop、既定の状態", "2. harness-failure.png: detail 画面、desktop、失敗した状態"].join("\n"),
    );
  });
});
