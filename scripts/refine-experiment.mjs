import { cp, readFile, rm, writeFile } from "node:fs/promises";
import { resolveRunner } from "./agent-runners/index.mjs";
import { buildCorrectionPrompt } from "./correction-prompt.mjs";
import { resolve } from "node:path";
import { evaluateRun } from "./evaluate-experiment.mjs";
import { hashHarnessContext, syncHarnessContext } from "./harness-context.mjs";
import { dispatch, formatFixNotes, formatNextStep, loadRunInput, refinementArtifacts } from "./harness-dispatch.mjs";
import { measureRun } from "./measure-experiment.mjs";
import { parseArgs, rootDir, runCommand, runCommandToFiles } from "./lib.mjs";
import { sanitizeRunArtifacts } from "./sanitize-run-artifacts.mjs";
import { experimentPaths, resolveExperimentName, workspaceDir as resolveWorkspaceDir } from "./workspace-paths.mjs";

const args = parseArgs(process.argv.slice(2));
if (typeof args.pair !== "string") throw new Error("--pairを指定してください");

const pairId = args.pair;
const mode = "harness-corrected";
const experiment = resolveExperimentName(args);
const experimentDirs = experimentPaths(experiment);
const workspaceDir = resolveWorkspaceDir(pairId, mode, process.env, experiment);
const outputDir = resolve(experimentDirs.runsDir, pairId, mode);
const runPath = resolve(outputDir, "run.json");
const label = `${pairId}/${mode}`;

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

const policy = await readJson(resolve(rootDir, "design", "harness-policy.json"));
const titles = new Map((await readJson(resolve(rootDir, "design", "rules.json"))).rules.map((rule) => [rule.id, rule.title]));

async function runRuntimeChecks() {
  const checks = [];
  for (const [name, commandArgs] of [["typecheck", ["exec", "tsc", "-p", "tsconfig.app.json", "--pretty", "false", "--noUncheckedIndexedAccess"]], ["test", ["test:run"]], ["build", ["build"]]]) {
    const check = await runCommand("pnpm", commandArgs, { cwd: workspaceDir, timeoutMs: 30_000 });
    await writeFile(resolve(outputDir, `${name}.log`), `${check.stdout}${check.stderr}`);
    checks.push({ name, status: check.code === 0 ? "passed" : "failed", exitCode: check.code });
  }
  return checks;
}

/** 振り分けの結果を Run に残す。run.json の artifacts にも足す */
async function saveNextStep(result) {
  await writeFile(resolve(outputDir, "next-step.json"), `${JSON.stringify({ decidedAt: new Date().toISOString(), ...result }, null, 2)}\n`);
  const run = await readJson(runPath);
  if (!run.artifacts.includes("next-step.json")) run.artifacts.push("next-step.json");
  await writeFile(runPath, `${JSON.stringify(run, null, 2)}\n`);
}

/** 修正しない理由のうち、人が次に何をすればよいかを 1 行ずつ出す */
function printHints(result) {
  const reasons = new Set([...result.rules, ...result.checks].map((item) => item.reason));
  if (reasons.has("iteration.limit")) {
    console.log(`修正回数が上限（${policy.maxFixIterations} 回）に達したので、ここで止めます。採用か保留を pnpm experiment:decide で記録してください。`);
  }
  if (reasons.has("judgment.missing")) {
    console.log("判定がないルールは、capture と review のあと pnpm experiment:next で振り分け直せます。");
  }
}

await syncHarnessContext(workspaceDir, experimentDirs.manifestPath);
await measureRun({ pairId, mode, experiment });
const beforeRefinement = await evaluateRun({ pairId, mode, experiment });
// evaluate は review を消すので、ここでの判定は検査の結果と人の判断だけで決まる
const input = await loadRunInput(outputDir);
let plan = dispatch(input, policy);

