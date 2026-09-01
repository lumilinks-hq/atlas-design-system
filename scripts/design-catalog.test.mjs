// @vitest-environment node
import { describe, expect, it } from "vitest";
import { atlasResources, readAtlasResource, resolveDesignContract, resolveManifest } from "./design-catalog.mjs";

describe("Atlas design catalog", () => {
  it("lists only fixed read-only design resources", () => {
    expect(atlasResources.map((resource) => resource.uri)).toContain("atlas://design/quick-reference");
    expect(atlasResources.map((resource) => resource.uri)).toContain("atlas://design/component-theme");
    expect(atlasResources.map((resource) => resource.uri)).toContain("atlas://design/theme");
    expect(atlasResources.map((resource) => resource.uri)).toContain("atlas://design/layout");
    expect(atlasResources.map((resource) => resource.uri)).toContain("atlas://design/components/button");
    expect(atlasResources.every((resource) => resource.path === "DESIGN.md" || resource.path.startsWith("design/"))).toBe(true);
  });

  it("reads a known resource and rejects an unknown URI", () => {
    expect(readAtlasResource("atlas://design/tokens").text).toContain('"accent": "#0d0bb6"');
    expect(() => readAtlasResource("atlas://design/../../package.json")).toThrow("Unknown Atlas resource");
  });

  it("resolves the account management manifest and its component contracts", () => {
    const result = resolveManifest("experiments/account-management/manifest.json");
    expect(result.requested.patterns).toEqual([
      "pattern.page-layout#collection-table",
      "pattern.page-layout#single-one-column",
      "pattern.spacing-layout#page-content",
      "pattern.spacing-layout#dialog-content",
    ]);
    expect(result.resources.map((resource) => resource.id)).toContain("example.account-management");
    expect(result.resources.map((resource) => resource.id)).toContain("component.drawer");
    expect(result.resources.map((resource) => resource.id)).toContain("component.link");
    expect(result.resources.map((resource) => resource.id)).toContain("component.text-field");
    expect(result.resources.map((resource) => resource.id)).toContain("component.search-field");
    expect(result.resources.map((resource) => resource.id)).toContain("component.toolbar");
    expect(result.resources.map((resource) => resource.id)).toContain("design.component-theme");
    expect(result.resources.map((resource) => resource.id)).toContain("design.theme");
    expect(result.resources.map((resource) => resource.id)).toContain("design.layout");
    expect(result.agentSkills).toEqual([
      { name: "atlas-design-system", path: "skills/atlas-design-system" },
      { name: "heroui-react", path: "skills/heroui-react" },
      { name: "ui-writing", path: "skills/ui-writing" },
    ]);
  });

  it("exposes the collection toolbar composition", () => {
    const example = JSON.parse(readAtlasResource("atlas://design/examples/account-management").text);
    const usage = example.componentUsage["component.toolbar"];

    expect(usage).toEqual({
      placement: "before-table",
      gapBeforeTable: "space.3",
      search: {
        component: "component.search-field",
        ariaLabel: "企業名で検索",
        placeholder: "企業名で検索",
        desktopWidth: "16rem",
        narrowWidth: "100%",
        align: "end",
      },
    });
  });

  it("exposes the detail back-navigation composition", () => {
    const example = JSON.parse(readAtlasResource("atlas://design/examples/account-management").text);

    expect(example.componentUsage["component.link"]).toEqual({
      purpose: "back-navigation",
      placement: "before-page-heading",
      target: "/customers",
      gapToPageHeading: "space.4",
      gapAfterPageHeading: "space.8",
    });
  });

  it("exposes an executable Table contract for docs and generated screens", () => {
    const table = JSON.parse(readAtlasResource("atlas://design/components/table").text);
    const example = JSON.parse(readAtlasResource("atlas://design/examples/account-management").text);
    const usage = example.componentUsage["component.table"];

    expect(table.variants).toEqual(["primary"]);
    expect(table.defaults).toEqual({ variant: "primary", size: "md" });
    expect(table.visual).toEqual({
      surfaceOwner: "component",
      outerShadow: "forbidden",
      radiusToken: "radius.base",
    });
    expect(usage.variant).toBe("primary");
    expect(usage.columns.map((column) => column.id)).toEqual([
      "companyName",
      "contactName",
      "lastContactedAt",
      "status",
    ]);
    expect(usage.columns[0].isRowHeader).toBe(true);
    expect(usage.columns[2]).toMatchObject({ align: "end", tabular: true });
  });

  it("rejects missing design references", () => {
    expect(() => resolveDesignContract({ patterns: ["pattern.unknown"], examples: [] })).toThrow("Unknown pattern reference");
  });

  it("annotates pattern resources with the requested variants", () => {
    const result = resolveManifest("experiments/account-management/manifest.json");
    const pageLayout = result.resources.find((resource) => resource.id === "pattern.page-layout");
    const spacingLayout = result.resources.find((resource) => resource.id === "pattern.spacing-layout");

    expect(pageLayout.variants).toEqual(["collection-table", "single-one-column"]);
    expect(spacingLayout.variants).toEqual(["page-content", "dialog-content"]);
  });

  it("resolves the pattern referenced by an example transitively", () => {
    const result = resolveDesignContract({ examples: ["example.account-management"] });
    const pageLayout = result.resources.find((resource) => resource.id === "pattern.page-layout");

    expect(pageLayout).toBeDefined();
    expect(pageLayout.variants).toContain("collection-table");
  });

  it("passes validated screens through to the resolved contract", () => {
    const result = resolveManifest("experiments/account-management/manifest.json");

    expect(result.screens.map((screen) => screen.id)).toEqual(["collection", "detail"]);
    const detail = result.screens.find((screen) => screen.id === "detail");
    expect(detail.pattern).toBe("pattern.page-layout#single-one-column");
    expect(detail.overlays.map((overlay) => overlay.component)).toEqual(["component.drawer", "component.alert-dialog"]);
    expect(detail.overlays.every((overlay) => overlay.pattern === "pattern.spacing-layout#dialog-content")).toBe(true);
  });

  it("rejects screens that reference unknown patterns, variants, or components", () => {
    const base = { patterns: ["pattern.page-layout#collection-table"], examples: [] };

    expect(() =>
      resolveDesignContract({ ...base, screens: [{ id: "s", route: "/", pattern: "pattern.page-layout#missing" }] }),
    ).toThrow("Unknown pattern variant");
    expect(() =>
      resolveDesignContract({
        ...base,
        screens: [
          {
            id: "s",
            route: "/",
            pattern: "pattern.page-layout#collection-table",
            overlays: [{ id: "o", component: "component.nope", pattern: "pattern.spacing-layout#dialog-content" }],
          },
        ],
      }),
    ).toThrow("Unknown component reference");
  });
});
