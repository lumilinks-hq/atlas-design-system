// @vitest-environment node
import Ajv2020 from "ajv/dist/2020.js";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { countRefinements, dispatch, formatFixNotes, loadRunInput, refinementArtifacts } from "./harness-dispatch.mjs";
import { rootDir, walk } from "./lib.mjs";

async function readJson(path) {
  return JSON.parse(await readFile(resolve(rootDir, path), "utf8"));
}

// validate-design.mjs と同じ設定でスキーマを検証する
const ajv = new Ajv2020({ allErrors: true, strict: true });
const validatePolicy = ajv.compile(await readJson("design/schemas/harness-policy.schema.json"));
const validateDecisions = ajv.compile(await readJson("design/schemas/decisions.schema.json"));
const validateJudgments = ajv.compile(await readJson("design/schemas/judgments.schema.json"));
const harnessPolicy = await readJson("design/harness-policy.json");
const ruleIds = new Set((await readJson("design/rules.json")).rules.map((rule) => rule.id));

const policy = {
  thresholds: { fix: 0.8, pass: 0.2 },
  maxFixIterations: 2,
  requireApproval: ["color.semantic"],
  requiredChecks: ["typecheck", "test", "build"],
  decidedBy: "design-system-owner",
  decidedAt: "2026-09-19",
};

const passedChecks = [
  { name: "typecheck", status: "passed", exitCode: 0 },
  { name: "test", status: "passed", exitCode: 0 },
  { name: "build", status: "passed", exitCode: 0 },
];

function input(overrides = {}) {
  return { rules: [], checks: passedChecks, judgments: [], decisions: [], iteration: 0, ...overrides };
}

function rule(id, status) {
  return { id, status, evidence: [] };
}

function judgment(ruleId, fields) {
  return { ruleId, model: "test-model", judgedAt: "2026-09-19T00:00:00.000Z", ...fields };
}

function decision(ruleId, value) {
  return { ruleId, decision: value, reason: "確認した", decidedBy: "reviewer", decidedAt: "2026-09-19T00:00:00.000Z" };
}

function ruleResult(result, ruleId) {
  return result.rules.find((item) => item.ruleId === ruleId);
}

describe("dispatch: コードの検査", () => {
  it("passed のルールは通過", () => {
    const result = dispatch(input({ rules: [rule("a", "passed")] }), policy);
    expect(ruleResult(result, "a")).toEqual({ ruleId: "a", step: "pass", reason: "check.passed" });
  });

  it("failed のルールは修正", () => {
    const result = dispatch(input({ rules: [rule("a", "failed")] }), policy);
    expect(ruleResult(result, "a")).toEqual({ ruleId: "a", step: "fix", reason: "check.failed" });
  });

  it("修正回数が上限に達していれば、failed でも人の判断", () => {
    const result = dispatch(input({ rules: [rule("a", "failed")], iteration: 2 }), policy);
    expect(ruleResult(result, "a")).toEqual({ ruleId: "a", step: "human", reason: "iteration.limit" });
  });
});

