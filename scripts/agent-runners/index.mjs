import { claudeRunner } from "./claude.mjs";
import { codexRunner } from "./codex.mjs";

// 実験スクリプトはこのレジストリ経由でしかCLIを触らない。新しいCLIは adapter を1つ足せば使える
const runners = new Map([codexRunner, claudeRunner].map((runner) => [runner.id, runner]));

export function listRunnerIds() {
  return [...runners.keys()];
}

/** 名前からrunner adapterを引く。未知の名前は例外 */
export function resolveRunner(id) {
  const runner = runners.get(id);
  if (!runner) throw new Error(`未知のrunnerです: ${id}（使用可能: ${listRunnerIds().join(", ")}）`);
  return runner;
}

/** --runner 引数 → AGENT_RUNNER 環境変数 → codex の順で決める */
export function defaultRunnerId(args = {}, env = process.env) {
  if (typeof args.runner === "string") return args.runner;
  if (typeof env.AGENT_RUNNER === "string" && env.AGENT_RUNNER !== "") return env.AGENT_RUNNER;
  return "codex";
}
