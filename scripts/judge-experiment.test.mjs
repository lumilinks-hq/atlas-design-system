// @vitest-environment node
import Ajv2020 from "ajv/dist/2020.js";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { appendJudgments, formatJudgments, judgeRun, missingEnv, recordJudgments, selectJudgeRuleIds } from "./judge-experiment.mjs";
import { rootDir } from "./lib.mjs";

const ajv = new Ajv2020({ allErrors: true, strict: true });
const validateJudgments = ajv.compile(JSON.parse(await readFile(resolve(rootDir, "design/schemas/judgments.schema.json"), "utf8")));

const now = new Date("2026-09-19T01:02:03.000Z");
const judgment = (ruleId, fields = {}) => ({ ruleId, probability: 0.9, evidenceSufficient: true, note: "n", model: "jev-1.13.0", judgedAt: now.toISOString(), iteration: 1, ...fields });

/** 受け取った引数を覚えておき、ルールごとに決まった判定を返す */
function fakeJudge() {
  const judge = {
    id: "jev",
    requiredEnv: ["TYPESAFE_API_KEY"],
    calls: [],
    async judge(options) {
      judge.calls.push(options);
      return { judgments: options.ruleIds.map((ruleId) => judgment(ruleId, { iteration: options.iteration })), skipped: [], usage: { calls: 2, inputTokens: 300, outputTokens: 2 } };
    },
  };
  return judge;
}

describe("selectJudgeRuleIds", () => {
  it("コードで決まらず review になったルールだけを判定にかける", () => {
    const evaluation = {
      rules: [
        { id: "token.color", status: "passed", evidence: [] },
        { id: "component.variants", status: "review", evidence: [] },
        { id: "a11y.control-name", status: "review", evidence: [] },
        { id: "layout.spacing", status: "failed", evidence: [] },
      ],
    };
    expect(selectJudgeRuleIds(evaluation)).toEqual(["component.variants", "a11y.control-name"]);
  });
});

describe("missingEnv", () => {
  it("判定器が必要とする環境変数のうち、空のものを返す", () => {
    expect(missingEnv({ requiredEnv: ["TYPESAFE_API_KEY"] }, {})).toEqual(["TYPESAFE_API_KEY"]);
    expect(missingEnv({ requiredEnv: ["TYPESAFE_API_KEY"] }, { TYPESAFE_API_KEY: "" })).toEqual(["TYPESAFE_API_KEY"]);
    expect(missingEnv({ requiredEnv: ["TYPESAFE_API_KEY"] }, { TYPESAFE_API_KEY: "x" })).toEqual([]);
    expect(missingEnv({}, {})).toEqual([]);
  });
});

describe("appendJudgments", () => {
  it("初回は $schema と判定器名を付けて作る", () => {
    const document = appendJudgments(undefined, "jev", [judgment("state.failure")]);
    expect(document).toEqual({ $schema: "../../../../../design/schemas/judgments.schema.json", judge: "jev", judgments: [judgment("state.failure")] });
    expect(validateJudgments(document), ajv.errorsText(validateJudgments.errors)).toBe(true);
  });

  it("前の判定を残したまま後ろに足す", () => {
    const first = appendJudgments(undefined, "jev", [judgment("state.failure", { probability: 0.9 })]);
    const second = appendJudgments(first, "jev", [judgment("state.failure", { probability: 0.1 })]);
    expect(second.judgments.map((item) => item.probability)).toEqual([0.9, 0.1]);
  });

  it("別の判定器の結果は混ぜない（後ろの判定が前の判定器の結果を上書きしてしまうため）", () => {
    const first = appendJudgments(undefined, "jev", [judgment("state.failure")]);
    expect(() => appendJudgments(first, "review", [judgment("state.failure")])).toThrow("jev");
  });

  it("スキーマに合わない判定は足さない", () => {
    expect(() => appendJudgments(undefined, "jev", [{ ruleId: "state.failure" }])).toThrow("judgments.json");
  });
});