describe("dispatch: モデルの判定", () => {
  it("review で判定がなければ人の判断", () => {
    const result = dispatch(input({ rules: [rule("a", "review")] }), policy);
    expect(ruleResult(result, "a")).toMatchObject({ step: "human", reason: "judgment.missing" });
  });

  it("根拠が足りないと判定されていれば人の判断", () => {
    const judgments = [judgment("a", { probability: 0.95, evidenceSufficient: false })];
    const result = dispatch(input({ rules: [rule("a", "review")], judgments }), policy);
    expect(ruleResult(result, "a")).toMatchObject({ step: "human", reason: "judgment.insufficient" });
  });

  it("違反の確率がしきい値ちょうどなら修正", () => {
    const judgments = [judgment("a", { probability: 0.8 })];
    const result = dispatch(input({ rules: [rule("a", "review")], judgments }), policy);
    expect(ruleResult(result, "a")).toMatchObject({ step: "fix", reason: "judgment.high" });
  });

  it("確率が中間なら人の判断", () => {
    const judgments = [judgment("a", { probability: 0.5 })];
    const result = dispatch(input({ rules: [rule("a", "review")], judgments }), policy);
    expect(ruleResult(result, "a")).toMatchObject({ step: "human", reason: "judgment.middle" });
  });

  it("確率が下限ちょうどなら通過", () => {
    const judgments = [judgment("a", { probability: 0.2 })];
    const result = dispatch(input({ rules: [rule("a", "review")], judgments }), policy);
    expect(ruleResult(result, "a")).toMatchObject({ step: "pass", reason: "judgment.low" });
  });

  it("確率が低くても、承認が要るルールは人の判断", () => {
    const judgments = [judgment("color.semantic", { probability: 0.05 })];
    const result = dispatch(input({ rules: [rule("color.semantic", "review")], judgments }), policy);
    expect(ruleResult(result, "color.semantic")).toMatchObject({ step: "human", reason: "approval.required" });
  });

  it("確率がなければ verdict を使い、concern は中間、pass は下限以下とみなす", () => {
    const judgments = [judgment("a", { verdict: "concern" }), judgment("b", { verdict: "pass" })];
    const result = dispatch(input({ rules: [rule("a", "review"), rule("b", "review")], judgments }), policy);
    expect(ruleResult(result, "a")).toMatchObject({ step: "human", reason: "judgment.middle" });
    expect(ruleResult(result, "b")).toMatchObject({ step: "pass", reason: "judgment.low" });
  });

  it("確率が高くても、修正回数が上限なら人の判断", () => {
    const judgments = [judgment("a", { probability: 0.9 })];
    const result = dispatch(input({ rules: [rule("a", "review")], judgments, iteration: 2 }), policy);
    expect(ruleResult(result, "a")).toMatchObject({ step: "human", reason: "iteration.limit" });
  });

  it("修正の前の判定は使わない。修正でコードが変わったため", () => {
    const result = dispatch(
      input({ rules: [rule("state.failure", "review")], judgments: [judgment("state.failure", { probability: 0.1, iteration: 0 })], iteration: 1 }),
      policy,
    );
    expect(ruleResult(result, "state.failure")).toEqual({ ruleId: "state.failure", step: "human", reason: "judgment.missing" });
  });

  it("今の修正回数の判定は使う", () => {
    const result = dispatch(
      input({ rules: [rule("state.failure", "review")], judgments: [judgment("state.failure", { probability: 0.1, iteration: 1 })], iteration: 1 }),
      policy,
    );
    expect(ruleResult(result, "state.failure")).toMatchObject({ step: "pass", reason: "judgment.low" });
  });

  it("コードの検査が passed なら、判定が高くても通過", () => {
    const judgments = [judgment("a", { probability: 0.99 })];
    const result = dispatch(input({ rules: [rule("a", "passed")], judgments }), policy);
    expect(ruleResult(result, "a")).toMatchObject({ step: "pass", reason: "check.passed" });
  });
});

