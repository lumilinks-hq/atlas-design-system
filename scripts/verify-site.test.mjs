import { describe, expect, it } from "vitest";
import { AXE_PAGES, AXE_TAGS, OVERFLOW_VIEWPORTS, formatAxeViolations } from "./verify-site.mjs";

describe("verify-site の検査設定", () => {
  it("WCAG 2.1 AA のタグだけを使う", () => {
    expect(AXE_TAGS).toEqual(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]);
  });

  it("200% 拡大相当の 720 幅を横スクロール検査に含む", () => {
    expect(OVERFLOW_VIEWPORTS.map((viewport) => viewport.width)).toContain(720);
  });

  it("404 ページを axe の対象に含む", () => {
    expect(AXE_PAGES.map(([path]) => path)).toContain("/no-such-page");
  });
});

describe("formatAxeViolations", () => {
  it("違反が無ければ空配列を返す", () => {
    expect(formatAxeViolations("/", [])).toEqual([]);
  });

  it("node ごとに page・rule・target を1行にする", () => {
    const lines = formatAxeViolations("/rules@1440", [
      { id: "color-contrast", impact: "serious", help: "Elements must meet minimum color contrast", nodes: [{ target: [".a"] }, { target: ["iframe", ".b"] }] },
    ]);
    expect(lines).toEqual([
      "/rules@1440 color-contrast (serious) .a - Elements must meet minimum color contrast",
      "/rules@1440 color-contrast (serious) iframe .b - Elements must meet minimum color contrast",
    ]);
  });
});
