// @vitest-environment node
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { rootDir } from "./lib.mjs";

// refine は実行すると LLM を呼ぶので、振り分けにつながっているかをソースで確かめる
const source = readFileSync(resolve(rootDir, "scripts", "refine-experiment.mjs"), "utf8");

describe("refine-experiment", () => {
  it("修正するかどうかを違反の数ではなく振り分けの結果で決める", () => {
    expect(source).toContain("dispatch(");
    expect(source).not.toContain("summary.failed === 0 &&");
  });

  it("2 回目からの修正の記録は回数付きの名前で残す", () => {
    expect(source).toContain("refinementArtifacts(");
    expect(source).not.toContain('stdoutPath: resolve(outputDir, "refinement-events.jsonl")');
  });

  it("VALIDATION.md に載らない修正の範囲を NEXT_STEP.md で渡す", () => {
    expect(source).toContain("formatFixNotes(");
    expect(source).toContain("NEXT_STEP.md");
    expect(source).toContain("buildCorrectionPrompt(");
  });

  it("振り分けの結果を next-step.json に残す", () => {
    expect(source).toContain("next-step.json");
  });
});
