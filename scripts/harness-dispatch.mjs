import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs, rootDir } from "./lib.mjs";
import { experimentPaths, resolveExperimentName } from "./workspace-paths.mjs";

/**
 * @typedef {"fix" | "human" | "pass"} ItemStep
 * @typedef {"fix" | "human" | "advance"} RunStep
 * @typedef {{ id: string, status: "passed" | "failed" | "review", evidence: string[] }} RuleResult
 * @typedef {{ name: string, status: string, exitCode?: number }} RuntimeCheck
 * @typedef {{ ruleId: string, probability?: number, verdict?: "pass" | "concern", evidenceSufficient?: boolean, note?: string, model: string, judgedAt: string, iteration?: number }} Judgment
 * @typedef {{ ruleId: string, decision: "accept" | "reject" | "defer", reason: string, decidedBy: string, decidedAt: string, iteration?: number }} Decision
 * @typedef {{ rules: RuleResult[], checks: RuntimeCheck[], judgments: Judgment[], decisions: Decision[], iteration: number }} DispatchInput
 * @typedef {{ thresholds: { fix: number, pass: number }, maxFixIterations: number, requireApproval: string[], requiredChecks: string[] }} HarnessPolicy
 */

/** 同じルールに複数あれば後ろのものを使う（判断は追記していくため） */
function lastByRule(items) {
  const byRule = new Map();
  for (const item of items) byRule.set(item.ruleId, item);
  return byRule;
}

/**
 * ルールごとの判定。修正の前の判定は今のコードを見ていないので使わない
 * @param {DispatchInput} input
 */
function currentJudgments(input) {
  return lastByRule(input.judgments.filter((item) => item.iteration === undefined || item.iteration >= input.iteration));
}

/**
 * 判定を高、中間、低の帯に分ける。確率がなければ LLM レビューの verdict を使う
 * @param {Judgment} judgment
 * @param {HarnessPolicy["thresholds"]} thresholds
 */
function judgmentBand(judgment, thresholds) {
  if (typeof judgment.probability === "number") {
    if (judgment.probability >= thresholds.fix) return "high";
    if (judgment.probability <= thresholds.pass) return "low";
    return "middle";
  }
  if (judgment.verdict === "concern") return "middle";
  if (judgment.verdict === "pass") return "low";
  return undefined;
}

function ruleStep(rule, decision, judgment, policy) {
  if (decision?.decision === "accept") return { step: "pass", reason: "decision.accept" };
  if (decision?.decision === "reject") return { step: "fix", reason: "decision.reject" };
  if (decision?.decision === "defer") return { step: "human", reason: "decision.defer" };
  if (rule.status === "failed") return { step: "fix", reason: "check.failed" };
  if (rule.status === "passed") return { step: "pass", reason: "check.passed" };

  // review: コードでは決められないので、モデルの判定を見る
  if (!judgment) return { step: "human", reason: "judgment.missing" };
  if (judgment.evidenceSufficient === false) return { step: "human", reason: "judgment.insufficient" };
  const band = judgmentBand(judgment, policy.thresholds);
  if (band === undefined) return { step: "human", reason: "judgment.missing" };
  if (band === "high") return { step: "fix", reason: "judgment.high" };
  if (band === "middle") return { step: "human", reason: "judgment.middle" };
  if (policy.requireApproval.includes(rule.id)) return { step: "human", reason: "approval.required" };
  return { step: "pass", reason: "judgment.low" };
}

function checkStep(name, checks) {
  const check = checks.find((item) => item.name === name);
  if (!check) return { step: "human", reason: "runtime.missing" };
  if (check.status === "passed") return { step: "pass", reason: "runtime.passed" };
  return { step: "fix", reason: "runtime.failed" };
}

/**
 * 検査結果、モデルの判定、人の判断から次の工程を決める。ファイルは読まない
 * @param {DispatchInput} input
 * @param {HarnessPolicy} policy
 * @returns {{ step: RunStep, rules: { ruleId: string, step: ItemStep, reason: string }[], checks: { name: string, step: ItemStep, reason: string }[] }}
 */
