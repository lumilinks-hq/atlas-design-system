import { cp, readFile, writeFile } from "node:fs/promises";
import { resolveRunner } from "./agent-runners/index.mjs";
import { correctionPrompt } from "./correction-prompt.mjs";
import { resolve } from "node:path";
import { evaluateRun } from "./evaluate-experiment.mjs";
import { hashHarnessContext, syncHarnessContext } from "./harness-context.mjs";
import { measureRun } from "./measure-experiment.mjs";
import { parseArgs, rootDir, runCommand, runCommandToFiles } from "./lib.mjs";
import { sanitizeRunArtifacts } from "./sanitize-run-artifacts.mjs";
import { workspaceDir as resolveWorkspaceDir } from "./workspace-paths.mjs";

const args = parseArgs(process.argv.slice(2));
if (typeof args.pair !== "string") throw new Error("--pairを指定してください");

const pairId = args.pair;
const mode = "harness-corrected";
const workspaceDir = resolveWorkspaceDir(pairId, mode);
const outputDir = resolve(rootDir, "experiments", "account-management", "runs", pairId, mode);
const runPath = resolve(outputDir, "run.json");
const run = JSON.parse(await readFile(runPath, "utf8"));

await syncHarnessContext(workspaceDir, "experiments/account-management/manifest.json");
await measureRun({ pairId, mode });
const beforeRefinement = await evaluateRun({ pairId, mode });
const hasFailedChecks = run.checks?.some((check) => check.status === "failed") ?? false;

if (beforeRefinement.summary.failed === 0 && !hasFailedChecks) {
  const currentRun = JSON.parse(await readFile(runPath, "utf8"));
  const checks = [];
  for (const [name, commandArgs] of [["typecheck", ["exec", "tsc", "-p", "tsconfig.app.json", "--pretty", "false", "--noUncheckedIndexedAccess"]], ["test", ["test:run"]], ["build", ["build"]]]) {
    const check = await runCommand("pnpm", commandArgs, { cwd: workspaceDir, timeoutMs: 30_000 });
    await writeFile(resolve(outputDir, `${name}.log`), `${check.stdout}${check.stderr}`);
    checks.push({ name, status: check.code === 0 ? "passed" : "failed", exitCode: check.code });
  }
  checks.push({ name: "design-rules", status: "passed", exitCode: 0 });
  currentRun.status = checks.every((check) => check.status === "passed") ? "completed" : "failed";
  currentRun.input.designContractSha256 = await hashHarnessContext("experiments/account-management/manifest.json");
  currentRun.checks = checks;
  currentRun.artifacts = [...new Set([...currentRun.artifacts, "source", "design", "typecheck.log", "test.log", "build.log", "design-evaluation.json"])];
  await cp(resolve(workspaceDir, "src"), resolve(outputDir, "source"), { recursive: true, force: true });
  await cp(resolve(workspaceDir, "design"), resolve(outputDir, "design"), { recursive: true, force: true });
  await writeFile(runPath, `${JSON.stringify(currentRun, null, 2)}\n`);
  const diff = await runCommand("git", ["diff", "--binary", "HEAD"], { cwd: workspaceDir });
  await writeFile(resolve(outputDir, "changes.diff"), diff.stdout);
  await sanitizeRunArtifacts(outputDir);
  if (!checks.some((check) => check.status === "failed")) {
    console.log(`${mode}: no failed design rules or runtime checks; contract hash updated`);
    process.exit(0);
  }
  console.log(`${mode}: runtime check failed; continuing to agent refinement`);
}

const prompt = correctionPrompt;
// runnerは run.json に記録されたものを使う（同じpairは同じCLIで通す）
const runner = resolveRunner(run.environment.runner);
const result = await runCommandToFiles(runner.command, runner.buildExecArgs({ model: run.environment.model, prompt, cwd: workspaceDir, json: true }), {
  cwd: workspaceDir,
  stdoutPath: resolve(outputDir, "refinement-events.jsonl"),
  stderrPath: resolve(outputDir, "refinement-stderr.log"),
});

const diff = await runCommand("git", ["diff", "--binary", "HEAD"], { cwd: workspaceDir });
await writeFile(resolve(outputDir, "changes.diff"), diff.stdout);
await cp(resolve(workspaceDir, "src"), resolve(outputDir, "source"), { recursive: true, force: true });
await cp(resolve(workspaceDir, "design"), resolve(outputDir, "design"), { recursive: true, force: true });

const checks = [];
for (const [name, commandArgs] of [["typecheck", ["exec", "tsc", "-p", "tsconfig.app.json", "--pretty", "false", "--noUncheckedIndexedAccess"]], ["test", ["test:run"]], ["build", ["build"]]]) {
  const check = await runCommand("pnpm", commandArgs, { cwd: workspaceDir, timeoutMs: 30_000 });
  await writeFile(resolve(outputDir, `${name}.log`), `${check.stdout}${check.stderr}`);
  checks.push({ name, status: check.code === 0 ? "passed" : "failed", exitCode: check.code });
}

const updatedRun = {
  ...run,
  status: result.code === 0 ? "completed" : "failed",
  input: { ...run.input, designContractSha256: await hashHarnessContext("experiments/account-management/manifest.json") },
  artifacts: [...new Set([...run.artifacts, "design", "refinement-events.jsonl", "refinement-stderr.log"])],
  checks,
};
await writeFile(runPath, `${JSON.stringify(updatedRun, null, 2)}\n`);
await measureRun({ pairId, mode });
const evaluation = await evaluateRun({ pairId, mode });
await sanitizeRunArtifacts(outputDir);

console.log(`${mode}: ${updatedRun.status}`);
console.log(`Design rules: ${evaluation.summary.passed} passed / ${evaluation.summary.failed} failed / ${evaluation.summary.review} review`);
if (result.code !== 0 || checks.some((check) => check.status === "failed") || evaluation.summary.failed > 0) process.exitCode = 1;
