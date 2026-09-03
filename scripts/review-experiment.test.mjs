import { describe, expect, it } from "vitest";
import { parseReviewFindings } from "./review-experiment.mjs";

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
