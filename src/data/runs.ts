import baselineEvaluation from "../../experiments/account-management/runs/lint-01/baseline/design-evaluation.json";
import comparison from "../../experiments/account-management/runs/lint-01/comparison.json";
import harnessEvaluation from "../../experiments/account-management/runs/lint-01/harness/design-evaluation.json";
import harnessRun from "../../experiments/account-management/runs/lint-01/harness/run.json";
import prelint01Baseline from "../../experiments/account-management/runs/prelint-01/baseline/design-evaluation.json";
import prelint01Harness from "../../experiments/account-management/runs/prelint-01/harness/design-evaluation.json";
import prelint01Run from "../../experiments/account-management/runs/prelint-01/harness/run.json";

export { baselineEvaluation, comparison, harnessEvaluation };

export const runEnvironment = harnessRun["environment"];

export type RunEvaluation = typeof baselineEvaluation;
export type RunCheck = (typeof comparison)["checks"]["baseline"][number];

// 同じモデル（claude-opus-5）で lint 層あり/なしを比べた run。
// 上の比較で見せている lint-01 を、ESLint 層を入れる前の prelint-01 と並べる

type RunSummary = { summary: RunEvaluation["summary"] };

export type SameModelRun = {
  pairId: string;
  model: string;
  lintLayer: boolean;
  note: string;
  baseline: RunSummary;
  harness: RunSummary;
};

export const sameModelRuns: SameModelRun[] = [
  {
    pairId: "prelint-01",
    model: prelint01Run["environment"].model,
    lintLayer: false,
    note: "ESLint 層を入れる前。両条件とも画面を複数ファイルに分割した run で、評価器は import で辿れる全ファイルを検査している",
    baseline: { summary: prelint01Baseline.summary },
    harness: { summary: prelint01Harness.summary },
  },
  {
    pairId: "lint-01",
    model: harnessRun["environment"].model,
    lintLayer: true,
    note: "ESLint 層を入れた後。harness は生成中に pnpm lint を回して自分で直した",
    baseline: { summary: baselineEvaluation.summary },
    harness: { summary: harnessEvaluation.summary },
  },
];