describe("dispatch: 人の判断", () => {
  it("採用なら failed でも通過", () => {
    const result = dispatch(input({ rules: [rule("a", "failed")], decisions: [decision("a", "accept")] }), policy);
    expect(ruleResult(result, "a")).toMatchObject({ step: "pass", reason: "decision.accept" });
  });

  it("差し戻しなら passed でも修正", () => {
    const result = dispatch(input({ rules: [rule("a", "passed")], decisions: [decision("a", "reject")] }), policy);
    expect(ruleResult(result, "a")).toMatchObject({ step: "fix", reason: "decision.reject" });
  });

  it("差し戻しでも、修正回数が上限なら人の判断", () => {
    const decisions = [{ ...decision("a", "reject"), iteration: 2 }];
    const result = dispatch(input({ rules: [rule("a", "passed")], decisions, iteration: 2 }), policy);
    expect(ruleResult(result, "a")).toMatchObject({ step: "human", reason: "iteration.limit" });
  });

  it("保留なら人の判断", () => {
    const result = dispatch(input({ rules: [rule("a", "passed")], decisions: [decision("a", "defer")] }), policy);
    expect(ruleResult(result, "a")).toMatchObject({ step: "human", reason: "decision.defer" });
  });

  it("同じルールに判断が複数あれば、最後のものを使う", () => {
    const decisions = [decision("a", "defer"), decision("a", "accept")];
    const result = dispatch(input({ rules: [rule("a", "review")], decisions }), policy);
    expect(ruleResult(result, "a")).toMatchObject({ step: "pass", reason: "decision.accept" });
  });

  it("差し戻しの後に修正をかけていれば、差し戻しは使い終わったものとして検査と判定に戻る", () => {
    const decisions = [{ ...decision("a", "reject"), iteration: 0 }, { ...decision("b", "reject"), iteration: 0 }];
    const result = dispatch(input({ rules: [rule("a", "review"), rule("b", "failed")], decisions, iteration: 1 }), policy);
    expect(ruleResult(result, "a")).toMatchObject({ step: "human", reason: "judgment.missing" });
    expect(ruleResult(result, "b")).toMatchObject({ step: "fix", reason: "check.failed" });
  });

  it("修正回数の記録がない差し戻しは、修正前（0 回目）の判断とみなす", () => {
    const decisions = [decision("a", "reject")];
    expect(ruleResult(dispatch(input({ rules: [rule("a", "passed")], decisions }), policy), "a")).toMatchObject({ reason: "decision.reject" });
    expect(ruleResult(dispatch(input({ rules: [rule("a", "passed")], decisions, iteration: 1 }), policy), "a")).toMatchObject({ reason: "check.passed" });
  });

  it("採用と保留は修正をかけた後も使う", () => {
    const decisions = [{ ...decision("a", "accept"), iteration: 0 }, { ...decision("b", "defer"), iteration: 0 }];
    const result = dispatch(input({ rules: [rule("a", "failed"), rule("b", "failed")], decisions, iteration: 1 }), policy);
    expect(ruleResult(result, "a")).toMatchObject({ step: "pass", reason: "decision.accept" });
    expect(ruleResult(result, "b")).toMatchObject({ step: "human", reason: "decision.defer" });
  });
});

describe("dispatch: 実行時の検査", () => {
  it("必須の検査が通っていれば通過として並べる", () => {
    const result = dispatch(input(), policy);
    expect(result.checks).toEqual([
      { name: "typecheck", step: "pass", reason: "runtime.passed" },
      { name: "test", step: "pass", reason: "runtime.passed" },
      { name: "build", step: "pass", reason: "runtime.passed" },
    ]);
  });

  it("必須でない検査（lint、design-rules）は結果に入れない", () => {
    const checks = [...passedChecks, { name: "lint", status: "failed", exitCode: 1 }, { name: "design-rules", status: "failed", exitCode: 1 }];
    const result = dispatch(input({ checks }), policy);
    expect(result.checks.map((check) => check.name)).toEqual(["typecheck", "test", "build"]);
    expect(result.step).toBe("advance");
  });

  it("失敗していれば修正、上限なら人の判断", () => {
    const checks = [{ name: "typecheck", status: "failed", exitCode: 2 }, ...passedChecks.slice(1)];
    expect(dispatch(input({ checks }), policy).checks[0]).toEqual({ name: "typecheck", step: "fix", reason: "runtime.failed" });
    expect(dispatch(input({ checks, iteration: 2 }), policy).checks[0]).toEqual({ name: "typecheck", step: "human", reason: "iteration.limit" });
  });

  it("記録がなければ人の判断", () => {
    const result = dispatch(input({ checks: passedChecks.slice(0, 2) }), policy);
    expect(result.checks[2]).toEqual({ name: "build", step: "human", reason: "runtime.missing" });
  });
});

