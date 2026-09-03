import { describe, expect, it } from "vitest";
import { defaultRunnerId, listRunnerIds, resolveRunner } from "./index.mjs";

describe("resolveRunner", () => {
  it("未知のrunner名は例外", () => {
    expect(() => resolveRunner("gemini")).toThrow(/gemini/);
  });

  it("登録済みrunnerは id・command・defaultModel・versionArgs を持つ", () => {
    for (const id of listRunnerIds()) {
      const runner = resolveRunner(id);
      expect(runner.id).toBe(id);
      expect(typeof runner.command).toBe("string");
      expect(typeof runner.defaultModel).toBe("string");
      expect(Array.isArray(runner.versionArgs)).toBe(true);
    }
  });

  it("codex と claude が登録されている", () => {
    expect(listRunnerIds()).toEqual(expect.arrayContaining(["codex", "claude"]));
  });
});

describe("defaultRunnerId", () => {
  it("--runner 引数 → AGENT_RUNNER → codex の順で決める", () => {
    expect(defaultRunnerId({ runner: "claude" }, { AGENT_RUNNER: "codex" })).toBe("claude");
    expect(defaultRunnerId({}, { AGENT_RUNNER: "claude" })).toBe("claude");
    expect(defaultRunnerId({}, {})).toBe("codex");
  });
});

describe("codex adapter", () => {
  const codex = resolveRunner("codex");

  it("可変長の-iにpromptが飲まれないよう--区切りの後にpromptを置く", () => {
    const args = codex.buildExecArgs({
      model: "gpt-5.4",
      images: ["/shots/a.png", "/shots/b.png"],
      prompt: "レビューしてください",
    });
    expect(args.at(-1)).toBe("レビューしてください");
    expect(args.at(-2)).toBe("--");
    const separatorIndex = args.indexOf("--");
    expect(args.indexOf("-i")).toBeGreaterThan(-1);
    expect(args.lastIndexOf("/shots/b.png")).toBeLessThan(separatorIndex);
  });

  it("json指定で--jsonを付け、modelとcwdを渡す", () => {
    const args = codex.buildExecArgs({ model: "gpt-5.4", prompt: "p", json: true, cwd: "/ws" });
    expect(args).toContain("--json");
    expect(args[args.indexOf("--model") + 1]).toBe("gpt-5.4");
    expect(args[args.indexOf("-C") + 1]).toBe("/ws");
    expect(args.at(-1)).toBe("p");
  });
});

describe("claude adapter", () => {
  const claude = resolveRunner("claude");

  it("-p でpromptを渡し、modelとstream-jsonを指定する", () => {
    const args = claude.buildExecArgs({ model: "claude-opus-5", prompt: "p", json: true });
    expect(args[args.indexOf("-p") + 1]).toBe("p");
    expect(args[args.indexOf("--model") + 1]).toBe("claude-opus-5");
    expect(args[args.indexOf("--output-format") + 1]).toBe("stream-json");
    expect(args).toContain("--verbose");
  });

  it("画像フラグが無いので画像パスをprompt本文に含める", () => {
    const args = claude.buildExecArgs({ model: "claude-opus-5", prompt: "p", images: ["/shots/a.png"] });
    const prompt = args[args.indexOf("-p") + 1];
    expect(prompt).toContain("/shots/a.png");
    expect(prompt).toContain("p");
    expect(args).not.toContain("--output-format");
  });
});