if (plan.step !== "fix") {
  // 修正しないときも、実行時の検査を今のコードでやり直して記録を新しくする
  const currentRun = await readJson(runPath);
  const checks = await runRuntimeChecks();
  const rulesPassed = beforeRefinement.summary.failed === 0;
  checks.push({ name: "design-rules", status: rulesPassed ? "passed" : "failed", exitCode: rulesPassed ? 0 : 1 });
  currentRun.status = checks.every((check) => check.status === "passed") ? "completed" : "failed";
  currentRun.input.designContractSha256 = await hashHarnessContext(experimentDirs.manifestPath);
  currentRun.checks = checks;
  currentRun.artifacts = [...new Set([...currentRun.artifacts, "source", "design", "typecheck.log", "test.log", "build.log", "design-evaluation.json"])];
  await cp(resolve(workspaceDir, "src"), resolve(outputDir, "source"), { recursive: true, force: true });
  await cp(resolve(workspaceDir, "design"), resolve(outputDir, "design"), { recursive: true, force: true });
  await writeFile(runPath, `${JSON.stringify(currentRun, null, 2)}\n`);
  const diff = await runCommand("git", ["diff", "--binary", "HEAD"], { cwd: workspaceDir });
  await writeFile(resolve(outputDir, "changes.diff"), diff.stdout);

  // 実行時の検査が新しく失敗していれば、修正へ進む
  plan = dispatch({ ...input, checks }, policy);
  if (plan.step !== "fix") {
    await saveNextStep(plan);
    await sanitizeRunArtifacts(outputDir);
    console.log(formatNextStep(label, plan));
    printHints(plan);
    // 上限で止まったときは、直っていない項目が残っている
    if ([...plan.rules, ...plan.checks].some((item) => item.reason === "iteration.limit")) process.exitCode = 1;
    process.exit();
  }
}

console.log(formatNextStep(label, plan));
const iteration = input.iteration + 1;
const names = refinementArtifacts(iteration);
// VALIDATION.md と同じく、ワークスペースに置いて修正する AI に読ませる。git には入れないので changes.diff には出ない
const nextStepPath = resolve(workspaceDir, "NEXT_STEP.md");
const notes = formatFixNotes(input, plan, titles);
if (notes) await writeFile(nextStepPath, notes);
else await rm(nextStepPath, { force: true });

const prompt = buildCorrectionPrompt({ withNextStep: notes !== undefined });
// evaluate が artifacts と checks を書き換えているので、ここで読み直す
const run = await readJson(runPath);
// runnerは run.json に記録されたものを使う（同じpairは同じCLIで通す）
const runner = resolveRunner(run.environment.runner);
const result = await runCommandToFiles(runner.command, runner.buildExecArgs({ model: run.environment.model, prompt, cwd: workspaceDir, json: true }), {
  cwd: workspaceDir,
  stdoutPath: resolve(outputDir, names.events),
  stderrPath: resolve(outputDir, names.stderr),
});

const diff = await runCommand("git", ["diff", "--binary", "HEAD"], { cwd: workspaceDir });
await writeFile(resolve(outputDir, "changes.diff"), diff.stdout);
await cp(resolve(workspaceDir, "src"), resolve(outputDir, "source"), { recursive: true, force: true });
await cp(resolve(workspaceDir, "design"), resolve(outputDir, "design"), { recursive: true, force: true });

const checks = await runRuntimeChecks();

const updatedRun = {
  ...run,
  status: result.code === 0 ? "completed" : "failed",
  input: { ...run.input, designContractSha256: await hashHarnessContext(experimentDirs.manifestPath) },
  artifacts: [...new Set([...run.artifacts, "design", names.events, names.stderr])],
  checks,
};
await writeFile(runPath, `${JSON.stringify(updatedRun, null, 2)}\n`);
await measureRun({ pairId, mode, experiment });
const evaluation = await evaluateRun({ pairId, mode, experiment });
const after = dispatch(await loadRunInput(outputDir), policy);
await saveNextStep(after);
await sanitizeRunArtifacts(outputDir);

console.log(`${mode}: ${updatedRun.status}（修正 ${iteration} 回目）`);
console.log(`Design rules: ${evaluation.summary.passed} passed / ${evaluation.summary.failed} failed / ${evaluation.summary.review} review`);
console.log(formatNextStep(label, after));
printHints(after);
if (result.code !== 0 || checks.some((check) => check.status === "failed") || evaluation.summary.failed > 0) process.exitCode = 1;