describe("dispatch: 全体の次の工程", () => {
  it("修正が 1 件でもあれば修正", () => {
    const result = dispatch(input({ rules: [rule("a", "failed"), rule("b", "review")] }), policy);
    expect(result.step).toBe("fix");
  });

  it("修正がなく人の判断が残っていれば人の判断", () => {
    const result = dispatch(input({ rules: [rule("a", "passed"), rule("b", "review")] }), policy);
    expect(result.step).toBe("human");
  });

  it("修正も人の判断もなく、実行時の検査も通っていれば次工程へ", () => {
    const decisions = [decision("b", "accept")];
    const result = dispatch(input({ rules: [rule("a", "passed"), rule("b", "review")], decisions }), policy);
    expect(result.step).toBe("advance");
  });

  it("ルールがすべて通過でも、実行時の検査が失敗していれば修正", () => {
    const checks = [{ name: "test", status: "failed", exitCode: 1 }, passedChecks[0], passedChecks[2]];
    const result = dispatch(input({ rules: [rule("a", "passed")], checks }), policy);
    expect(result.step).toBe("fix");
  });
});

describe("修正回数と記録の名前", () => {
  it("refine の記録を数える。生成時の events.jsonl と stderr は数えない", () => {
    expect(countRefinements([])).toBe(0);
    expect(countRefinements(["events.jsonl", "refinement-stderr.log", "refinement-events.jsonl"])).toBe(1);
    expect(countRefinements(["refinement-events.jsonl", "refinement-events.2.jsonl"])).toBe(2);
  });

  it("1 回目は保存済み Run と同じ名前、2 回目からは回数を付ける", () => {
    expect(refinementArtifacts(1)).toEqual({ events: "refinement-events.jsonl", stderr: "refinement-stderr.log" });
    expect(refinementArtifacts(2)).toEqual({ events: "refinement-events.2.jsonl", stderr: "refinement-stderr.2.log" });
  });

  it("付けた名前を数え直すと回数に戻る", () => {
    const artifacts = [1, 2, 3].flatMap((iteration) => Object.values(refinementArtifacts(iteration)));
    expect(countRefinements(artifacts)).toBe(3);
  });

  it("記録したときの回数の差し戻しは次の修正で使い、その修正の記録が増えると使い終わる", () => {
    const artifacts = ["events.jsonl", ...Object.values(refinementArtifacts(1))];
    const reject = { ...decision("a", "reject"), iteration: countRefinements(artifacts) };
    const before = input({ rules: [rule("a", "passed")], decisions: [reject], iteration: countRefinements(artifacts) });
    expect(ruleResult(dispatch(before, policy), "a")).toEqual({ ruleId: "a", step: "fix", reason: "decision.reject" });

    const after = { ...before, iteration: countRefinements([...artifacts, ...Object.values(refinementArtifacts(2))]) };
    expect(ruleResult(dispatch(after, policy), "a")).toEqual({ ruleId: "a", step: "pass", reason: "check.passed" });
  });
});

