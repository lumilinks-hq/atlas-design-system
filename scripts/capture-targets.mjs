/**
 * スクリーンショットの撮影対象を manifest の screens から組み立てる。
 * capture（撮る側）と review（読む側）が同じ一覧を使うことで、ファイル名がずれない。
 */

/** 撮影に使うviewport。suffixがそのままファイル名の一部になる。 */
export const captureViewports = [
  { name: "desktop", suffix: "", width: 1440, height: 900 },
  { name: "mobile", suffix: "-mobile", width: 390, height: 844 },
];

const allModes = ["baseline", "harness", "harness-corrected"];

/**
 * ルート内の :param を screens.sampleParams の値へ置換する。
 * @param {string} route
 * @param {Record<string, string>} [sampleParams]
 * @returns {string}
 */
export function substituteRouteParams(route, sampleParams = {}) {
  return route.replace(/:([A-Za-z0-9_]+)/g, (_, name) => {
    const value = sampleParams[name];
    if (typeof value !== "string" || value.length === 0) {
      throw new Error(`route ${route} のパラメータ :${name} に対応するscreens.sampleParamsがありません`);
    }
    return value;
  });
}

/**
 * 撮影対象を並べる。ファイル名は `${mode}${suffix}.png`。
 * 先頭の画面はsuffixなし、以降は `-${screen.id}` を付ける。
 * requiredStates の `invalid-` で始まる状態は、Drawerを重ねる画面の入力検証として修正Runだけ撮る。
 * @param {{ screens?: { id: string, route: string, sampleParams?: Record<string, string>, overlays?: { component: string }[] }[] }} contract
 * @param {{ requiredStates?: string[] }} [options]
 */
export function buildCaptureTargets(contract, { requiredStates = [] } = {}) {
  const screens = contract.screens ?? [];
  const paths = screens.map((screen) => substituteRouteParams(screen.route, screen.sampleParams ?? {}));
  const screenSuffixes = screens.map((screen, index) => (index === 0 ? "" : `-${screen.id}`));
  const targets = [];

  for (const viewport of captureViewports) {
    for (const [index, screen] of screens.entries()) {
      targets.push({
        screenId: screen.id,
        state: "default",
        path: paths[index],
        suffix: `${screenSuffixes[index]}${viewport.suffix}`,
        viewport,
        modes: allModes,
      });
    }
  }

  const validationStates = requiredStates.filter((state) => state.startsWith("invalid-"));
  for (const [index, screen] of screens.entries()) {
    const overlay = (screen.overlays ?? []).find((item) => item.component === "component.drawer");
    if (!overlay) continue;
    for (const state of validationStates) {
      targets.push({
        screenId: screen.id,
        state,
        path: paths[index],
        suffix: `-${state}`,
        viewport: captureViewports[0],
        modes: ["harness-corrected"],
        overlay: overlay.component,
      });
    }
  }

  return targets;
}
