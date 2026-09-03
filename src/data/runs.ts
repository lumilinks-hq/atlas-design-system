import baselineEvaluation from "../../experiments/account-management/runs/mvp-11/baseline/design-evaluation.json";
import comparison from "../../experiments/account-management/runs/mvp-11/comparison.json";
import correctedEvaluation from "../../experiments/account-management/runs/mvp-11/harness-corrected/design-evaluation.json";
import correctedRun from "../../experiments/account-management/runs/mvp-11/harness-corrected/run.json";
import harnessEvaluation from "../../experiments/account-management/runs/mvp-11/harness/design-evaluation.json";

export { baselineEvaluation, comparison, correctedEvaluation, correctedRun, harnessEvaluation };

export const runEnvironment = correctedRun["environment"];

export type RunEvaluation = typeof baselineEvaluation;
export type RunCheck = (typeof comparison)["checks"]["baseline"][number];
