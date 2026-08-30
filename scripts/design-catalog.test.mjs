// @vitest-environment node
import { describe, expect, it } from "vitest";
import { atlasResources, readAtlasResource, resolveDesignContract, resolveManifest } from "./design-catalog.mjs";

describe("Atlas design catalog", () => {
  it("lists only fixed read-only design resources", () => {
    expect(atlasResources.map((resource) => resource.uri)).toContain("atlas://design/quick-reference");
    expect(atlasResources.map((resource) => resource.uri)).toContain("atlas://design/components/button");
    expect(atlasResources.every((resource) => resource.path === "DESIGN.md" || resource.path.startsWith("design/"))).toBe(true);
  });

  it("reads a known resource and rejects an unknown URI", () => {
    expect(readAtlasResource("atlas://design/tokens").text).toContain('"accent": "#0d0bb6"');
    expect(() => readAtlasResource("atlas://design/../../package.json")).toThrow("Unknown Atlas resource");
  });

  it("resolves the account management manifest and its component contracts", () => {
    const result = resolveManifest("experiments/account-management/manifest.json");
    expect(result.requested.patterns).toEqual(["pattern.page-layout#single-one-column"]);
    expect(result.resources.map((resource) => resource.id)).toContain("example.account-management");
    expect(result.resources.map((resource) => resource.id)).toContain("component.drawer");
  });

  it("rejects missing design references", () => {
    expect(() => resolveDesignContract({ patterns: ["pattern.unknown"], examples: [] })).toThrow("Unknown pattern reference");
  });
});
