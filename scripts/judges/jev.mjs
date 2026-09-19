import { resolve } from "node:path";
import { inventoryRun } from "./evidence.mjs";
import { buildQuestions, supportedRuleIds } from "./questions.mjs";

/**
 * TypeSafe の Jev で、ソースから取り出した箇所を 1 件ずつ判定する。
 * 何を聞くかは questions.mjs、ここは呼び出しと集計だけ
 * @typedef {import("./evidence.mjs").SourceInventory} SourceInventory
 * @typedef {import("../harness-dispatch.mjs").Judgment & { details?: { subject: string, probability: number }[] }} Judgment
 * @typedef {{ systemOne: (request: { state: unknown, questions: object, model: string }) => Promise<{ model?: string, answers: Record<string, { noul: number }>, usage?: { input_tokens: number, output_tokens: number } }> }} SystemOneClient
 */

// エイリアスではなく版で固定する。版を上げたら保存済み Run で精度を測り直す
export const defaultJevModel = "jev-1.13.0";
const concurrency = 4;

function round(value) {
  return Math.round(Math.min(Math.max(value, 0), 1) * 1000) / 1000;
}

/** 並べた順に始め、同時に limit 件まで動かす */
async function mapWithConcurrency(items, limit, task) {
  const results = new Array(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const index = next;
      next += 1;
      results[index] = await task(items[index]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

async function sdkClient() {
  // テストでは偽の client を渡すので、SDK は使うときにだけ読む。鍵は SDK が TYPESAFE_API_KEY から読む
  const { TypeSafeClient } = await import("@typesafe-ai/sdk");
  return new TypeSafeClient();
}

function noteOf(plan, details, askedCount) {
  const decidedCount = details.length - askedCount;
  const parts = [];
  if (details.length > 0) {
    const [top] = details;
    parts.push(`最大は ${top.subject}（${top.probability}）`);
    parts.push(`コードで ${decidedCount} 件、Jev で ${askedCount} 件を判定`);
  } else {
    parts.push("判定する箇所はなかった");
  }
  if (plan.note) parts.push(plan.note);
  return parts.join("。");
}

/**
 * @param {{ client?: SystemOneClient, model?: string }} [options]
 */
export function createJevJudge({ client, model = defaultJevModel } = {}) {
  let resolvedClient = client;

  /**
   * @param {SourceInventory} inventory
   * @param {{ ruleIds: string[], iteration: number, now?: Date }} options
   * @returns {Promise<{ judgments: Judgment[], skipped: string[], usage: { calls: number, inputTokens: number, outputTokens: number } }>}
   */
  async function judgeInventory(inventory, { ruleIds, iteration, now = new Date() }) {
    const plans = [];
    const skipped = [];
    for (const ruleId of ruleIds) {
      const plan = buildQuestions(ruleId, inventory);
      if (plan) plans.push({ ruleId, plan });
      else skipped.push(ruleId);
    }

    // ルールをまたいで 1 本の列にし、同時に呼ぶ数をそろえる
    const asks = plans.flatMap(({ ruleId, plan }) => plan.ask.map((item) => ({ ruleId, item })));
    if (asks.length > 0) resolvedClient ??= await sdkClient();
    const usage = { calls: 0, inputTokens: 0, outputTokens: 0 };
    const models = new Set();
    const answered = await mapWithConcurrency(asks, concurrency, async ({ ruleId, item }) => {
      const result = await resolvedClient.systemOne({ state: item.state, questions: item.questions, model });
      usage.calls += 1;
      usage.inputTokens += result.usage?.input_tokens ?? 0;
      usage.outputTokens += result.usage?.output_tokens ?? 0;
      if (result.model) models.add(result.model);
      const values = {};
      for (const key of Object.keys(item.questions)) {
        const value = result.answers?.[key]?.noul;
        if (typeof value !== "number") throw new Error(`${ruleId} ${item.subject}: Jev の答えに ${key} がありません`);
        values[key] = value;
      }
      return { ruleId, subject: item.subject, probability: round(item.violation(values)) };
    });
    // 応答に書かれたモデルを記録する。送ったものと違えば、実際に答えたほうを残す
    const answeredBy = models.size > 0 ? [...models].join(",") : model;

    const judgedAt = now.toISOString();
    const judgments = plans.map(({ ruleId, plan }) => {
      if (plan.insufficient) {
        return { ruleId, evidenceSufficient: false, note: "ソースに判定する箇所がない。モデルには聞いていない", model, judgedAt, iteration };
      }
      const asked = answered.filter((item) => item.ruleId === ruleId).map(({ subject, probability }) => ({ subject, probability }));
      const details = [...asked, ...plan.decided.map(({ subject, probability }) => ({ subject, probability }))].sort((a, b) => b.probability - a.probability);
      return {
        ruleId,
        probability: details.length > 0 ? details[0].probability : 0,
        evidenceSufficient: true,
        note: noteOf(plan, details, asked.length),
        details,
        model: asked.length > 0 ? answeredBy : model,
        judgedAt,
        iteration,
      };
    });
    return { judgments, skipped, usage };
  }

  return {
    id: "jev",
    ruleIds: supportedRuleIds,
    // CLI が呼ぶ前に確かめる。値は SDK が読むので、ここでは名前だけ持つ
    requiredEnv: ["TYPESAFE_API_KEY"],
    judgeInventory,
    /**
     * Run の source を読んで判定する
     * @param {{ runDir: string, ruleIds: string[], iteration: number, now?: Date }} options
     */
    async judge({ runDir, ...options }) {
      return judgeInventory(await inventoryRun(resolve(runDir, "source")), options);
    },
  };
}
