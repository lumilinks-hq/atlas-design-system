import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createHash } from "node:crypto";
import { parseArgs, rootDir } from "./lib.mjs";

const args = parseArgs(process.argv.slice(2));
if (typeof args.pair !== "string") throw new Error("--pairを指定してください");

const runsDir = resolve(rootDir, "experiments", "account-management", "runs", args.pair);
const baseline = JSON.parse(await readFile(resolve(runsDir, "baseline", "run.json"), "utf8"));
const harness = JSON.parse(await readFile(resolve(runsDir, "harness", "run.json"), "utf8"));
let corrected;
try {
  await access(resolve(runsDir, "harness-corrected", "run.json"));
  corrected = JSON.parse(await readFile(resolve(runsDir, "harness-corrected", "run.json"), "utf8"));
} catch (error) {
  if (error?.code !== "ENOENT") throw error;
}

for (const key of ["briefSha256", "starterSha256", "promptSha256"]) {
  if (baseline.input[key] !== harness.input[key]) throw new Error(`比較条件が一致しません: ${key}`);
}
if (baseline.input.designContractSha256 !== null) throw new Error("Baselineへ設計契約が含まれています");
if (harness.input.designContractSha256 === null) throw new Error("Harnessへ設計契約が含まれていません");
if (baseline.environment.model !== harness.environment.model) throw new Error("AIモデルが一致しません");
if (baseline.environment.cliVersion !== harness.environment.cliVersion) throw new Error("Codex CLIが一致しません");

const blindOrder = createHash("sha256").update(args.pair).digest()[0] % 2 === 0
  ? { A: "baseline", B: "harness" }
  : { A: "harness", B: "baseline" };

// review-experiment.mjs が design-evaluation.json へ保存したAI所見を転記する（無ければ欄ごと省略）
const review = {};
for (const [key, dir] of [["baseline", "baseline"], ["harness", "harness"], ...(corrected ? [["corrected", "harness-corrected"]] : [])]) {
  try {
    const evaluation = JSON.parse(await readFile(resolve(runsDir, dir, "design-evaluation.json"), "utf8"));
    if (evaluation.review) review[key] = evaluation.review;
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
}

const comparison = {
  pairId: args.pair,
  experimentId: baseline.experimentId,
  conditionsMatch: true,
  blindOrder,
  reveal: { baseline: baseline.id, harness: harness.id, ...(corrected ? { corrected: corrected.id } : {}) },
  checks: { baseline: baseline.checks, harness: harness.checks, ...(corrected ? { corrected: corrected.checks } : {}) },
  ...(Object.keys(review).length > 0 ? { review } : {}),
};

await mkdir(runsDir, { recursive: true });
await writeFile(resolve(runsDir, "comparison.json"), `${JSON.stringify(comparison, null, 2)}\n`);
console.log(`Comparison OK: experiments/account-management/runs/${args.pair}/comparison.json`);
