import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const rootDir = resolve(import.meta.dirname, "..");

describe("public setup documentation", () => {
  it("keeps the core README commands aligned with the setup page", async () => {
    const [readme, setupPage] = await Promise.all([
      readFile(resolve(rootDir, "README.md"), "utf8"),
      readFile(resolve(rootDir, "src/pages/DocsPages.tsx"), "utf8"),
    ]);
    for (const command of ["pnpm install", "pnpm dev", "pnpm demo:check", "pnpm skills:check", "pnpm mcp:start"]) {
      expect(readme).toContain(command);
      expect(setupPage).toContain(command);
    }
    expect(readme).toContain("codex mcp add atlas-design-system");
    expect(readme).toContain("claude mcp add --scope project atlas-design-system");
    expect(setupPage).toContain("codex mcp add atlas-design-system");
    expect(setupPage).toContain("claude mcp add --scope project atlas-design-system");
  });
});

describe("design contract coverage on the docs site", () => {
  it("renders the contract fields that the design data already publishes", async () => {
    const docsPage = await readFile(resolve(rootDir, "src/pages/DocsPages.tsx"), "utf8");

    for (const reference of [
      "component.defaults.variant",
      "component.defaults.size",
      "component.visual.surfaceOwner",
      "component.visual.outerShadow",
      "component.visual.radiusToken",
      "component.relatedRules",
      "variant.layout",
      "layout.breakpoint",
      "layout.classes",
      "layout.values",
      "pattern.states",
      "example.components",
      "example.rules",
      "rule.category",
      "designData.tokens.breakpoint",
      "designData.tokens.content",
    ]) {
      expect(docsPage, reference).toContain(reference);
    }
  });

  it("labels the rule verification methods in Japanese", async () => {
    const docsPage = await readFile(resolve(rootDir, "src/pages/DocsPages.tsx"), "utf8");

    expect(docsPage).toContain('automatic: "自動検証"');
    expect(docsPage).toContain('"ai-review": "AIレビュー"');
    expect(docsPage).toContain('human: "人の判断"');
  });

  it("wires the form and alert contracts into the design data and the component page", async () => {
    const [designModule, docsPage] = await Promise.all([
      readFile(resolve(rootDir, "src/data/design.ts"), "utf8"),
      readFile(resolve(rootDir, "src/pages/DocsPages.tsx"), "utf8"),
    ]);

    expect(designModule).toContain("design/components/form.json");
    expect(designModule).toContain("design/components/alert.json");

    const componentsArray = designModule.match(/components:\s*\[([^\]]*)\]/)?.[1] ?? "";
    expect(componentsArray).toMatch(/\bform\b/);
    expect(componentsArray).toMatch(/\balert\b/);

    expect(docsPage).toContain('"component.form"');
    expect(docsPage).toContain('"component.alert"');
    expect(docsPage).toContain("Alert.Title");
  });
});
