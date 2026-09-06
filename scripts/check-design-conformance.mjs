import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { resolveConformanceTarget } from "./conformance-target.mjs";
import { evaluateSource } from "./evaluate-experiment.mjs";
import { parseArgs, rootDir } from "./lib.mjs";
import { collectScreenSources } from "./screen-sources.mjs";
import { resolveExperimentName } from "./workspace-paths.mjs";

const args = parseArgs(process.argv.slice(2));
// 基準Runはdesign/conformance-target.jsonが持つ。引数はその場限りの上書き
const { experiment, pair, mode, runDir } = await resolveConformanceTarget(args);
resolveExperimentName({ experiment });

// 保存済み評価はevaluateRunがApp.tsxから辿った全画面ファイルで作られる。
// ここで同じ収集をしないと複数ファイル構成のRunでは必ず不一致になる
const [{ app, fixtures, styles, tsxFiles }, componentTheme, storedEvaluation, measurements] = await Promise.all([
  collectScreenSources(resolve(runDir, "source")),
  readFile(resolve(rootDir, "design", "component-theme.css"), "utf8"),
  readFile(resolve(runDir, "design-evaluation.json"), "utf8").then(JSON.parse),
  // 保存済みrulesは幾何計測込みで算出されているため、同じmeasurementsを渡さないと必ず不一致になる
  readFile(resolve(runDir, "measurements.json"), "utf8").then(JSON.parse),
]);

const rules = evaluateSource({ app, fixtures, styles, componentTheme, measurements, tsxFiles, experiment });
const failedRules = rules.filter((rule) => rule.status === "failed");
if (failedRules.length > 0) {
  const details = failedRules
    .map((rule) => `${rule.id}: ${rule.evidence.join(" / ")}`)
    .join("\n");
  throw new Error(`基準Run ${experiment}/${pair}/${mode} が現在の設計契約に適合していません\n${details}`);
}

const summary = {
  passed: rules.filter((rule) => rule.status === "passed").length,
  failed: failedRules.length,
  review: rules.filter((rule) => rule.status === "review").length,
};
if (
  JSON.stringify(storedEvaluation.summary) !== JSON.stringify(summary) ||
  JSON.stringify(storedEvaluation.rules) !== JSON.stringify(rules)
) {
  throw new Error(
    "保存済みのdesign-evaluation.jsonが現在の契約と一致しません。契約を変えた場合はDEMO_PROGRESS.mdの手順（refine→capture→review→compare）で更新してください。evaluate単独の再実行はreview欄を消すため禁止です",
  );
}

console.log(
  `Design conformance OK (${experiment}/${pair}/${mode}): ${summary.passed} passed / ${summary.review} review`,
);
