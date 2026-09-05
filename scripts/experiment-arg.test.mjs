// @vitest-environment node
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { buildCaptureTargets, captureViewports } from "./capture-targets.mjs";
import { resolveManifest } from "./design-catalog.mjs";
import { rootDir } from "./lib.mjs";
import { defaultExperimentName } from "./workspace-paths.mjs";

/** --experiment を受け取るべきCLIスクリプト。capture-targets.mjs はCLIを持たないので含めない。 */
const cliScripts = [
  "audit-public-data.mjs",
  "capture-experiment.mjs",
  "check-design-conformance.mjs",
  "compare-experiment.mjs",
  "evaluate-experiment.mjs",
  "finalize-experiment.mjs",
  "measure-experiment.mjs",
  "preview-experiment.mjs",
  "refine-experiment.mjs",
  "review-experiment.mjs",
  "run-experiment.mjs",
  "sanitize-run-artifacts.mjs",
];

describe("--experiment の受け口", () => {
  it.each(cliScripts)("%s は resolveExperimentName で実験名を決める", (name) => {
    const source = readFileSync(resolve(rootDir, "scripts", name), "utf8");
    expect(source).toContain("resolveExperimentName");
  });

  it.each(cliScripts)("%s は実験名を直書きしない", (name) => {
    const source = readFileSync(resolve(rootDir, "scripts", name), "utf8");
    expect(source).not.toContain(defaultExperimentName);
  });

  it("存在しない実験を指定すると起動時に落ちる", () => {
    expect(() =>
      execFileSync("node", ["scripts/compare-experiment.mjs", "--experiment", "no-such", "--pair", "mvp-11"], {
        cwd: rootDir,
        encoding: "utf8",
        stdio: "pipe",
      }),
    ).toThrow(/実験が見つかりません/);
  });

  it("実験名にパス区切りを混ぜると落ちる", () => {
    expect(() =>
      execFileSync("node", ["scripts/compare-experiment.mjs", "--experiment", "../etc", "--pair", "mvp-11"], {
        cwd: rootDir,
        encoding: "utf8",
        stdio: "pipe",
      }),
    ).toThrow(/英小文字、数字/);
  });
});

describe("buildCaptureTargets", () => {
  const contract = resolveManifest(`experiments/${defaultExperimentName}/manifest.json`);
  const manifest = JSON.parse(readFileSync(resolve(rootDir, `experiments/${defaultExperimentName}/manifest.json`), "utf8"));
  const targets = buildCaptureTargets(contract, { requiredStates: manifest.requiredStates });

  it("既存のスクリーンショット名と順序をそのまま再現する", () => {
    expect(targets.map((target) => target.suffix)).toEqual([
      "",
      "-detail",
      "-mobile",
      "-detail-mobile",
      "-invalid-email",
    ]);
  });

  it("画面のrouteとsampleParamsからパスを組み立てる", () => {
    expect(targets.map((target) => target.path)).toEqual([
      "/customers",
      "/customers/customer_northstar",
      "/customers",
      "/customers/customer_northstar",
      "/customers/customer_northstar",
    ]);
  });

  it("既定状態は全モード、入力検証の状態は修正Runだけを撮る", () => {
    const byState = Object.fromEntries(targets.map((target) => [target.suffix, target]));
    expect(byState[""].state).toBe("default");
    expect(byState[""].modes).toEqual(["baseline", "harness", "harness-corrected"]);
    expect(byState["-invalid-email"].state).toBe("invalid-email");
    expect(byState["-invalid-email"].modes).toEqual(["harness-corrected"]);
    expect(byState["-invalid-email"].overlay).toBe("component.drawer");
  });

  it("デスクトップとモバイルの2つのviewportで撮る", () => {
    expect(captureViewports.map((viewport) => [viewport.width, viewport.height])).toEqual([
      [1440, 900],
      [390, 844],
    ]);
    expect(targets.map((target) => target.viewport.name)).toEqual([
      "desktop",
      "desktop",
      "mobile",
      "mobile",
      "desktop",
    ]);
  });

  it("Drawerを持たない画面には入力検証の撮影を割り当てない", () => {
    const plain = buildCaptureTargets(
      { screens: [{ id: "collection", route: "/things" }] },
      { requiredStates: ["default", "invalid-email"] },
    );

    expect(plain.map((target) => target.suffix)).toEqual(["", "-mobile"]);
  });
});