export function dispatch(input, policy) {
  // 差し戻しは 1 回の修正で使い終わる。修正後の状態は、検査と判定、または新しい判断で決める
  const decisions = lastByRule(input.decisions);
  for (const [ruleId, item] of decisions) {
    if (item.decision === "reject" && (item.iteration ?? 0) < input.iteration) decisions.delete(ruleId);
  }
  const judgments = currentJudgments(input);
  // 修正が止まらなくならないよう、上限に達したら修正の代わりに人へ回す
  const limitReached = input.iteration >= policy.maxFixIterations;
  const limit = (result) => (result.step === "fix" && limitReached ? { step: "human", reason: "iteration.limit" } : result);

  const rules = input.rules.map((rule) => ({
    ruleId: rule.id,
    ...limit(ruleStep(rule, decisions.get(rule.id), judgments.get(rule.id), policy)),
  }));
  const checks = policy.requiredChecks.map((name) => ({ name, ...limit(checkStep(name, input.checks)) }));

  const steps = [...rules, ...checks].map((item) => item.step);
  const step = steps.includes("fix") ? "fix" : steps.includes("human") ? "human" : "advance";
  return { step, rules, checks };
}

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

const refinementEventsPattern = /^refinement-events(?:\.\d+)?\.jsonl$/;

/**
 * refine が修正をかけた回数。run-experiment の harness-corrected が最初にかける修正は比較の条件なので数えない
 * @param {string[]} artifacts run.json の artifacts
 */
export function countRefinements(artifacts) {
  return artifacts.filter((name) => refinementEventsPattern.test(name)).length;
}

/**
 * n 回目の修正の記録を置くファイル名。1 回目は保存済み Run と同じ名前にする
 * @param {number} iteration
 */
export function refinementArtifacts(iteration) {
  const suffix = iteration === 1 ? "" : `.${iteration}`;
  return { events: `refinement-events${suffix}.jsonl`, stderr: `refinement-stderr${suffix}.log` };
}

async function readOptionalJson(path) {
  return existsSync(path) ? readJson(path) : undefined;
}

/**
 * Run ディレクトリから振り分けの入力を組み立てる。
 * 判定は LLM レビューの findings と judgments.json の両方を使い、同じルールでは judgments.json を優先する。
 * 修正の回数は refine の記録から数える
 * @param {string} runDir
 * @returns {Promise<DispatchInput>}
 */
export async function loadRunInput(runDir) {
  const run = await readJson(resolve(runDir, "run.json"));
  const evaluation = await readJson(resolve(runDir, "design-evaluation.json"));
  const iteration = countRefinements(run.artifacts);
  const review = evaluation.review;
  // evaluate は review を消すので、残っている所見は今のコードを見たもの
  const reviewJudgments = (review?.findings ?? []).map((finding) => ({
    ruleId: finding.ruleId,
    verdict: finding.verdict,
    note: finding.note,
    model: review.model,
    judgedAt: review.reviewedAt,
    iteration,
  }));
  const judgments = (await readOptionalJson(resolve(runDir, "judgments.json")))?.judgments ?? [];
  const decisions = (await readOptionalJson(resolve(runDir, "decisions.json")))?.decisions ?? [];
  return {
    rules: evaluation.rules,
    checks: run.checks,
    judgments: [...reviewJudgments, ...judgments],
    decisions,
    iteration,
  };
}

const stepLabels = { fix: "修正", human: "人の判断", advance: "次工程へ", pass: "通過" };

const reasonLabels = {
  "check.failed": "コードの検査で違反",
  "check.passed": "コードの検査で合格",
  "judgment.missing": "判定がない",
  "judgment.insufficient": "判定の根拠が足りない",
  "judgment.high": "違反の確率が高い",
  "judgment.middle": "判定が中間",
  "judgment.low": "違反の確率が低い",
  "approval.required": "人の承認が要る",
  "decision.accept": "人が採用",
  "decision.reject": "人が差し戻し",
  "decision.defer": "人が保留",
  "iteration.limit": "修正回数の上限",
  "runtime.failed": "実行時の検査が失敗",
  "runtime.missing": "実行時の検査の記録がない",
  "runtime.passed": "実行時の検査が通過",
};

