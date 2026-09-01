import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { evaluateSource } from "./evaluate-experiment.mjs";
import { rootDir } from "./lib.mjs";

const correctedDir = resolve(
  rootDir,
  "experiments",
  "account-management",
  "runs",
  "mvp-11",
  "harness-corrected",
);

const [app, fixtures, styles, componentTheme, storedEvaluation, measurements] = await Promise.all([
  readFile(resolve(correctedDir, "source", "App.tsx"), "utf8"),
  readFile(resolve(correctedDir, "source", "fixtures.ts"), "utf8"),
  readFile(resolve(correctedDir, "source", "styles.css"), "utf8"),
  readFile(resolve(rootDir, "design", "component-theme.css"), "utf8"),
  readFile(resolve(correctedDir, "design-evaluation.json"), "utf8").then(JSON.parse),
  // 保存済みrulesは幾何計測込みで算出されているため、同じmeasurementsを渡さないと必ず不一致になる
  readFile(resolve(correctedDir, "measurements.json"), "utf8").then(JSON.parse),
]);

const rules = evaluateSource({ app, fixtures, styles, componentTheme, measurements });
const failedRules = rules.filter((rule) => rule.status === "failed");
if (failedRules.length > 0) {
  const details = failedRules
    .map((rule) => `${rule.id}: ${rule.evidence.join(" / ")}`)
    .join("\n");
  throw new Error(`Harness correctedが現在の設計契約に適合していません\n${details}`);
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

console.log(`Design conformance OK: ${summary.passed} passed / ${summary.review} review`);
