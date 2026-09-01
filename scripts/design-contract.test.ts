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
    expect(theme).toContain("--radius: calc(var(--dh-radius-base) / 3);");
    expect(theme).toContain("--field-radius: var(--dh-radius-base);");
  });

  it("publishes a HeroUI theme adapter without flattening compound component corners", async () => {
    const adapter = await readFile(resolve(rootDir, "design/component-theme.css"), "utf8");
    const designTheme = await readFile(resolve(rootDir, "design/theme.css"), "utf8");

    expect(adapter).toContain('@import "./theme.css";');
    expect(designTheme).toContain("--dh-accent: #0d0bb6;");
    expect(adapter).toContain(".table-root--primary");
    expect(adapter).toContain(".list-box-item");
    expect(adapter).toContain("border-radius: var(--dh-radius-base)");
    expect(adapter).not.toMatch(/\.button\s*[,{}]/);
  });

  it("defines defaults and visual rules for every approved component", async () => {
    const componentNames = [
      "alert-dialog",
      "button",
      "card",
      "chip",
      "drawer",
      "link",
      "number-field",
      "search-field",
      "select",
      "surface",
      "table",
      "text-field",
      "toolbar",
      "toast",
    ];

    for (const componentName of componentNames) {
      const component = await readJson(`design/components/${componentName}.json`);
      expect(component.variants).toContain(component.defaults.variant);
      expect(component.sizes).toContain(component.defaults.size);
      expect(component.visual.radiusToken).toMatch(/^radius\./);
    }

    expect((await readJson("design/components/button.json")).variants).toContain("outline");
    expect((await readJson("design/components/chip.json")).variants).not.toContain("default");
    expect((await readJson("design/components/select.json")).variants).toEqual(["primary", "secondary"]);
    expect((await readJson("design/components/search-field.json")).requirements.join(" ")).toContain("SearchField.ClearButton");
    expect((await readJson("design/components/link.json")).requirements.join(" ")).toContain("ButtonとonPressで代用しない");
    expect((await readJson("design/components/link.json")).relatedRules).toContain("layout.back-navigation");
    expect((await readJson("design/components/toolbar.json")).relatedRules).toContain("layout.collection-toolbar");
  });

  it("maps the account management example to a real page layout variant", async () => {
    const pattern = await readJson("design/patterns/page-layout.json");
    const example = await readJson("design/examples/account-management.json");
    const manifest = await readJson("experiments/account-management/manifest.json");

    expect(example.pattern).toBe(pattern.id);
    expect(pattern.variants.map((variant: { id: string }) => variant.id)).toContain(example.variant);
    expect(manifest.designRefs.patterns).toContain(`${pattern.id}#${example.variant}`);
    expect(manifest.designRefs.examples).toContain(example.id);
    expect(manifest.conditions.baseline.agentSkills).toEqual([]);
    expect(manifest.conditions.harness.agentSkills).toEqual([
      "atlas-design-system",
      "heroui-react",
      "ui-writing",
    ]);
    expect(pattern.anatomy.map((part: { id: string }) => part.id).slice(0, 3)).toEqual([
      "app-header",
      "back-navigation",
      "page-heading",
    ]);
    expect(pattern.variants.find((variant: { id: string }) => variant.id === "single-one-column")?.structure.slice(0, 2)).toEqual([
      "戻るナビゲーション",
      "ページ見出し",
    ]);
  });

  it("keeps Atlas implementation decisions out of the shared Issue and prompt", async () => {
    const brief = await readFile(resolve(rootDir, "experiments/account-management/brief.md"), "utf8");
    const prompt = await readFile(resolve(rootDir, "experiments/account-management/prompt.md"), "utf8");

    expect(brief).not.toMatch(/Tableの`primary`|isRowHeader|tabular|Card\.Header|Drawer.*Header.*Body.*Footer/);
    expect(prompt).not.toMatch(/顧客一覧のTableは|CustomerSummaryとCustomerDetail|詳細Cardと編集Drawer/);
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

  it("defines the narrow breakpoint once and renders it into the theme", async () => {
    const tokens = await readJson("design/tokens.json");
    const theme = await readFile(resolve(rootDir, "src/generated/theme.css"), "utf8");

    expect(tokens.breakpoint.narrow).toBe("768px");
    expect(theme).toContain("--dh-breakpoint-narrow: 768px;");
  });

  it("publishes layout partials whose media query matches the narrow breakpoint token", async () => {
    const tokens = await readJson("design/tokens.json");
    const layout = await readFile(resolve(rootDir, "design/layout.css"), "utf8");
    const narrowBoundary = Number.parseInt(tokens.breakpoint.narrow, 10) - 1;

    for (const className of [
      ".page-shell",
      ".page-shell--stack",
      ".page-heading",
      ".collection-region",
      ".collection-toolbar",
      ".search-field",
      ".collection-table-wrap",
      ".collection-list-mobile",
      ".detail-page__heading",
      ".detail-grid",
      ".drawer-form",
    ]) {
      expect(layout).toContain(className);
    }

    const mediaQueries = [...layout.matchAll(/@media\s*\(max-width:\s*(\d+)px\)/g)].map((match) => Number(match[1]));
    expect(mediaQueries.length).toBeGreaterThan(0);
    expect(mediaQueries.every((value) => value === narrowBoundary)).toBe(true);

    const drawerForm = layout.match(/\.drawer-form\s*\{[^}]*\}/)?.[0] ?? "";
    expect(drawerForm).toContain("var(--dh-space-6)");
  });

  it("gives page layout variants a machine-readable layout contract backed by layout.css", async () => {
    const pattern = await readJson("design/patterns/page-layout.json");
    const layout = await readFile(resolve(rootDir, "design/layout.css"), "utf8");

    for (const variantId of ["collection-table", "collection-list", "single-one-column"]) {
      const variant = pattern.variants.find((item: { id: string }) => item.id === variantId);
      expect(variant.layout, `${variantId} layout`).toBeDefined();
      expect(variant.layout.breakpoint).toBe("breakpoint.narrow");
      for (const className of variant.layout.classes) {
        expect(layout, `${variantId} ${className}`).toContain(className);
      }
    }

    const collectionTable = pattern.variants.find((item: { id: string }) => item.id === "collection-table");
    expect(collectionTable.layout.classes).toContain(".collection-region");
    expect(collectionTable.layout.values.maxWidth).toBe("content.maxWidth");

    const detail = pattern.variants.find((item: { id: string }) => item.id === "single-one-column");
    expect(detail.layout.values).toMatchObject({
      backNavigationGap: "space.4",
      headingToContentGap: "space.8",
      sectionGap: "space.6",
    });
  });

  it("quantifies the spacing pattern variants and wires layout components", async () => {
    const pattern = await readJson("design/patterns/spacing-layout.json");

    const dialogContent = pattern.variants.find((variant: { id: string }) => variant.id === "dialog-content");
    expect(dialogContent.layout.classes).toContain(".drawer-form");
    expect(dialogContent.layout.values).toMatchObject({ padding: "space.6", formGap: "space.6", labelGap: "space.2" });

    const pageContent = pattern.variants.find((variant: { id: string }) => variant.id === "page-content");
    expect(pageContent.layout.values).toMatchObject({ sectionGap: "space.8", groupGap: "space.6", headingGap: "space.4" });

    for (const componentId of [
      "component.drawer",
      "component.table",
      "component.toolbar",
      "component.search-field",
      "component.text-field",
      "component.select",
      "component.link",
    ]) {
      expect(pattern.components).toContain(componentId);
    }
  });

  it("locks HeroUI overlay dimensions into the component contracts", async () => {
    const drawer = await readJson("design/components/drawer.json");
    const alertDialog = await readJson("design/components/alert-dialog.json");

    expect(drawer.layout).toMatchObject({
      placement: "right",
      width: "20rem",
      widthFromSm: "24rem",
      maxWidth: "85vw",
      dialogPadding: "space.6",
    });
    expect(alertDialog.layout).toMatchObject({
      maxWidth: "28rem",
      dialogPadding: "space.6",
    });
  });
});
