import { describe, expect, it } from "vitest";
import { resolveManifest } from "./design-catalog.mjs";
import { buildMeasurementPlan, substituteRouteParams, viewports } from "./measure-experiment.mjs";

describe("substituteRouteParams", () => {
  it("ルートパラメータをsampleParamsの値へ置換する", () => {
    expect(substituteRouteParams("/customers/:customerId", { customerId: "customer_northstar" })).toBe(
      "/customers/customer_northstar",
    );
  });

  it("パラメータのないルートはそのまま返す", () => {
    expect(substituteRouteParams("/customers")).toBe("/customers");
  });

  it("sampleParamsに値がないパラメータはエラーにする", () => {
    expect(() => substituteRouteParams("/customers/:customerId", {})).toThrow("customerId");
  });
});

describe("buildMeasurementPlan", () => {
  const contract = resolveManifest("experiments/account-management/manifest.json");
  const plan = buildMeasurementPlan(contract, { requiredStates: ["default", "drawer-open"] });

  it("全screenをdesktop / mobile / tinyの3viewportでdefault計測する", () => {
    expect(viewports.map((viewport) => viewport.name)).toEqual(["desktop", "mobile", "tiny"]);
    const defaults = plan.filter((entry) => entry.state === "default");
    expect(defaults).toHaveLength(contract.screens.length * viewports.length);
    const collectionDesktop = defaults.find(
      (entry) => entry.screenId === "collection" && entry.viewport.name === "desktop",
    );
    expect(collectionDesktop?.path).toBe("/customers");
    expect(collectionDesktop?.anchorClasses).toContain(".page-shell");
    expect(collectionDesktop?.anchorClasses).toContain(".collection-toolbar");
  });

  it("detailのルートをsampleParamsで解決する", () => {
    const detail = plan.find((entry) => entry.screenId === "detail" && entry.state === "default");
    expect(detail?.path).toBe("/customers/customer_northstar");
  });

  it("Drawer overlayを持つscreenへdrawer-openのdesktop計測を追加し、overlayのlayout classesをアンカーへ含める", () => {
    const drawerEntries = plan.filter((entry) => entry.state === "drawer-open");
    expect(drawerEntries).toHaveLength(1);
    expect(drawerEntries[0]?.screenId).toBe("detail");
    expect(drawerEntries[0]?.viewport.name).toBe("desktop");
    expect(drawerEntries[0]?.anchorClasses).toContain(".drawer-form");
    expect(drawerEntries[0]?.anchorClasses).toContain(".detail-page__heading");
  });

  it("requiredStatesにdrawer-openがなければDrawer計測を計画しない", () => {
    const withoutDrawer = buildMeasurementPlan(contract, { requiredStates: ["default"] });
    expect(withoutDrawer.every((entry) => entry.state === "default")).toBe(true);
  });
});
