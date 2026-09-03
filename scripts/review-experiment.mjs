import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import * as z from "zod/v4";
import { resolveRunner } from "./agent-runners/index.mjs";
import { parseArgs, rootDir, runCommand } from "./lib.mjs";

export function selectReviewRuleIds(rulesDocument) {
  // レビュー対象はrules.jsonのmethod宣言を唯一の情報源とし、ここでは列挙しない
  return rulesDocument.rules.filter((rule) => rule.method === "ai-review").map((rule) => rule.id);
}

const findingsSchema = z.object({
  findings: z.array(z.object({ ruleId: z.string(), verdict: z.enum(["pass", "concern"]), note: z.string() })),
});

export function parseReviewFindings(text) {
  // モデル出力には前置きやコードフェンスが混ざりうるので、{ … } の候補を後ろから順に試す
  const candidates = [];
  for (let start = text.indexOf("{"); start >= 0; start = text.indexOf("{", start + 1)) {
    const end = text.lastIndexOf("}");
    if (end > start) candidates.push(text.slice(start, end + 1));
  }
  for (const candidate of candidates.reverse()) {
    try {
      const parsed = findingsSchema.safeParse(JSON.parse(candidate));
      if (parsed.success) return parsed.data.findings;
    } catch {
      // 次の候補へ
    }
  }
  return undefined;
}

async function reviewRun({ pairId, mode }) {
  const outputDir = resolve(rootDir, "experiments", "account-management", "runs", pairId, mode);
  const screenshotsDir = resolve(rootDir, "public", "experiments", "account-management", "runs", pairId);
  const evaluationPath = resolve(outputDir, "design-evaluation.json");
  const images = [`${mode}.png`, `${mode}-detail.png`, `${mode}-mobile.png`, `${mode}-detail-mobile.png`]
    .map((name) => resolve(screenshotsDir, name))
    .filter((path) => existsSync(path));
  if (!existsSync(evaluationPath) || images.length === 0) {
    return { skipped: true, reason: !existsSync(evaluationPath) ? "design-evaluation.jsonなし" : "スクリーンショットなし" };
  }

  const run = JSON.parse(await readFile(resolve(outputDir, "run.json"), "utf8"));
  const rulesDocument = JSON.parse(await readFile(resolve(rootDir, "design", "rules.json"), "utf8"));
  const reviewRuleIds = selectReviewRuleIds(rulesDocument);
  const rules = rulesDocument.rules.filter((rule) => reviewRuleIds.includes(rule.id));
  const ruleText = rules
    .map((rule) => `- ${rule.id}: ${rule.title}\n  ${rule.description}`)
    .join("\n");
  const prompt = [
    "添付のスクリーンショット（一覧・詳細、デスクトップ・モバイル）を、次のデザインルールに照らしてレビューしてください。",
    ruleText,
    "各ルールについて verdict は pass か concern のどちらかとし、根拠を画面上の観察として1〜2文で書いてください。",
    '出力は次のJSONのみとします: {"findings":[{"ruleId":"...","verdict":"pass|concern","note":"..."}]}',
  ].join("\n\n");

  const runner = resolveRunner(run.environment.runner);
  const result = await runCommand(
    runner.command,
    runner.buildExecArgs({ model: run.environment.model, images, prompt }),
    { timeoutMs: 300_000 },
  );
  if (result.code !== 0) {
    return { skipped: false, error: `${runner.command} failed (exit ${result.code}): ${result.stderr.slice(0, 500)}` };
  }

  const findings = parseReviewFindings(result.stdout);
  const evaluation = JSON.parse(await readFile(evaluationPath, "utf8"));
  evaluation.review = {
    reviewedAt: new Date().toISOString(),
    model: run.environment.model,
    ...(findings ? { findings } : { raw: result.stdout.trim().slice(0, 2000) }),
  };
  await writeFile(evaluationPath, `${JSON.stringify(evaluation, null, 2)}\n`);
  return { skipped: false, findings };
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const args = parseArgs(process.argv.slice(2));
  if (typeof args.pair !== "string") throw new Error("--pairを指定してください");
  const modes = typeof args.mode === "string" ? [args.mode] : ["baseline", "harness", "harness-corrected"];
  for (const mode of modes) {
    const outcome = await reviewRun({ pairId: args.pair, mode });
    if (outcome.skipped) {
      if (typeof args.mode === "string") throw new Error(`${mode}: ${outcome.reason}`);
      console.log(`${mode}: ${outcome.reason}、スキップ`);
      continue;
    }
    if (outcome.error) {
      console.error(`${mode}: ${outcome.error}`);
      process.exitCode = 1;
      continue;
    }
    const concerns = outcome.findings?.filter((finding) => finding.verdict === "concern").length ?? 0;
    console.log(`${mode}: review保存（findings ${outcome.findings?.length ?? 0}件、concern ${concerns}件）`);
  }
}