const extraFixReasons = new Set(["decision.reject", "judgment.high"]);

function ruleHeading(ruleId, titles) {
  const title = titles.get(ruleId);
  return title ? `${ruleId}: ${title}` : ruleId;
}

/**
 * 振り分けの「修正」と VALIDATION.md（failed のルールだけが載る）の差を、修正する AI への追加の指示にする。
 * 差がなければ undefined
 * @param {DispatchInput} input
 * @param {ReturnType<typeof dispatch>} result
 * @param {Map<string, string>} [titles] ルール ID と名前
 */
export function formatFixNotes(input, result, titles = new Map()) {
  const decisions = lastByRule(input.decisions);
  const judgments = currentJudgments(input);
  const failed = new Set(input.rules.filter((rule) => rule.status === "failed").map((rule) => rule.id));
  const extra = result.rules.filter((item) => item.step === "fix" && extraFixReasons.has(item.reason));
  const skipped = result.rules.filter((item) => failed.has(item.ruleId) && item.step !== "fix");
  if (extra.length === 0 && skipped.length === 0) return undefined;

  const lines = ["# 次の工程で決まった修正の範囲", ""];
  if (extra.length > 0) {
    lines.push("## 追加で修正するルール", "", "VALIDATION.mdの失敗項目に加えて、次のルールも修正してください。", "");
    for (const item of extra) {
      const evidence = item.reason === "decision.reject" ? decisions.get(item.ruleId)?.reason : judgments.get(item.ruleId)?.note;
      lines.push(`### ${ruleHeading(item.ruleId, titles)}`, "", `- 理由: ${reasonLabels[item.reason]}`);
      if (evidence) lines.push(`- 根拠: ${evidence}`);
      lines.push("");
    }
  }
  if (skipped.length > 0) {
    lines.push("## 修正しないルール", "", "VALIDATION.mdに載っていても、次のルールは修正しないでください。", "");
    for (const item of skipped) lines.push(`- ${ruleHeading(item.ruleId, titles)}（${reasonLabels[item.reason]}）`);
    lines.push("");
  }
  return lines.join("\n");
}

/** 通過以外の項目だけを 1 行ずつ並べる */
export function formatNextStep(label, result) {
  const lines = [`${label}: ${stepLabels[result.step]}`];
  for (const item of [...result.checks, ...result.rules]) {
    if (item.step === "pass") continue;
    lines.push(`  ${stepLabels[item.step]}  ${item.ruleId ?? item.name}（${reasonLabels[item.reason] ?? item.reason}）`);
  }
  return lines.join("\n");
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const args = parseArgs(process.argv.slice(2));
  if (typeof args.pair !== "string") throw new Error("--pairを指定してください");
  const experiment = resolveExperimentName(args);
  const policy = await readJson(resolve(rootDir, "design", "harness-policy.json"));
  const modes = typeof args.mode === "string" ? [args.mode] : ["baseline", "harness", "harness-corrected"];
  for (const mode of modes) {
    const runDir = resolve(experimentPaths(experiment).runsDir, args.pair, mode);
    if (!existsSync(resolve(runDir, "design-evaluation.json"))) {
      if (typeof args.mode === "string") throw new Error(`${mode}: design-evaluation.jsonがありません`);
      continue;
    }
    const result = dispatch(await loadRunInput(runDir), policy);
    console.log(formatNextStep(`${args.pair}/${mode}`, result));
    // 保存済み Run の中身を変えないよう、書き出すのは --write を付けたときだけ
    if (args.write === true) {
      await writeFile(resolve(runDir, "next-step.json"), `${JSON.stringify({ decidedAt: new Date().toISOString(), ...result }, null, 2)}\n`);
    }
  }
}
