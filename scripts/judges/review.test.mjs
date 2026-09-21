// @vitest-environment node
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { rootDir } from "../lib.mjs";
import { createReviewJudge, judgmentsFromReview } from "./review.mjs";

const review = {
  model: "gpt-5.4",
  reviewedAt: "2026-09-02T01:57:33.148Z",
  findings: [
    { ruleId: "a11y.control-name", verdict: "concern", note: "名前が確認できない" },
    { ruleId: "a11y.color-only", verdict: "pass", note: "文字でも表示している" },
  ],
};

describe("judgmentsFromReview", () => {
  it("LLM レビューの所見を verdict の判定に写す。確率は付けない", () => {
    const result = judgmentsFromReview(review, { ruleIds: ["a11y.control-name", "a11y.color-only"], iteration: 1 });
    expect(result.judgments).toEqual([
      { ruleId: "a11y.control-name", verdict: "concern", note: "名前が確認できない", model: "gpt-5.4", judgedAt: "2026-09-02T01:57:33.148Z", iteration: 1 },
      { ruleId: "a11y.color-only", verdict: "pass", note: "文字でも表示している", model: "gpt-5.4", judgedAt: "2026-09-02T01:57:33.148Z", iteration: 1 },
    ]);
    expect(result.skipped).toEqual([]);
  });

  it("所見のないルールは skipped に返す", () => {
    const result = judgmentsFromReview(review, { ruleIds: ["a11y.control-name", "state.failure"], iteration: 0 });
    expect(result.judgments.map((item) => item.ruleId)).toEqual(["a11y.control-name"]);
    expect(result.skipped).toEqual(["state.failure"]);
  });
});

describe("createReviewJudge", () => {
  it("保存済み Run の design-evaluation.json から読む", async () => {
    const runDir = resolve(rootDir, "experiments/account-management/runs/mvp-11/harness");
    const ruleIds = ["a11y.control-name", "a11y.error-recovery", "a11y.color-only", "state.failure", "color.semantic"];
    const { judgments, usage } = await createReviewJudge().judge({ runDir, ruleIds, iteration: 0 });
    expect(judgments.map((item) => item.ruleId)).toEqual(ruleIds);
    expect(judgments.every((item) => item.model === "gpt-5.4")).toBe(true);
    expect(usage).toEqual({ calls: 0, inputTokens: 0, outputTokens: 0 });
  });

  it("レビューがなければ、先にレビューを実行するよう伝える", async () => {
    expect(() => judgmentsFromReview(undefined, { ruleIds: [], iteration: 0 })).toThrow(/experiment:review/);
  });
});
