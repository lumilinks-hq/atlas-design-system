// @vitest-environment node
import { describe, expect, it } from "vitest";
import { listJudgeIds, resolveJudge } from "./index.mjs";

describe("resolveJudge", () => {
  it("jev と review が登録されている", () => {
    expect(listJudgeIds()).toEqual(["jev", "review"]);
  });

  it("名前から判定器を作る。どれも judge を持つ", () => {
    for (const id of listJudgeIds()) {
      const judge = resolveJudge(id, { client: { systemOne: async () => ({ answers: {} }) } });
      expect(judge.id).toBe(id);
      expect(typeof judge.judge).toBe("function");
    }
  });

  it("未知の名前は使える名前と一緒に例外にする", () => {
    expect(() => resolveJudge("gemini")).toThrow("未知の判定器です: gemini（使用可能: jev, review）");
  });
});
