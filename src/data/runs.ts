import accountBaseline from "../../experiments/account-management/runs/create-01/baseline/design-evaluation.json";
import accountComparison from "../../experiments/account-management/runs/create-01/comparison.json";
import accountHarness from "../../experiments/account-management/runs/create-01/harness/design-evaluation.json";
import accountRun from "../../experiments/account-management/runs/create-01/harness/run.json";
import lint01Baseline from "../../experiments/account-management/runs/lint-01/baseline/design-evaluation.json";
import lint01Harness from "../../experiments/account-management/runs/lint-01/harness/design-evaluation.json";
import lint01Run from "../../experiments/account-management/runs/lint-01/harness/run.json";
import prelint01Baseline from "../../experiments/account-management/runs/prelint-01/baseline/design-evaluation.json";
import prelint01Harness from "../../experiments/account-management/runs/prelint-01/harness/design-evaluation.json";
import prelint01Run from "../../experiments/account-management/runs/prelint-01/harness/run.json";
import invoiceBaseline from "../../experiments/invoice-management/runs/invoice-01/baseline/design-evaluation.json";
import invoiceComparison from "../../experiments/invoice-management/runs/invoice-01/comparison.json";
import invoiceHarness from "../../experiments/invoice-management/runs/invoice-01/harness/design-evaluation.json";
import invoiceRun from "../../experiments/invoice-management/runs/invoice-01/harness/run.json";

export type RunEvaluation = typeof accountBaseline;

type ComparisonChecks = { name: string; status: string; exitCode: number }[];
type ComparisonReview = { reviewedAt: string; model: string; findings: { ruleId: string; verdict: string; note: string }[] };

/** 比較の集計。修正Runまで回したpairだけcorrectedを持つので、correctedは任意にする */
export type RunComparison = Omit<typeof accountComparison, "reveal" | "checks" | "review"> & {
  reveal: { baseline: string; harness: string; corrected?: string };
  checks: { baseline: ComparisonChecks; harness: ComparisonChecks; corrected?: ComparisonChecks };
  review: { baseline: ComparisonReview; harness: ComparisonReview; corrected?: ComparisonReview };
};
export type RunCheck = RunComparison["checks"]["baseline"][number];
export type RunEnvironment = (typeof accountRun)["environment"];

type RunSummary = { summary: RunEvaluation["summary"] };

export type SameModelRun = {
  pairId: string;
  model: string;
  lintLayer: boolean;
  note: string;
  baseline: RunSummary;
  harness: RunSummary;
};

export type ExperimentId = "account-management" | "invoice-management";

/**
 * 保存済みRunを題材ごとにまとめた登録簿。比較ページ、サンプルページ、Playページは
 * すべてこの1件から経路と表示名を引く。題材を足すときはここへ1エントリ追加する
 */
export type ExperimentRun = {
  id: ExperimentId;
  /** ナビや切り替えボタンに出す題材名 */
  label: string;
  /** 「〜で生成した{subject}」のように文中へ差し込む画面名 */
  subject: string;
  pairId: string;
  examplePath: string;
  resultsPath: string;
  playPath: string;
  /** public/ 配下のスクリーンショット置き場 */
  screenshotBase: string;
  environment: RunEnvironment;
  comparison: RunComparison;
  baselineEvaluation: RunEvaluation;
  harnessEvaluation: RunEvaluation;
  /** ハーネスありの生成条件について、画面へ添える注記 */
  harnessNote: string;
  /** 同じモデルでlint層あり/なしを比べたRunがある題材だけ持つ */
  sameModelRuns?: SameModelRun[];
};

const harnessNote =
  "ESLint 層を含む設計データを渡し、生成中に pnpm lint で自分で直した初回生成です。人もAIも、あとから修正ループは回していません。";

const accountSameModelRuns: SameModelRun[] = [
  {
    pairId: "prelint-01",
    model: prelint01Run["environment"].model,
    lintLayer: false,
    note: "設計データはMarkdownとJSONだけ。ESLint 層(eslint-plugin-atlas)を渡していない初回生成です。",
    baseline: prelint01Baseline,
    harness: prelint01Harness,
  },
  {
    pairId: "lint-01",
    model: lint01Run["environment"].model,
    lintLayer: true,
    note: "同じ設計データに ESLint 層を足した初回生成です。AIは生成中に pnpm lint で自分の違反を直せます。",
    baseline: lint01Baseline,
    harness: lint01Harness,
  },
];

export const experimentRuns: Record<ExperimentId, ExperimentRun> = {
  "account-management": {
    id: "account-management",
    label: "顧客管理",
    subject: "顧客管理画面",
    pairId: accountComparison.pairId,
    examplePath: "/examples/account-management",
    resultsPath: "/examples/account-management/results",
    playPath: "/play/account-management",
    screenshotBase: `/experiments/account-management/runs/${accountComparison.pairId}`,
    environment: accountRun["environment"],
    comparison: accountComparison,
    baselineEvaluation: accountBaseline,
    harnessEvaluation: accountHarness,
    harnessNote,
    sameModelRuns: accountSameModelRuns,
  },
  "invoice-management": {
    id: "invoice-management",
    label: "請求書管理",
    subject: "請求書管理画面",
    pairId: invoiceComparison.pairId,
    examplePath: "/examples/invoice-management",
    resultsPath: "/examples/invoice-management/results",
    playPath: "/play/invoice-management",
    screenshotBase: `/experiments/invoice-management/runs/${invoiceComparison.pairId}`,
    environment: invoiceRun["environment"],
    comparison: invoiceComparison,
    baselineEvaluation: invoiceBaseline,
    harnessEvaluation: invoiceHarness,
    harnessNote,
  },
};

export const experimentRunList: ExperimentRun[] = [
  experimentRuns["account-management"],
  experimentRuns["invoice-management"],
];

export function isExperimentId(value: string | null): value is ExperimentId {
  return value !== null && value in experimentRuns;
}

// デザインハーネスの説明ページは顧客管理のRunを例に書いているため、既存の名前でも引けるようにする
const defaultRun = experimentRuns["account-management"];
export const baselineEvaluation = defaultRun.baselineEvaluation;
export const harnessEvaluation = defaultRun.harnessEvaluation;
export const comparison = defaultRun.comparison;
export const runEnvironment = defaultRun.environment;
export const sameModelRuns: SameModelRun[] = accountSameModelRuns;
