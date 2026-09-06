// @vitest-environment node
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { rootDir } from "./lib.mjs";

const experiments = readdirSync(resolve(rootDir, "experiments"), { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name);

describe.each(experiments)("%s の starter", (experiment) => {
  const starterDir = resolve(rootDir, "experiments", experiment, "starter");
  const read = (relativePath) => readFileSync(resolve(starterDir, relativePath), "utf8");

  it("jsdom 用の test-setup.ts を同梱する", () => {
    expect(existsSync(resolve(starterDir, "src", "test-setup.ts"))).toBe(true);
    const setup = read("src/test-setup.ts");
    expect(setup).toContain("matchMedia");
    expect(setup).toContain("ResizeObserver");
    expect(setup).toContain("scrollIntoView");
  });

  it("vitest が test-setup.ts を setupFiles に登録する", () => {
    expect(read("vitest.config.ts")).toContain("./src/test-setup.ts");
  });

  it("検証を一括で回す check スクリプトを持つ", () => {
    const packageJson = JSON.parse(read("package.json"));
    expect(packageJson.scripts.check).toBeDefined();
    expect(existsSync(resolve(starterDir, "scripts", "check.mjs"))).toBe(true);
    const check = read("scripts/check.mjs");
    for (const step of ["lint", "typecheck", "test:run"]) expect(check).toContain(step);
  });

  it("check スクリプトは lint 設定に依存する global を暗黙参照しない", () => {
    const check = read("scripts/check.mjs");
    expect(check).toContain('from "node:process"');
    expect(check).toContain('from "node:console"');
  });
});

describe("エージェントへの検証指示", () => {
  it("prompt.md が個別コマンドの連打ではなく pnpm check を指示する", () => {
    for (const experiment of experiments) {
      const prompt = readFileSync(resolve(rootDir, "experiments", experiment, "prompt.md"), "utf8");
      expect({ experiment, hasCheck: prompt.includes("pnpm check") }).toEqual({ experiment, hasCheck: true });
    }
  });

  it("SKILL.md が pnpm check を指示する", () => {
    const skill = readFileSync(resolve(rootDir, "skills", "atlas-design-system", "SKILL.md"), "utf8");
    expect(skill).toContain("pnpm check");
  });
});
