import { describe, expect, it } from "vitest";
import { sanitizeEventRecord, sanitizeText } from "./sanitize-run-artifacts.mjs";

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
});
