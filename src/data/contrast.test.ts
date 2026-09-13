import { describe, expect, it } from "vitest";

import { contrastRatio, contrastReport, parseColor, relativeLuminance } from "./contrast";
import { designData } from "./design";

describe("parseColor", () => {
  it("hex を線形 sRGB に変換する", () => {
    expect(parseColor("#ffffff")).toEqual([1, 1, 1]);
    expect(parseColor("#000000")).toEqual([0, 0, 0]);
  });

  it("oklch を線形 sRGB に変換する", () => {
    const white = parseColor("oklch(1 0 0)");
    white.forEach((channel) => expect(channel).toBeCloseTo(1, 3));
    const black = parseColor("oklch(0 0 0)");
    black.forEach((channel) => expect(channel).toBeCloseTo(0, 3));
  });

  it("未対応の形式は例外にする", () => {
    expect(() => parseColor("rgb(1 2 3)")).toThrow();
  });
});

describe("relativeLuminance / contrastRatio", () => {
  it("白は 1、黒は 0", () => {
    expect(relativeLuminance("#ffffff")).toBeCloseTo(1, 5);
    expect(relativeLuminance("#000000")).toBeCloseTo(0, 5);
  });

  it("白黒の比率は 21、順序に依存しない", () => {
    expect(contrastRatio("#ffffff", "#000000")).toBeCloseTo(21, 5);
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 5);
  });

  it("Atlas の accent と surface は AA 通常文字を満たす", () => {
    const { accent, surface } = designData.tokens.color;
    expect(contrastRatio(accent, surface)).toBeGreaterThanOrEqual(4.5);
  });
});

describe("contrastReport", () => {
  const report = contrastReport(designData.tokens.color);

  it("前景/背景の組をトークン名で列挙する", () => {
    expect(report.length).toBeGreaterThan(0);
    for (const row of report) {
      expect(row.foreground in designData.tokens.color).toBe(true);
      expect(row.background in designData.tokens.color).toBe(true);
      expect([3, 4.5]).toContain(row.threshold);
    }
  });

  it("すべての組が AA（文字 4.5、非テキスト 3.0）を満たす", () => {
    for (const row of report) {
      expect(row.ratio, `${row.foreground}/${row.background}`).toBeGreaterThanOrEqual(row.threshold);
      expect(row.passes).toBe(true);
    }
  });

  it("文字色と focus の両方を含む", () => {
    const pairs = report.map((row) => `${row.foreground}/${row.background}`);
    expect(pairs).toContain("text/background");
    expect(pairs).toContain("textMuted/surface");
    expect(pairs).toContain("surface/accent");
    expect(pairs).toContain("focus/surface");
  });

  it("基準を満たさない色では passes が false になる", () => {
    const failing = contrastReport({ ...designData.tokens.color, text: designData.tokens.color.border });
    const row = failing.find((entry) => entry.foreground === "text" && entry.background === "surface");
    expect(row?.passes).toBe(false);
  });
});
