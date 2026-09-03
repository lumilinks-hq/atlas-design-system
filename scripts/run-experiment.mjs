import { cp, lstat, mkdir, readFile, symlink, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { defaultRunnerId, resolveRunner } from "./agent-runners/index.mjs";
import { correctionPrompt } from "./correction-prompt.mjs";
import { hashHarnessContext, syncHarnessContext } from "./harness-context.mjs";
import { hashPath, parseArgs, rootDir, runCommand, runCommandToFiles } from "./lib.mjs";
import { sanitizeRunArtifacts } from "./sanitize-run-artifacts.mjs";

const args = parseArgs(process.argv.slice(2));
const mode = args.mode;
const allowedModes = new Set(["baseline", "harness", "harness-corrected"]);

if (typeof mode !== "string" || !allowedModes.has(mode)) {
  throw new Error("--mode baseline、--mode harness、--mode harness-corrected のいずれかを指定してください");
}

const pairId = typeof args.pair === "string" ? args.pair : new Date().toISOString().replaceAll(/[:.]/g, "-");
if (!/^[a-zA-Z0-9_-]+$/.test(pairId)) throw new Error("--pairには英数字、_、-だけを使えます");

const runner = resolveRunner(defaultRunnerId(args));
const model = typeof args.model === "string" ? args.model : runner.defaultModel;
const dryRun = args["dry-run"] === true;
const experimentDir = resolve(rootDir, "experiments", "account-management");
const starterDir = resolve(experimentDir, "starter");
const pairWorkspaceDir = resolve(rootDir, ".runs", "account-management", pairId);
const workspaceDir = resolve(pairWorkspaceDir, mode);
const outputDir = resolve(experimentDir, "runs", pairId, mode);
const briefPath = resolve(experimentDir, "brief.md");
const promptPath = resolve(experimentDir, "prompt.md");
const nodeModulesPath = resolve(rootDir, "node_modules");

async function exists(path) {
  try {
    await lstat(path);
    return true;
  } catch {
    return false;
  }
}

if (await exists(workspaceDir)) {
  throw new Error(`workspaceが既に存在します: .runs/account-management/${pairId}/${mode}`);
}
if (!(await exists(nodeModulesPath))) throw new Error("先にpnpm installを実行してください");

await mkdir(pairWorkspaceDir, { recursive: true });
await mkdir(outputDir, { recursive: true });

if (mode === "harness-corrected") {
  const harnessWorkspace = resolve(pairWorkspaceDir, "harness");
  if (!(await exists(harnessWorkspace))) throw new Error("同じ--pairで先に--mode harnessを実行してください");
  await cp(harnessWorkspace, workspaceDir, {
    recursive: true,
    filter: (source) => !source.endsWith("/node_modules") && !source.includes("/.git"),
  });
} else {
  await cp(starterDir, workspaceDir, { recursive: true });
  await cp(briefPath, resolve(workspaceDir, "brief.md"));
  await cp(promptPath, resolve(workspaceDir, "prompt.md"));
}

if (mode !== "baseline") {
  await syncHarnessContext(workspaceDir, "experiments/account-management/manifest.json");
  await runner.prepareWorkspace?.(workspaceDir);
}

if (!(await exists(resolve(workspaceDir, "node_modules")))) {
  await symlink(nodeModulesPath, resolve(workspaceDir, "node_modules"), "dir");
}

const briefSha256 = await hashPath(briefPath);
const starterSha256 = await hashPath(starterDir);
const promptSha256 = await hashPath(promptPath);
const designContractSha256 = mode === "baseline"
  ? null
  : await hashHarnessContext("experiments/account-management/manifest.json");
const cliVersionResult = await runCommand(runner.command, runner.versionArgs);
const cliVersion = cliVersionResult.stdout.trim() || cliVersionResult.stderr.trim();
const createdAt = new Date().toISOString();

let run = {
  $schema: "../../../../../design/schemas/run.schema.json",
  id: `${pairId}-${mode}`,
  experimentId: "experiment.account-management",
  condition: mode,
  status: dryRun ? "prepared" : "running",
  createdAt,
  input: { briefSha256, starterSha256, promptSha256, designContractSha256 },
  environment: { runner: runner.id, model, cliVersion },
  artifacts: [],
  checks: [],
};

await writeFile(resolve(outputDir, "run.json"), `${JSON.stringify(run, null, 2)}\n`);

if (dryRun) {
  console.log(`Prepared ${mode}: .runs/account-management/${pairId}/${mode}`);
  process.exit(0);
}

await runCommand("git", ["init", "--quiet"], { cwd: workspaceDir });
await runCommand("git", ["add", "."], { cwd: workspaceDir });
await runCommand("git", ["-c", "user.name=Design Harness", "-c", "user.email=demo@example.com", "commit", "--quiet", "-m", "starter"], { cwd: workspaceDir });

const basePrompt = await readFile(promptPath, "utf8");
const prompt = mode === "harness-corrected" ? correctionPrompt : basePrompt;
const agentArgs = runner.buildExecArgs({ model, prompt, cwd: workspaceDir, json: true });
const eventsPath = resolve(outputDir, "events.jsonl");
const stderrPath = resolve(outputDir, "agent-stderr.log");
const agentResult = await runCommandToFiles(runner.command, agentArgs, {
  cwd: workspaceDir,
  stdoutPath: eventsPath,
  stderrPath,
});

const diff = await runCommand("git", ["diff", "--binary", "HEAD"], { cwd: workspaceDir });
await writeFile(resolve(outputDir, "changes.diff"), diff.stdout);
await cp(resolve(workspaceDir, "src"), resolve(outputDir, "source"), { recursive: true });

const checkCommands = [
  ["typecheck", ["exec", "tsc", "-p", "tsconfig.app.json", "--pretty", "false", "--noUncheckedIndexedAccess"]],
  ["lint", ["lint"]],
  ["test", ["test:run"]],
  ["build", ["build"]],
];
const checks = [];
for (const [name, commandArgs] of checkCommands) {
  const result = await runCommand("pnpm", commandArgs, { cwd: workspaceDir, timeoutMs: 30_000 });
  await writeFile(resolve(outputDir, `${name}.log`), `${result.stdout}${result.stderr}`);
  checks.push({ name, status: result.code === 0 ? "passed" : "failed", exitCode: result.code });
}

run = {
  ...run,
  status: agentResult.code === 0 ? "completed" : "failed",
  artifacts: ["events.jsonl", "agent-stderr.log", "changes.diff", "source", "typecheck.log", "lint.log", "test.log", "build.log"],
  checks,
};
await writeFile(resolve(outputDir, "run.json"), `${JSON.stringify(run, null, 2)}\n`);
await sanitizeRunArtifacts(outputDir);

console.log(`${mode}: ${run.status}`);
console.log(`Run: experiments/account-management/runs/${pairId}/${mode}/run.json`);
if (agentResult.code !== 0) process.exitCode = agentResult.code;
