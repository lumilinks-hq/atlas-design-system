/**
 * 設計契約の適合を証明する基準Runを1か所で決める。
 * design:conformance（バイト一致）とrules-method.test.mjs（method宣言の実測）が
 * 別々のRunを見ていると、契約を変えたときに片方だけ通ってしまう。
 */
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { rootDir } from "./lib.mjs";
import { experimentPaths } from "./workspace-paths.mjs";

const configPath = resolve(rootDir, "design", "conformance-target.json");
const allowedModes = ["baseline", "harness", "harness-corrected"];

/**
 * 基準Runの実験名、pair、modeと、そのRunのディレクトリを返す。
 * argsを渡すと --experiment / --pair / --mode で一時的に上書きできる。
 * @param {Record<string, string | boolean>} [args]
 */
export async function resolveConformanceTarget(args = {}) {
  const config = JSON.parse(await readFile(configPath, "utf8"));
  const experiment = typeof args.experiment === "string" ? args.experiment : config.experiment;
  const pair = typeof args.pair === "string" ? args.pair : config.pair;
  const mode = typeof args.mode === "string" ? args.mode : config.mode;

  for (const [key, value] of Object.entries({ experiment, pair, mode })) {
    if (typeof value !== "string" || value.length === 0) {
      throw new Error(`design/conformance-target.json: ${key} を文字列で指定してください`);
    }
  }
  if (!allowedModes.includes(mode)) {
    throw new Error(`design/conformance-target.json: mode は ${allowedModes.join(" / ")} のいずれかです`);
  }

  return { experiment, pair, mode, runDir: resolve(experimentPaths(experiment).runsDir, pair, mode) };
}
