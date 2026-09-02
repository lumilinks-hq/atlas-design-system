import { describe, expect, it } from "vitest";
import { resolveMaskedUsername, sanitizeEventRecord, sanitizeText } from "./sanitize-run-artifacts.mjs";

describe("run artifact sanitizer", () => {
  it("端末固有のパスと秘密情報を置き換える", () => {
    const text = "/Users/example/project sk-abcdefghijklmnopqrstuvwxyz Authorization: Bearer secret.token";
    expect(sanitizeText(text)).not.toContain("/Users/example");
    expect(sanitizeText(text)).not.toContain("sk-abcdefghijklmnopqrstuvwxyz");
    expect(sanitizeText(text)).not.toContain("secret.token");
  });

  it("ローカルSkillの本文をイベントから除く", () => {
    const event = {
      item: {
        type: "command_execution",
        command: "cat /Users/example/.agents/skills/example/SKILL.md",
        aggregated_output: "private instruction",
      },
    };
    expect(sanitizeEventRecord(event).item).toEqual({
      type: "command_execution",
      command: "[redacted: local agent instruction read]",
      aggregated_output: "[redacted: local agent instruction]",
    });
  });

  it("OSユーザー名を<user>へ置き換える", () => {
    const text = "drwxr-xr-x@ 3 testuser staff 512 /Users/testuser/works";

    const output = sanitizeText(text, { env: {}, username: "testuser" });

    expect(output).not.toContain("testuser");
    expect(output).toContain("<user>");
    expect(output).toContain("<home>/works");
  });

  it("ユーザー名の単語境界を守り、3文字未満は置き換えない", () => {
    expect(sanitizeText("testuserx", { env: {}, username: "testuser" })).toBe("testuserx");
    expect(sanitizeText("ab cab", { env: {}, username: "ab" })).toBe("ab cab");
  });

  it("正規表現記号を含むユーザー名をそのまま扱う", () => {
    expect(sanitizeText("a.c abc", { env: {}, username: "a.c" })).toBe("<user> abc");
  });

  it("CIでは一般語のユーザー名を置き換えない", () => {
    expect(resolveMaskedUsername({ env: { CI: "true" }, username: "runner" })).toBeNull();
    expect(resolveMaskedUsername({ env: {}, username: "testuser" })).toBe("testuser");
    expect(resolveMaskedUsername({ env: {}, username: "ab" })).toBeNull();
  });

  it("イベント内の文字列にもユーザー名の置き換えを適用する", () => {
    const event = { item: { type: "command_execution", aggregated_output: "owner testuser" } };

    expect(sanitizeEventRecord(event, { env: {}, username: "testuser" }).item.aggregated_output)
      .toBe("owner <user>");
  });
});
