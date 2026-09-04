import { readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import Ajv2020 from "ajv/dist/2020.js";
import { describe, expect, it } from "vitest";
import { rootDir, walk } from "./lib.mjs";

// validate-runs.mjs はトップレベルで実行するスクリプトなので import できない。
// 同じ設定でschemaをcompileして同じ判定を再現する
const ajv = new Ajv2020({ allErrors: true, strict: true });
const runSchema = JSON.parse(
  await readFile(resolve(rootDir, "design", "schemas", "run.schema.json"), "utf8"),
);
const validateRun = ajv.compile(runSchema);

const savedRunPaths = (await walk(resolve(rootDir, "experiments")))
  .filter((path) => path.includes("/runs/") && path.endsWith("run.json"));

const baseRun = {
  id: "iso-check-harness",
  experimentId: "experiment.account-management",
  condition: "harness",
  status: "completed",
  createdAt: "2026-09-04T00:00:00.000Z",
  input: {
    briefSha256: "a",
    starterSha256: "b",
    promptSha256: "c",
    designContractSha256: "d",
  },
  environment: { runner: "claude", model: "claude-opus-5", cliVersion: "1.0.0" },
  artifacts: [],
  checks: [],
};

describe("run.schema.json", () => {
  it("保存済みrunは全て通る(isolationが無くてもよい)", () => {
    expect(savedRunPaths.length).toBeGreaterThan(0);
    for (const path of savedRunPaths) {
      const value = JSON.parse(readFileSync(path, "utf8"));
      expect(validateRun(value), `${path}: ${ajv.errorsText(validateRun.errors)}`).toBe(true);
    }
  });

  it("isolationを持つrunを受け入れる", () => {
    const run = {
      ...baseRun,
      isolation: { repoPathMentions: 0, markerMentions: { "evaluate-experiment": 0 } },
    };

    expect(validateRun(run), ajv.errorsText(validateRun.errors)).toBe(true);
  });

  it("isolationの未知キーは拒否する", () => {
    const run = {
      ...baseRun,
      isolation: { repoPathMentions: 0, markerMentions: {}, extra: 1 },
    };

    expect(validateRun(run)).toBe(false);
  });

  it("repoPathMentionsが整数でなければ拒否する", () => {
    const run = { ...baseRun, isolation: { repoPathMentions: "0", markerMentions: {} } };

    expect(validateRun(run)).toBe(false);
  });
});
