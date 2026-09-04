import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { rootDir } from "./lib.mjs";
import { collectScreenSources } from "./screen-sources.mjs";

const runsDir = resolve(rootDir, "experiments", "account-management", "runs");
const read = (dir, name) => readFile(resolve(dir, name), "utf8");

describe("collectScreenSources", () => {
  it("単一 App.tsx の run では 3 ファイルをそのまま返す(mvp-11 のバイト一致を保つ)", async () => {
    const srcDir = resolve(runsDir, "mvp-11", "harness-corrected", "source");
    const sources = await collectScreenSources(srcDir);
    expect(sources.app).toBe(await read(srcDir, "App.tsx"));
    expect(sources.fixtures).toBe(await read(srcDir, "fixtures.ts"));
    expect(sources.styles).toBe(await read(srcDir, "styles.css"));
    expect(sources.tsxFiles.map((file) => file.filename)).toEqual(["src/App.tsx"]);
  });

  it("App.tsx から相対 import で辿れる画面ファイルを App.tsx を先頭に連結する", async () => {
    const srcDir = resolve(runsDir, "prelint-01", "harness", "source");
    const sources = await collectScreenSources(srcDir);
    const names = sources.tsxFiles.map((file) => file.filename);
    expect(names[0]).toBe("src/App.tsx");
    expect(names).toEqual(expect.arrayContaining([
      "src/CustomerListPage.tsx",
      "src/CustomerDetailPage.tsx",
      "src/CustomerEditDrawer.tsx",
      "src/DeleteCustomerDialog.tsx",
      "src/CustomerStatusChip.tsx",
    ]));
    // テストと起点ファイルは画面ではない
    expect(names).not.toContain("src/main.tsx");
    expect(names.some((name) => name.includes(".test."))).toBe(false);
    expect(sources.app.startsWith(await read(srcDir, "App.tsx"))).toBe(true);
    expect(sources.app).toContain("<Table.Content");
    // .ts モジュールは fixtures.ts の後ろへ連結する
    expect(sources.fixtures.startsWith(await read(srcDir, "fixtures.ts"))).toBe(true);
    expect(sources.fixtures).toContain(await read(srcDir, "screenState.ts"));
    expect(sources.fixtures).toContain(await read(srcDir, "customerStore.ts"));
    expect(sources.fixtures).not.toContain("testSetup");
  });

  it("styles.css を先頭に src 配下の CSS をすべて連結する", async () => {
    const srcDir = resolve(runsDir, "prelint-01", "harness", "source");
    const sources = await collectScreenSources(srcDir);
    expect(sources.styles).toBe(await read(srcDir, "styles.css"));
  });
});
