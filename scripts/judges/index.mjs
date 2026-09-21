import { createJevJudge } from "./jev.mjs";
import { createReviewJudge } from "./review.mjs";

// 判定の CLI はこのレジストリ経由でしかモデルを触らない。別のモデルは adapter を 1 つ足せば使える
const factories = new Map([
  ["jev", createJevJudge],
  ["review", createReviewJudge],
]);

export function listJudgeIds() {
  return [...factories.keys()];
}

/** 名前から判定器を作る。未知の名前は例外 */
export function resolveJudge(id, options = {}) {
  const create = factories.get(id);
  if (!create) throw new Error(`未知の判定器です: ${id}（使用可能: ${listJudgeIds().join(", ")}）`);
  return create(options);
}
