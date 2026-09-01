import { describe, expect, it } from "vitest";
import { buildReviewArgs, parseReviewFindings } from "./review-experiment.mjs";

describe("buildReviewArgs", () => {
  it("可変長の-iにpromptが飲まれないよう--区切りの後にpromptを置く", () => {
    const args = buildReviewArgs({
      model: "gpt-5.4",
      images: ["/shots/a.png", "/shots/b.png"],
      prompt: "レビューしてください",
    });

    expect(args.at(-1)).toBe("レビューしてください");
    expect(args.at(-2)).toBe("--");
    const separatorIndex = args.indexOf("--");
    expect(args.indexOf("-i")).toBeGreaterThan(-1);
    expect(args.lastIndexOf("/shots/b.png")).toBeLessThan(separatorIndex);
  });
});

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
});