describe("formatFixNotes: VALIDATION.md に載らない修正対象", () => {
  const titles = new Map([
    ["a", "ルール A"],
    ["b", "ルール B"],
  ]);

  it("VALIDATION.md の失敗だけを直せばよいときは何も返さない", () => {
    const value = input({ rules: [rule("a", "failed"), rule("b", "passed")] });
    expect(formatFixNotes(value, dispatch(value, policy), titles)).toBeUndefined();
  });

  it("人の差し戻しは、判断の理由を根拠として追加で直させる", () => {
    const value = input({ rules: [rule("a", "review")], decisions: [{ ...decision("a", "reject"), reason: "空の状態に説明がない" }] });
    const notes = formatFixNotes(value, dispatch(value, policy), titles);
    expect(notes).toContain("## 追加で修正するルール");
    expect(notes).toContain("### a: ルール A");
    expect(notes).toContain("人が差し戻し");
    expect(notes).toContain("空の状態に説明がない");
  });

  it("違反の確率が高い判定は、判定のメモを根拠にする", () => {
    const value = input({ rules: [rule("a", "review")], judgments: [judgment("a", { probability: 0.9, note: "色だけで状態を示している" })] });
    const notes = formatFixNotes(value, dispatch(value, policy), titles);
    expect(notes).toContain("違反の確率が高い");
    expect(notes).toContain("色だけで状態を示している");
  });

  it("人が採用、保留した failed のルールは、直さないルールとして並べる", () => {
    const value = input({
      rules: [rule("a", "failed"), rule("b", "failed")],
      decisions: [decision("a", "accept"), decision("b", "defer")],
    });
    const notes = formatFixNotes(value, dispatch(value, policy), titles);
    expect(notes).toContain("## 修正しないルール");
    expect(notes).toContain("- a: ルール A（人が採用）");
    expect(notes).toContain("- b: ルール B（人が保留）");
    expect(notes).not.toContain("## 追加で修正するルール");
  });
});

describe("harness-policy.json", () => {
  it("スキーマに合う", () => {
    expect(validatePolicy(harnessPolicy), ajv.errorsText(validatePolicy.errors)).toBe(true);
  });

  it("下限は修正のしきい値より小さい", () => {
    expect(harnessPolicy.thresholds.pass).toBeLessThan(harnessPolicy.thresholds.fix);
  });

  it("承認が要るルールはすべて rules.json にある", () => {
    for (const ruleId of harnessPolicy.requireApproval) expect(ruleIds, ruleId).toContain(ruleId);
  });

  it("知らないキーを拒否する", () => {
    expect(validatePolicy({ ...harnessPolicy, extra: true })).toBe(false);
  });
});

describe("decisions.schema.json", () => {
  it("判断の記録を受け付ける", () => {
    const value = { decisions: [decision("a11y.error-recovery", "accept")] };
    expect(validateDecisions(value), ajv.errorsText(validateDecisions.errors)).toBe(true);
  });

  it("採用、差し戻し、保留以外の判断を拒否する", () => {
    expect(validateDecisions({ decisions: [decision("a", "approve")] })).toBe(false);
  });

  it("理由と判断した人を必須にする", () => {
    const withoutReason = decision("a", "accept");
    delete withoutReason.reason;
    const withoutDecidedBy = decision("a", "accept");
    delete withoutDecidedBy.decidedBy;
    expect(validateDecisions({ decisions: [withoutReason] })).toBe(false);
    expect(validateDecisions({ decisions: [withoutDecidedBy] })).toBe(false);
  });

  it("判断したときの修正回数を 0 以上の整数で残せる", () => {
    expect(validateDecisions({ decisions: [{ ...decision("a", "reject"), iteration: 1 }] })).toBe(true);
    expect(validateDecisions({ decisions: [{ ...decision("a", "reject"), iteration: -1 }] })).toBe(false);
    expect(validateDecisions({ decisions: [{ ...decision("a", "reject"), iteration: 1.5 }] })).toBe(false);
  });
});