describe("judgeRun と recordJudgments", () => {
  let runDir;

  afterEach(async () => {
    if (runDir) await rm(runDir, { recursive: true, force: true });
    runDir = undefined;
  });

  async function createRunDir() {
    runDir = await mkdtemp(join(tmpdir(), "atlas-judge-experiment-"));
    const run = { artifacts: ["events.jsonl", "refinement-events.jsonl", "design-evaluation.json"] };
    const evaluation = {
      rules: [
        { id: "token.color", status: "passed", evidence: [] },
        { id: "state.failure", status: "review", evidence: [] },
        { id: "color.semantic", status: "review", evidence: [] },
      ],
    };
    await writeFile(join(runDir, "run.json"), `${JSON.stringify(run, null, 2)}\n`);
    await writeFile(join(runDir, "design-evaluation.json"), `${JSON.stringify(evaluation, null, 2)}\n`);
    return runDir;
  }

  it("review のルールと、run.json から数えた修正回数を判定器に渡す", async () => {
    const dir = await createRunDir();
    const judge = fakeJudge();
    const result = await judgeRun(dir, judge, { now });
    expect(judge.calls).toEqual([{ runDir: dir, ruleIds: ["state.failure", "color.semantic"], iteration: 1, now }]);
    expect(result.iteration).toBe(1);
    expect(result.judgments.map((item) => item.ruleId)).toEqual(["state.failure", "color.semantic"]);
  });

  it("judgments.json を作り、2 回目は追記する。run.json は書き換えない", async () => {
    const dir = await createRunDir();
    const runBefore = await readFile(join(dir, "run.json"), "utf8");
    await recordJudgments(dir, "jev", [judgment("state.failure")], { usernames: ["localuser"] });
    await recordJudgments(dir, "jev", [judgment("color.semantic")], { usernames: ["localuser"] });
    const document = JSON.parse(await readFile(join(dir, "judgments.json"), "utf8"));
    expect(validateJudgments(document), ajv.errorsText(validateJudgments.errors)).toBe(true);
    expect(document.judgments.map((item) => item.ruleId)).toEqual(["state.failure", "color.semantic"]);
    expect(await readFile(join(dir, "run.json"), "utf8")).toBe(runBefore);
  });

  it("手元のパスが入った判定は書かない（Run は公開するため）", async () => {
    const dir = await createRunDir();
    // そのまま書くとこのファイル自体が公開前の監査で落ちるので、実行時に組み立てる
    const localPath = ["", "Users", "someone", "work"].join("/");
    await expect(recordJudgments(dir, "jev", [judgment("state.failure", { note: `${localPath}/App.tsx` })], { usernames: ["localuser"] })).rejects.toThrow("公開できない");
    await expect(readFile(join(dir, "judgments.json"), "utf8")).rejects.toThrow();
  });
});

describe("formatJudgments", () => {
  it("確率、材料不足、LLM レビューの verdict と、判定しなかったルールを並べる", () => {
    const text = formatJudgments("mvp-11/harness", {
      iteration: 0,
      judgments: [
        judgment("a11y.control-name", { probability: 0.93, details: [{ subject: "App.tsx:92 Drawer.CloseTrigger", probability: 0.93 }] }),
        { ruleId: "state.failure", evidenceSufficient: false, note: "x", model: "jev-1.13.0", judgedAt: now.toISOString(), iteration: 0 },
        { ruleId: "color.semantic", verdict: "concern", note: "削除ボタンが赤くない", model: "gpt-5.4", judgedAt: now.toISOString(), iteration: 0 },
      ],
      skipped: ["component.variants"],
    });
    expect(text).toBe(
      [
        "mvp-11/harness（修正 0 回）",
        "  a11y.control-name  0.93     App.tsx:92 Drawer.CloseTrigger",
        "  state.failure      材料不足",
        "  color.semantic     concern  削除ボタンが赤くない",
        "  判定していない: component.variants",
      ].join("\n"),
    );
  });
});
