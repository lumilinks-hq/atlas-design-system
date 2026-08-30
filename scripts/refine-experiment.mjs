import { cp, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { evaluateRun } from "./evaluate-experiment.mjs";
import { hashPath, parseArgs, rootDir, runCommand, runCommandToFiles } from "./lib.mjs";
import { sanitizeRunArtifacts } from "./sanitize-run-artifacts.mjs";

const args = parseArgs(process.argv.slice(2));
if (typeof args.pair !== "string") throw new Error("--pairを指定してください");

const pairId = args.pair;
const mode = "harness-corrected";
const workspaceDir = resolve(rootDir, ".runs", "account-management", pairId, mode);
const outputDir = resolve(rootDir, "experiments", "account-management", "runs", pairId, mode);
const runPath = resolve(outputDir, "run.json");
const run = JSON.parse(await readFile(runPath, "utf8"));

await cp(resolve(rootDir, "DESIGN.md"), resolve(workspaceDir, "DESIGN.md"), { force: true });
await cp(resolve(rootDir, "design"), resolve(workspaceDir, "design"), { recursive: true, force: true });
const beforeRefinement = await evaluateRun({ pairId, mode });

if (beforeRefinement.summary.failed === 0) {
  const currentRun = JSON.parse(await readFile(runPath, "utf8"));
  currentRun.status = "completed";
  currentRun.input.designContractSha256 = await hashPath(resolve(rootDir, "design"));
  await writeFile(runPath, `${JSON.stringify(currentRun, null, 2)}\n`);
  const diff = await runCommand("git", ["diff", "--binary", "HEAD"], { cwd: workspaceDir });
  await writeFile(resolve(outputDir, "changes.diff"), diff.stdout);
  await sanitizeRunArtifacts(outputDir);
  console.log(`${mode}: no failed design rules; contract hash updated`);
  process.exit(0);
}

const prompt = "VALIDATION.mdの失敗項目だけを修正してください。DESIGN.mdとdesign/は変更せず、既存の画面要件と機能を保ってください。修正後にtypecheck、test:run、buildを実行してください。";
const result = await runCommandToFiles("codex", [
  "exec",
  "--ignore-user-config",
  "--ignore-rules",
  "--ephemeral",
  "--json",
  "--approve-for-me",
  "--model",
  run.environment.model,
  "-C",
  workspaceDir,
  prompt,
], {
  cwd: workspaceDir,
  stdoutPath: resolve(outputDir, "refinement-events.jsonl"),
  stderrPath: resolve(outputDir, "refinement-stderr.log"),
});

const diff = await runCommand("git", ["diff", "--binary", "HEAD"], { cwd: workspaceDir });
await writeFile(resolve(outputDir, "changes.diff"), diff.stdout);
await cp(resolve(workspaceDir, "src"), resolve(outputDir, "source"), { recursive: true, force: true });

const checks = [];
for (const [name, commandArgs] of [["typecheck", ["typecheck"]], ["test", ["test:run"]], ["build", ["build"]]]) {
  const check = await runCommand("pnpm", commandArgs, { cwd: workspaceDir });
  await writeFile(resolve(outputDir, `${name}.log`), `${check.stdout}${check.stderr}`);
  checks.push({ name, status: check.code === 0 ? "passed" : "failed", exitCode: check.code });
}

const updatedRun = {
  ...run,
  status: result.code === 0 ? "completed" : "failed",
  input: { ...run.input, designContractSha256: await hashPath(resolve(rootDir, "design")) },
  artifacts: [...new Set([...run.artifacts, "refinement-events.jsonl", "refinement-stderr.log"])],
  checks,
};
await writeFile(runPath, `${JSON.stringify(updatedRun, null, 2)}\n`);
const evaluation = await evaluateRun({ pairId, mode });
await sanitizeRunArtifacts(outputDir);

console.log(`${mode}: ${updatedRun.status}`);
console.log(`Design rules: ${evaluation.summary.passed} passed / ${evaluation.summary.failed} failed / ${evaluation.summary.review} review`);
if (result.code !== 0 || checks.some((check) => check.status === "failed") || evaluation.summary.failed > 0) process.exitCode = 1;