describe("judgments.schema.json", () => {
  const jev = {
    ruleId: "a11y.control-name",
    probability: 0.12,
    evidenceSufficient: true,
    note: "名前のない操作は見つからない",
    details: [{ subject: "Button「編集」", probability: 0.12 }],
    model: "jev-1.13.0",
    judgedAt: "2026-09-19T00:00:00.000Z",
    iteration: 0,
  };

  it("判定器の名前と、ルールごとの判定を受け付ける", () => {
    const value = { judge: "jev", judgments: [jev] };
    expect(validateJudgments(value), ajv.errorsText(validateJudgments.errors)).toBe(true);
  });

  it("確率は 0 から 1", () => {
    expect(validateJudgments({ judge: "jev", judgments: [{ ...jev, probability: 1.2 }] })).toBe(false);
    expect(validateJudgments({ judge: "jev", judgments: [{ ...jev, details: [{ subject: "x", probability: -0.1 }] }] })).toBe(false);
  });

  it("モデルと修正回数を必須にする（古い判定を見分けるため）", () => {
    const withoutModel = { ...jev };
    delete withoutModel.model;
    const withoutIteration = { ...jev };
    delete withoutIteration.iteration;
    expect(validateJudgments({ judge: "jev", judgments: [withoutModel] })).toBe(false);
    expect(validateJudgments({ judge: "jev", judgments: [withoutIteration] })).toBe(false);
  });
});

describe("loadRunInput: judgments.json", () => {
  let runDir;

  afterEach(async () => {
    if (runDir) await rm(runDir, { recursive: true, force: true });
    runDir = undefined;
  });

  async function createRunDir(files) {
    runDir = await mkdtemp(join(tmpdir(), "atlas-harness-judgments-"));
    const run = { checks: passedChecks, artifacts: ["refinement-events.jsonl"] };
    const evaluation = {
      rules: [rule("state.failure", "review"), rule("a11y.control-name", "review")],
      review: {
        model: "claude-opus-5",
        reviewedAt: "2026-09-19T00:00:00.000Z",
        findings: [
          { ruleId: "state.failure", verdict: "concern", note: "失敗の画面がない" },
          { ruleId: "a11y.control-name", verdict: "pass", note: "名前がある" },
        ],
      },
    };
    await writeFile(join(runDir, "run.json"), JSON.stringify(run));
    await writeFile(join(runDir, "design-evaluation.json"), JSON.stringify(evaluation));
    for (const [name, value] of Object.entries(files)) await writeFile(join(runDir, name), JSON.stringify(value));
    return runDir;
  }

  it("レビューの所見は今の修正回数の判定として読む。evaluate が消すので、残っていれば最新のため", async () => {
    const { judgments } = await loadRunInput(await createRunDir({}));
    expect(judgments.map((item) => item.iteration)).toEqual([1, 1]);
  });

  it("judgments.json があれば、同じルールではレビューの所見より優先する", async () => {
    const dir = await createRunDir({
      "judgments.json": { judge: "jev", judgments: [judgment("state.failure", { probability: 0.1, evidenceSufficient: true, iteration: 1 })] },
    });
    const loaded = await loadRunInput(dir);
    const result = dispatch(loaded, policy);
    expect(ruleResult(result, "state.failure")).toMatchObject({ step: "pass", reason: "judgment.low" });
    // judgments.json にないルールはレビューの所見のまま
    expect(ruleResult(result, "a11y.control-name")).toMatchObject({ step: "pass", reason: "judgment.low" });
  });
});

// 保存済み Run を読み、今の方針で振り分けた結果を確かめる。Run の再生成はしない
const savedRunDirs = (await walk(resolve(rootDir, "experiments")))
  .filter((path) => path.includes("/runs/") && path.endsWith("/run.json"))
  .map((path) => dirname(path));

function runName(runDir) {
  const [experiment, , pairId, mode] = relative(resolve(rootDir, "experiments"), runDir).split("/");
  return `${experiment}/${pairId}/${mode}`;
}

const cleanRuns = [
  "account-management/create-01/harness-corrected",
  "account-management/fast-01/harness",
  "account-management/lint-01/harness",
  "account-management/mvp-11/harness-corrected",
];

