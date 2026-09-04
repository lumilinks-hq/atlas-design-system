import { homedir } from "node:os";
import { isAbsolute, join, relative, resolve } from "node:path";
import { rootDir } from "./lib.mjs";

const experimentName = "account-management";

// 実験 workspace はリポジトリの外に置く。中に置くとエージェントが親リポジトリ(採点器を含む)を
// 見つけられてしまい、baseline と harness の比較を「Harness の効果」と言えなくなる
export function runsRootDir(env = process.env) {
  const override = env.DESIGN_HARNESS_RUNS_DIR;
  const resolved = override ? resolve(override) : join(homedir(), ".cache", "design-harness", "runs");
  const fromRoot = relative(rootDir, resolved);
  if (!fromRoot.startsWith("..") && !isAbsolute(fromRoot)) {
    throw new Error(`DESIGN_HARNESS_RUNS_DIRはリポジトリの外を指してください: ${resolved}`);
  }
  return resolved;
}

export function pairWorkspaceDir(pairId, env = process.env) {
  return join(runsRootDir(env), experimentName, pairId);
}

export function workspaceDir(pairId, mode, env = process.env) {
  return join(pairWorkspaceDir(pairId, env), mode);
}
