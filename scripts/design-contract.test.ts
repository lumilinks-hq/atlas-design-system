import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const rootDir = resolve(import.meta.dirname, "..");

async function readJson(path: string) {
  return JSON.parse(await readFile(resolve(rootDir, path), "utf8"));
}

describe("Atlas design contract references", () => {
  it("maps the Design Harness brand color to the HeroUI accent", async () => {
    const tokens = await readJson("design/tokens.json");
    const theme = await readFile(resolve(rootDir, "src/generated/theme.css"), "utf8");

    expect(tokens.color.accent).toBe("#0d0bb6");
    expect(theme).toContain("--accent: #0d0bb6;");
    expect(tokens.shadow.overlay).toContain("oklch(0 0 0 / 0.18)");
    expect(theme).toContain("--dh-shadow-overlay:");
    expect(theme).toContain(`--dh-shadow-dragging: ${tokens.shadow.dragging};`);
    expect(theme).toContain(`--surface-shadow: ${tokens.shadow.raised};`);
    expect(theme).toContain(`--overlay-shadow: ${tokens.shadow.overlay};`);
  });

  it("maps the account management example to a real page layout variant", async () => {
    const pattern = await readJson("design/patterns/page-layout.json");
    const example = await readJson("design/examples/account-management.json");
    const manifest = await readJson("experiments/account-management/manifest.json");

    expect(example.pattern).toBe(pattern.id);
    expect(pattern.variants.map((variant: { id: string }) => variant.id)).toContain(example.variant);
    expect(manifest.designRefs.patterns).toContain(`${pattern.id}#${example.variant}`);
    expect(manifest.designRefs.examples).toContain(example.id);
  });

  it("publishes the spacing pattern with Atlas spacing tokens", async () => {
    const pattern = await readJson("design/patterns/spacing-layout.json");
    const tokens = await readJson("design/tokens.json");

    expect(pattern.id).toBe("pattern.spacing-layout");
    expect(pattern.variants.map((variant: { id: string }) => variant.id)).toEqual([
      "page-content",
      "surface-content",
      "dialog-content",
      "inline-actions",
    ]);
    expect(tokens.space).toMatchObject({ "1": "4px", "2": "8px", "4": "16px", "6": "24px", "8": "32px" });
  });
});
