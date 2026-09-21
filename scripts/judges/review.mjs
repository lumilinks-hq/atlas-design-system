import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

/**
 * 画面画像の LLM レビュー（pnpm experiment:review）の所見を、判定として写す。
 * 新しくモデルは呼ばない。確率は返さないので verdict だけを持つ
 * @typedef {import("../harness-dispatch.mjs").Judgment} Judgment
 * @typedef {{ model: string, reviewedAt: string, findings: { ruleId: string, verdict: "pass" | "concern", note: string }[] }} Review
 */

/**
 * @param {Review | undefined} review design-evaluation.json の review
 * @param {{ ruleIds: string[], iteration: number }} options
 * @returns {{ judgments: Judgment[], skipped: string[], usage: { calls: number, inputTokens: number, outputTokens: number } }}
 */
export function judgmentsFromReview(review, { ruleIds, iteration }) {
  if (!review) throw new Error("design-evaluation.json に LLM レビューがありません。先に pnpm experiment:review を実行してください");
  const byRule = new Map(review.findings.map((finding) => [finding.ruleId, finding]));
  const judgments = [];
  const skipped = [];
  for (const ruleId of ruleIds) {
    const finding = byRule.get(ruleId);
    if (!finding) {
      skipped.push(ruleId);
      continue;
    }
    judgments.push({ ruleId, verdict: finding.verdict, note: finding.note, model: review.model, judgedAt: review.reviewedAt, iteration });
  }
  return { judgments, skipped, usage: { calls: 0, inputTokens: 0, outputTokens: 0 } };
}

export function createReviewJudge() {
  return {
    id: "review",
    /**
     * @param {{ runDir: string, ruleIds: string[], iteration: number }} options
     */
    async judge({ runDir, ruleIds, iteration }) {
      const evaluation = JSON.parse(await readFile(resolve(runDir, "design-evaluation.json"), "utf8"));
      return judgmentsFromReview(evaluation.review, { ruleIds, iteration });
    },
  };
}
