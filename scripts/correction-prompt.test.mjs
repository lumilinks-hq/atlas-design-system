import { describe, expect, it } from "vitest";
import { buildCorrectionPrompt, correctionPrompt } from "./correction-prompt.mjs";

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

describe("buildCorrectionPrompt", () => {
  it("NEXT_STEP.mdがなければ、生成時の修正と同じ文をそのまま使う", () => {
    expect(buildCorrectionPrompt({ withNextStep: false })).toBe(correctionPrompt);
  });

  it("NEXT_STEP.mdがあれば、修正する範囲はVALIDATION.mdよりそちらを優先させる", () => {
    const prompt = buildCorrectionPrompt({ withNextStep: true });
    expect(prompt.startsWith(correctionPrompt)).toBe(true);
    expect(prompt).toContain("NEXT_STEP.md");
    expect(prompt).toContain("優先");
  });
});
