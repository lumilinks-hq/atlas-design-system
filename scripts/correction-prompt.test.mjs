import { describe, expect, it } from "vitest";
import { correctionPrompt } from "./correction-prompt.mjs";

describe("correctionPrompt", () => {
  it("VALIDATION.mdの失敗だけを直し、Atlas契約に従うよう指示する", () => {
    expect(correctionPrompt).toContain("VALIDATION.md");
    expect(correctionPrompt).toContain("HARNESS_RESOLVED.json");
    expect(correctionPrompt).toContain("DESIGN.mdとdesign/は変更せず");
  });

  it("一時ファイルは特定のファイル名ではなく理由付きの一般ルールで禁じる", () => {
    expect(correctionPrompt).not.toContain("debug.test.tsx");
    expect(correctionPrompt).toContain("一時テスト");
    expect(correctionPrompt).toContain("削除");
  });
});