describe("保存済み Run の振り分け", () => {
  it("13 本の Run を読む", () => {
    expect(savedRunDirs).toHaveLength(13);
  });

  it("harness-corrected だけを修正 1 回とみなす", async () => {
    for (const runDir of savedRunDirs) {
      const { iteration } = await loadRunInput(runDir);
      expect(iteration, runName(runDir)).toBe(runName(runDir).endsWith("/harness-corrected") ? 1 : 0);
    }
  });

  it("review.findings を判定として読む", async () => {
    const runDir = resolve(rootDir, "experiments/account-management/runs/create-01/harness-corrected");
    const { judgments } = await loadRunInput(runDir);
    expect(judgments.find((item) => item.ruleId === "state.failure")).toMatchObject({
      ruleId: "state.failure",
      verdict: "concern",
      model: "claude-opus-5",
    });
  });

  it("13 本すべてに、あとから足した Jev の判定がある。ai-review の 5 件を 1 回ずつ", async () => {
    for (const runDir of savedRunDirs) {
      const { judgments } = await loadRunInput(runDir);
      const jev = judgments.filter((item) => item.model === "jev-1.13.0");
      expect(jev.map((item) => item.ruleId).sort(), runName(runDir)).toEqual([
        "a11y.color-only",
        "a11y.control-name",
        "a11y.error-recovery",
        "color.semantic",
        "state.failure",
      ]);
    }
  });

  it("failed が 0 の 4 本は、エラー表示の文言が中間なので人の判断", async () => {
    for (const runDir of savedRunDirs.filter((dir) => cleanRuns.includes(runName(dir)))) {
      const result = dispatch(await loadRunInput(runDir), harnessPolicy);
      expect(result.step, runName(runDir)).toBe("human");
      expect(ruleResult(result, "a11y.error-recovery"), runName(runDir)).toMatchObject({ step: "human", reason: "judgment.middle" });
    }
  });

  it("失敗状態は、画像レビューでは 4 本とも中間だったが、Jev はコードから 3 本を通す", async () => {
    const steps = {};
    for (const runDir of savedRunDirs.filter((dir) => cleanRuns.includes(runName(dir)))) {
      steps[runName(runDir)] = ruleResult(dispatch(await loadRunInput(runDir), harnessPolicy), "state.failure").step;
    }
    expect(steps).toEqual({
      "account-management/create-01/harness-corrected": "human",
      "account-management/fast-01/harness": "pass",
      "account-management/lint-01/harness": "pass",
      "account-management/mvp-11/harness-corrected": "pass",
    });
  });

  it("aria-label のない閉じるボタンがある create-01/harness は、操作の名前も修正に入る", async () => {
    const runDir = resolve(rootDir, "experiments/account-management/runs/create-01/harness");
    const result = dispatch(await loadRunInput(runDir), harnessPolicy);
    expect(ruleResult(result, "a11y.control-name")).toMatchObject({ step: "fix", reason: "judgment.high" });
  });

  it("failed がある 9 本は修正", async () => {
    const failedRuns = savedRunDirs.filter((dir) => !cleanRuns.includes(runName(dir)));
    expect(failedRuns).toHaveLength(9);
    for (const runDir of failedRuns) {
      expect(dispatch(await loadRunInput(runDir), harnessPolicy).step, runName(runDir)).toBe("fix");
    }
  });

  it("画像レビューがない prelint-01 も、Jev の判定で振り分ける。全体は修正", async () => {
    const runDir = resolve(rootDir, "experiments/account-management/runs/prelint-01/harness");
    const result = dispatch(await loadRunInput(runDir), harnessPolicy);
    expect(result.step).toBe("fix");
    expect(ruleResult(result, "a11y.control-name")).toMatchObject({ step: "pass", reason: "judgment.low" });
  });

  it("create-01/harness は型の検査の失敗も修正に入る", async () => {
    const runDir = resolve(rootDir, "experiments/account-management/runs/create-01/harness");
    const result = dispatch(await loadRunInput(runDir), harnessPolicy);
    expect(result.checks.find((check) => check.name === "typecheck")).toEqual({
      name: "typecheck",
      step: "fix",
      reason: "runtime.failed",
    });
  });
});
