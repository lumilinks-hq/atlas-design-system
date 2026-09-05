import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { isAbsolute, join, relative, resolve } from "node:path";
import { rootDir } from "./lib.mjs";

/** --experiment を省いたときに使う実験名 */
export const defaultExperimentName = "account-management";

/** 実験名として許すのはパス区切りを含まない小文字の識別子だけ */
const experimentNamePattern = /^[a-z0-9][a-z0-9-]*$/;

/**
 * 実験名からリポジトリ内のパスをまとめて返す。
 * manifestPath だけは rootDir からの相対パス(resolveManifest がその形を受け取る)。
 * @param {string} [name]
 */
export function experimentPaths(name = defaultExperimentName) {
  const dir = join(rootDir, "experiments", name);
  return {
    name,
    dir,
    manifestPath: `experiments/${name}/manifest.json`,
    starterDir: join(dir, "starter"),
    briefPath: join(dir, "brief.md"),
    promptPath: join(dir, "prompt.md"),
    runsDir: join(dir, "runs"),
    publicRunsDir: join(rootDir, "public", "experiments", name, "runs"),
  };
}

/**
 * parseArgs の結果から実験名を決める。存在しない実験を静かに既定へ落とさない。
 * @param {Record<string, string | boolean>} [args]
 */
export function resolveExperimentName(args = {}) {
  const requested = args.experiment;
  if (requested === undefined) return defaultExperimentName;
  if (typeof requested !== "string" || !experimentNamePattern.test(requested)) {
    throw new Error("--experimentには英小文字、数字、-だけの実験名を指定してください");
  }
  const { manifestPath } = experimentPaths(requested);
  if (!existsSync(resolve(rootDir, manifestPath))) {
    throw new Error(`実験が見つかりません: ${manifestPath}`);
  }
  return requested;
}

// 実験 workspace はリポジトリの外に置く。中に置くとエージェントが親リポジトリ(採点器を含む)を
// 見つけられてしまい、baseline と harness の比較を「Harness の効果」と言えなくなる
export function runsRootDir(environment = process.env) {
  const override = environment.DESIGN_HARNESS_RUNS_DIR;
  const resolved = override ? resolve(override) : join(homedir(), ".cache", "design-harness", "runs");
  const fromRoot = relative(rootDir, resolved);
  if (!fromRoot.startsWith("..") && !isAbsolute(fromRoot)) {
    throw new Error(`DESIGN_HARNESS_RUNS_DIRはリポジトリの外を指してください: ${resolved}`);
  }
  return resolved;
}

export function pairWorkspaceDir(pairId, environment = process.env, experiment = defaultExperimentName) {
  return join(runsRootDir(environment), experiment, pairId);
}

export function workspaceDir(pairId, mode, environment = process.env, experiment = defaultExperimentName) {
  return join(pairWorkspaceDir(pairId, environment, experiment), mode);
}
