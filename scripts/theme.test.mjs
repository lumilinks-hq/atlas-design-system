import { describe, expect, it } from "vitest";
import { findStaleThemeFiles, renderTheme } from "./theme.mjs";

const tokens = {
  color: { accent: "#004be0", surface: "#ffffff", focus: "#004be0" },
  space: { 1: "4px" },
  radius: { base: "12px" },
  shadow: { raised: "0 1px 2px rgba(0,0,0,.1)", overlay: "0 8px 24px rgba(0,0,0,.2)" },
  content: { maxWidth: "1200px", readingWidth: "640px" },
  breakpoint: { narrow: "768px" },
  type: { body: "16px" },
};

describe("findStaleThemeFiles", () => {
  it("全ファイルが期待値と一致すれば空配列を返す", () => {
    const theme = renderTheme(tokens);
    const files = [
      { path: "src/generated/theme.css", content: theme },
      { path: "design/theme.css", content: theme },
    ];
    expect(findStaleThemeFiles(theme, files)).toEqual([]);
  });

  it("内容が異なるファイルのpathを返す", () => {
    const theme = renderTheme(tokens);
    const files = [
      { path: "src/generated/theme.css", content: theme },
      { path: "design/theme.css", content: `${theme}\n/* 手編集 */` },
    ];
    expect(findStaleThemeFiles(theme, files)).toEqual(["design/theme.css"]);
  });

  it("ファイルが存在しない（contentがundefined）場合もstale扱いにする", () => {
    const theme = renderTheme(tokens);
    const files = [{ path: "design/theme.css", content: undefined }];
    expect(findStaleThemeFiles(theme, files)).toEqual(["design/theme.css"]);
  });
});
