import { describe, expect, it } from "vitest";
import { scanIsolation } from "./workspace-isolation.mjs";

// 実パスを書くとpublic:auditのユーザー名検査に引っかかるので中立なパスを使う
const rootDir = "/srv/repo/demo-design-harness";

describe("scanIsolation", () => {
  it("リポジトリへの言及が無ければ全て0", () => {
    const events = [
      '{"type":"tool","command":"ls -la"}',
      '{"type":"tool","command":"cat src/App.tsx"}',
    ].join("\n");

    expect(scanIsolation(events, { rootDir })).toEqual({
      repoPathMentions: 0,
      markerMentions: { "evaluate-experiment": 0 },
    });
  });

  it("リポジトリの絶対パスを行またぎ・1行複数とも数える", () => {
    const events = [
      `{"command":"ls ${rootDir}"}`,
      `{"command":"diff ${rootDir}/a ${rootDir}/b"}`,
    ].join("\n");

    expect(scanIsolation(events, { rootDir }).repoPathMentions).toBe(3);
  });

  it("採点器などのマーカーを数える", () => {
    const events = `{"command":"cat scripts/evaluate-experiment.mjs"}\n{"text":"evaluate-experiment"}`;

    expect(scanIsolation(events, { rootDir }).markerMentions).toEqual({
      "evaluate-experiment": 2,
    });
  });

  it("マーカーは指定で差し替えられる", () => {
    const events = `{"command":"cat design/rules.json"}`;

    expect(scanIsolation(events, { rootDir, markers: ["rules.json", "measure-experiment"] }))
      .toEqual({
        repoPathMentions: 0,
        markerMentions: { "rules.json": 1, "measure-experiment": 0 },
      });
  });

  it("正規表現のメタ文字を含むパスでもリテラルとして数える", () => {
    const events = `{"command":"ls /srv/re.o/x"}`;

    expect(scanIsolation(events, { rootDir: "/srv/re.o" }).repoPathMentions).toBe(1);
    expect(scanIsolation(events, { rootDir: "/srv/reXo" }).repoPathMentions).toBe(0);
  });

  it("空文字を渡しても壊れない", () => {
    expect(scanIsolation("", { rootDir }).repoPathMentions).toBe(0);
  });
});
