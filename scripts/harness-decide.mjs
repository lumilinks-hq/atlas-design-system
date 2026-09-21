import Ajv2020 from "ajv/dist/2020.js";
import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { auditText } from "./audit-public-data.mjs";
import { countRefinements, dispatch, formatNextStep, loadRunInput } from "./harness-dispatch.mjs";
import { parseArgs, rootDir } from "./lib.mjs";
import { experimentPaths, resolveExperimentName } from "./workspace-paths.mjs";

/** @typedef {import("./harness-dispatch.mjs").Decision} Decision */

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

const ajv = new Ajv2020({ allErrors: true, strict: true });
const validateDecisions = ajv.compile(await readJson(resolve(rootDir, "design", "schemas", "decisions.schema.json")));
const decisionValues = ["accept", "reject", "defer"];

/**
 * CLI の引数から 1 件の判断を組み立てる。ファイルは読まない
 * @param {{ ruleId?: unknown, decision?: unknown, reason?: unknown, by?: unknown }} fields
 * @param {{ ruleIds: Set<string>, iteration: number, now?: Date, usernames?: string[] }} options
 * @returns {Decision}
 */
export function createDecision(fields, options) {
  const { ruleId, decision, reason, by } = fields;
  if (typeof ruleId !== "string" || !options.ruleIds.has(ruleId)) {
    throw new Error(`--rule ${String(ruleId)} はこの Run の評価にありません`);
  }
  if (typeof decision !== "string" || !decisionValues.includes(decision)) {
    throw new Error("--decision は accept、reject、defer のどれかにしてください");
  }
  // parseArgs は値のない引数を true にするので、文字列かどうかも見る
  if (typeof reason !== "string" || reason.trim() === "") throw new Error("--reason に判断の理由を書いてください");
  if (typeof by !== "string" || by.trim() === "") throw new Error("--by に判断した人の役割名を書いてください");

  const record = {
    ruleId,
    decision,
    reason: reason.trim(),
    decidedBy: by.trim(),
    decidedAt: (options.now ?? new Date()).toISOString(),
    iteration: options.iteration,
  };
  // Run は公開するので、手元のユーザー名やパスが入らないようにする
  const findings = auditText(JSON.stringify(record), "", { usernames: options.usernames });
  if (findings.some((finding) => finding.id === "local-user-name" && finding.match === record.decidedBy)) {
    throw new Error("--by には OS のユーザー名ではなく役割名（例: design-system-owner）を書いてください");
  }
  if (findings.length > 0) {
    throw new Error(`公開できない文字列が入っています: ${findings.map((finding) => finding.id).join(", ")}`);
  }
  return record;
}

/**
 * 判断を後ろに足す。前の判断は消さない（振り分けは同じルールの最後の判断を使う）
 * @param {{ decisions: Decision[] }} document
 * @param {Decision} decision
 */
export function appendDecision(document, decision) {
  const next = { ...document, decisions: [...document.decisions, decision] };
  if (!validateDecisions(next)) throw new Error(`decisions.json: ${ajv.errorsText(validateDecisions.errors)}`);
  return next;
}

/**
 * Run ディレクトリの decisions.json に判断を追記する。run.json は書き換えない
 * @param {string} runDir
 * @param {Parameters<typeof createDecision>[0]} fields
 * @param {{ now?: Date, usernames?: string[] }} [options]
 */
export async function recordDecision(runDir, fields, options = {}) {
  const run = await readJson(resolve(runDir, "run.json"));
  const evaluation = await readJson(resolve(runDir, "design-evaluation.json"));
  const decision = createDecision(fields, {
    ...options,
    ruleIds: new Set(evaluation.rules.map((rule) => rule.id)),
    iteration: countRefinements(run.artifacts),
  });
  const path = resolve(runDir, "decisions.json");
  const current = existsSync(path)
    ? await readJson(path)
    : { $schema: "../../../../../design/schemas/decisions.schema.json", decisions: [] };
  const document = appendDecision(current, decision);
  await writeFile(path, `${JSON.stringify(document, null, 2)}\n`);
  return decision;
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const args = parseArgs(process.argv.slice(2));
  if (typeof args.pair !== "string") throw new Error("--pairを指定してください");
  const experiment = resolveExperimentName(args);
  // refine が修正するのは harness-corrected なので、既定もそれにする
  const mode = typeof args.mode === "string" ? args.mode : "harness-corrected";
  const runDir = resolve(experimentPaths(experiment).runsDir, args.pair, mode);
  const decision = await recordDecision(runDir, { ruleId: args.rule, decision: args.decision, reason: args.reason, by: args.by });
  console.log(`${args.pair}/${mode}: ${decision.ruleId} を ${decision.decision} として記録しました（decisions.json）`);
  const policy = await readJson(resolve(rootDir, "design", "harness-policy.json"));
  console.log(formatNextStep(`${args.pair}/${mode}`, dispatch(await loadRunInput(runDir), policy)));
}
