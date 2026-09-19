import Ajv2020 from "ajv/dist/2020.js";
import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { auditText } from "./audit-public-data.mjs";
import { countRefinements, dispatch, formatNextStep, loadRunInput } from "./harness-dispatch.mjs";
import { resolveJudge } from "./judges/index.mjs";
import { parseArgs, rootDir } from "./lib.mjs";
import { experimentPaths, resolveExperimentName } from "./workspace-paths.mjs";

/**
 * Run のソースをモデルに判定させ、judgments.json に書く。
 * 振り分け（harness-dispatch）は同じルールでは LLM レビューよりこちらを使う
 * @typedef {import("./judges/jev.mjs").Judgment} Judgment
 * @typedef {{ judgments: Judgment[], skipped: string[], usage: { calls: number, inputTokens: number, outputTokens: number } }} JudgeResult
 * @typedef {{ id: string, requiredEnv?: string[], judge: (options: { runDir: string, ruleIds: string[], iteration: number, now?: Date }) => Promise<JudgeResult> }} Judge
 */

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

const ajv = new Ajv2020({ allErrors: true, strict: true });
const validateJudgments = ajv.compile(await readJson(resolve(rootDir, "design", "schemas", "judgments.schema.json")));

/** コードで決まらず review になったルール。振り分けがモデルの判定を見るのはこれだけ */
export function selectJudgeRuleIds(evaluation) {
  return evaluation.rules.filter((rule) => rule.status === "review").map((rule) => rule.id);
}

/**
 * 判定器が必要とする環境変数のうち、値のないもの
 * @param {{ requiredEnv?: string[] }} judge
 */
export function missingEnv(judge, env = process.env) {
  return (judge.requiredEnv ?? []).filter((name) => typeof env[name] !== "string" || env[name] === "");
}

/**
 * 判定を後ろに足す。前の判定は消さない（振り分けは同じルールの最後の判定を使う）
 * @param {{ judge: string, judgments: Judgment[] } | undefined} document
 * @param {string} judgeId
 * @param {Judgment[]} judgments
 */
export function appendJudgments(document, judgeId, judgments) {
  const current = document ?? { $schema: "../../../../../design/schemas/judgments.schema.json", judge: judgeId, judgments: [] };
  if (current.judge !== judgeId) {
    throw new Error(`judgments.json は ${current.judge} の判定です。${judgeId} の判定は混ぜられません`);
  }
  const next = { ...current, judgments: [...current.judgments, ...judgments] };
  if (!validateJudgments(next)) throw new Error(`judgments.json: ${ajv.errorsText(validateJudgments.errors)}`);
  return next;
}

/**
 * Run を 1 本判定する。ファイルには書かない
 * @param {string} runDir
 * @param {Judge} judge
 * @param {{ now?: Date }} [options]
 */
export async function judgeRun(runDir, judge, options = {}) {
  const run = await readJson(resolve(runDir, "run.json"));
  const evaluation = await readJson(resolve(runDir, "design-evaluation.json"));
  const iteration = countRefinements(run.artifacts);
  const result = await judge.judge({ runDir, ruleIds: selectJudgeRuleIds(evaluation), iteration, ...options });
  return { iteration, ...result };
}

/**
 * Run ディレクトリの judgments.json に判定を追記する。run.json は書き換えない
 * @param {string} runDir
 * @param {string} judgeId
 * @param {Judgment[]} judgments
 * @param {{ usernames?: string[] }} [options]
 */
export async function recordJudgments(runDir, judgeId, judgments, options = {}) {
  // Run は公開するので、手元のユーザー名やパスが入らないようにする
  const findings = auditText(JSON.stringify(judgments), "", { usernames: options.usernames });
  if (findings.length > 0) {
    throw new Error(`公開できない文字列が入っています: ${findings.map((finding) => finding.id).join(", ")}`);
  }
  const path = resolve(runDir, "judgments.json");
  const document = appendJudgments(existsSync(path) ? await readJson(path) : undefined, judgeId, judgments);
  await writeFile(path, `${JSON.stringify(document, null, 2)}\n`);
  return document;
}

function valueOf(judgment) {
  if (judgment.evidenceSufficient === false) return "材料不足";
  if (typeof judgment.probability === "number") return String(judgment.probability);
  return judgment.verdict ?? "";
}

function reasonOf(judgment) {
  if (judgment.evidenceSufficient === false) return "";
  if (typeof judgment.probability === "number") return judgment.details?.[0]?.subject ?? "";
  const note = judgment.note ?? "";
  return note.length > 60 ? `${note.slice(0, 60)}…` : note;
}

/**
 * 端末に出す表。ルール、確率か verdict、いちばん疑わしい箇所
 * @param {string} label
 * @param {{ iteration: number, judgments: Judgment[], skipped: string[] }} result
 */
export function formatJudgments(label, result) {
  const rows = result.judgments.map((judgment) => [judgment.ruleId, valueOf(judgment), reasonOf(judgment)]);
  const ruleWidth = Math.max(0, ...rows.map(([ruleId]) => ruleId.length));
  const valueWidth = Math.max(0, ...rows.map(([, value]) => value.length));
  const lines = [`${label}（修正 ${result.iteration} 回）`];
  for (const [ruleId, value, reason] of rows) {
    lines.push(`  ${ruleId.padEnd(ruleWidth)}  ${value.padEnd(valueWidth)}  ${reason}`.trimEnd());
  }
  if (result.skipped.length > 0) lines.push(`  判定していない: ${result.skipped.join(", ")}`);
  return lines.join("\n");
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const args = parseArgs(process.argv.slice(2));
  if (typeof args.pair !== "string") throw new Error("--pairを指定してください");
  const experiment = resolveExperimentName(args);
  const judge = resolveJudge(typeof args.judge === "string" ? args.judge : "jev");
  const missing = missingEnv(judge);
  if (missing.length > 0) {
    throw new Error(`${missing.join(", ")} がありません。.env.example をまねてリポジトリ直下の .env に書いてください`);
  }
  // LLM レビューの所見は振り分けが design-evaluation.json から直接読むので、書き写さない
  if (args.write === true && judge.id === "review") throw new Error("review は比べるための読み出しだけです。--write は使えません");

  const policy = await readJson(resolve(rootDir, "design", "harness-policy.json"));
  const modes = typeof args.mode === "string" ? [args.mode] : ["baseline", "harness", "harness-corrected"];
  const usage = { calls: 0, inputTokens: 0, outputTokens: 0 };
  for (const mode of modes) {
    const runDir = resolve(experimentPaths(experiment).runsDir, args.pair, mode);
    if (!existsSync(resolve(runDir, "design-evaluation.json"))) {
      if (typeof args.mode === "string") throw new Error(`${mode}: design-evaluation.jsonがありません`);
      continue;
    }
    const label = `${args.pair}/${mode}`;
    const result = await judgeRun(runDir, judge);
    console.log(formatJudgments(label, result));
    usage.calls += result.usage.calls;
    usage.inputTokens += result.usage.inputTokens;
    usage.outputTokens += result.usage.outputTokens;
    // 保存済み Run の中身を変えないよう、書き出すのは --write を付けたときだけ
    if (args.write === true) {
      await recordJudgments(runDir, judge.id, result.judgments);
      console.log(formatNextStep(label, dispatch(await loadRunInput(runDir), policy)));
    }
  }
  console.error(`${judge.id}: 呼び出し ${usage.calls} 回、入力 ${usage.inputTokens} トークン、出力 ${usage.outputTokens} トークン`);
}
