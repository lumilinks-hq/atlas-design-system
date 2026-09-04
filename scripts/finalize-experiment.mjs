import { cp, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { parseArgs, rootDir, runCommand } from "./lib.mjs";
import { sanitizeRunArtifacts } from "./sanitize-run-artifacts.mjs";
import { workspaceDir as resolveWorkspaceDir } from "./workspace-paths.mjs";

const args = parseArgs(process.argv.slice(2));
if (typeof args.pair !== "string" || typeof args.mode !== "string") {
  throw new Error("--pairと--modeを指定してください");
}

const workspaceDir = resolveWorkspaceDir(args.pair, args.mode);
const outputDir = resolve(rootDir, "experiments", "account-management", "runs", args.pair, args.mode);
const runPath = resolve(outputDir, "run.json");
const run = JSON.parse(await readFile(runPath, "utf8"));

const diff = await runCommand("git", ["diff", "--binary", "HEAD"], { cwd: workspaceDir });
await writeFile(resolve(outputDir, "changes.diff"), diff.stdout);
await cp(resolve(workspaceDir, "src"), resolve(outputDir, "source"), { recursive: true, force: true });

const checks = [];
for (const [name, commandArgs] of [["typecheck", ["exec", "tsc", "-p", "tsconfig.app.json", "--pretty", "false", "--noUncheckedIndexedAccess"]], ["test", ["test:run"]], ["build", ["build"]]]) {
  const check = await runCommand("pnpm", commandArgs, { cwd: workspaceDir, timeoutMs: 30_000 });
  await writeFile(resolve(outputDir, `${name}.log`), `${check.stdout}${check.stderr}`);
  checks.push({ name, status: check.code === 0 ? "passed" : "failed", exitCode: check.code });
}

const updatedRun = {
  ...run,
  status: checks.every((check) => check.status === "passed") ? "completed" : "failed",
  artifacts: [...new Set([...run.artifacts, "events.jsonl", "agent-stderr.log", "changes.diff", "source", "typecheck.log", "test.log", "build.log"])],
  checks,
};
await writeFile(runPath, `${JSON.stringify(updatedRun, null, 2)}\n`);
await sanitizeRunArtifacts(outputDir);

console.log(`${args.mode}: ${updatedRun.status}`);
for (const check of checks) console.log(`${check.name}: ${check.status} (${check.exitCode})`);
if (updatedRun.status === "failed") process.exitCode = 1;
