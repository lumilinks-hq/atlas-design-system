// @vitest-environment node
import Ajv2020 from "ajv/dist/2020.js";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { appendDecision, createDecision, recordDecision } from "./harness-decide.mjs";
import { rootDir } from "./lib.mjs";

const ajv = new Ajv2020({ allErrors: true, strict: true });
const validateDecisions = ajv.compile(JSON.parse(await readFile(resolve(rootDir, "design/schemas/decisions.schema.json"), "utf8")));

const now = new Date("2026-09-19T01:02:03.000Z");
const options = { ruleIds: new Set(["state.failure", "color.semantic"]), iteration: 1, now, usernames: ["localuser"] };
const fields = { ruleId: "state.failure", decision: "accept", reason: "失敗の表示は要件どおり", by: "design-system-owner" };

describe("createDecision", () => {
  it("判断した人、日時、そのときの修正回数を付けて組み立てる", () => {
    expect(createDecision(fields, options)).toEqual({
      ruleId: "state.failure",
      decision: "accept",
      reason: "失敗の表示は要件どおり",
      decidedBy: "design-system-owner",
      decidedAt: "2026-09-19T01:02:03.000Z",
      iteration: 1,
    });
  });

  it("Run の評価にないルールは拒否する", () => {
    expect(() => createDecision({ ...fields, ruleId: "no.such-rule" }, options)).toThrow("no.such-rule");
  });

  it("採用、差し戻し、保留以外は拒否する", () => {
    expect(() => createDecision({ ...fields, decision: "approve" }, options)).toThrow("accept、reject、defer");
  });

  it("理由がない、または値のない --reason は拒否する", () => {
    expect(() => createDecision({ ...fields, reason: undefined }, options)).toThrow("--reason");
    expect(() => createDecision({ ...fields, reason: true }, options)).toThrow("--reason");
    expect(() => createDecision({ ...fields, reason: "  " }, options)).toThrow("--reason");
  });

  it("OS のユーザー名を判断した人にすると拒否する（公開前の監査で落ちるため）", () => {
    expect(() => createDecision({ ...fields, by: "localuser" }, options)).toThrow("役割名");
  });

  it("理由に手元のパスが入っていれば拒否する", () => {
    // そのまま書くとこのファイル自体が公開前の監査で落ちるので、実行時に組み立てる
    const localPath = ["", "Users", "someone", "work"].join("/");
    expect(() => createDecision({ ...fields, reason: `${localPath} を見た` }, options)).toThrow("公開できない");
  });
});

describe("appendDecision", () => {
  it("前の判断を残したまま後ろに足す", () => {
    const first = createDecision(fields, options);
    const second = createDecision({ ...fields, decision: "reject", reason: "やはり説明が足りない" }, options);
    const document = appendDecision(appendDecision({ decisions: [] }, first), second);
    expect(document.decisions).toEqual([first, second]);
  });

  it("スキーマに合わない記録は足さない", () => {
    expect(() => appendDecision({ decisions: [] }, { ruleId: "state.failure" })).toThrow("decisions.json");
  });
});

describe("recordDecision", () => {
  let runDir;

  afterEach(async () => {
    if (runDir) await rm(runDir, { recursive: true, force: true });
    runDir = undefined;
  });

  async function createRunDir() {
    runDir = await mkdtemp(join(tmpdir(), "atlas-harness-decide-"));
    const run = { artifacts: ["events.jsonl", "refinement-events.jsonl", "design-evaluation.json"] };
    const evaluation = { rules: [{ id: "state.failure", status: "review", evidence: [] }] };
    await writeFile(join(runDir, "run.json"), `${JSON.stringify(run, null, 2)}\n`);
    await writeFile(join(runDir, "design-evaluation.json"), `${JSON.stringify(evaluation, null, 2)}\n`);
    return runDir;
  }

  it("decisions.json を作り、修正回数を run.json の記録から数える", async () => {
    const dir = await createRunDir();
    await recordDecision(dir, fields, { now, usernames: ["localuser"] });
    const document = JSON.parse(await readFile(join(dir, "decisions.json"), "utf8"));
    expect(validateDecisions(document), ajv.errorsText(validateDecisions.errors)).toBe(true);
    expect(document.decisions).toHaveLength(1);
    expect(document.decisions[0]).toMatchObject({ ruleId: "state.failure", iteration: 1 });
  });

  it("2 回目は追記し、run.json は書き換えない", async () => {
    const dir = await createRunDir();
    const runBefore = await readFile(join(dir, "run.json"), "utf8");
    await recordDecision(dir, fields, { now, usernames: ["localuser"] });
    await recordDecision(dir, { ...fields, decision: "defer" }, { now, usernames: ["localuser"] });
    const document = JSON.parse(await readFile(join(dir, "decisions.json"), "utf8"));
    expect(document.decisions.map((item) => item.decision)).toEqual(["accept", "defer"]);
    expect(await readFile(join(dir, "run.json"), "utf8")).toBe(runBefore);
  });

  it("評価にないルールでは decisions.json を作らない", async () => {
    const dir = await createRunDir();
    await expect(recordDecision(dir, { ...fields, ruleId: "color.semantic" }, { now, usernames: ["localuser"] })).rejects.toThrow("color.semantic");
    await expect(readFile(join(dir, "decisions.json"), "utf8")).rejects.toThrow();
  });
});
