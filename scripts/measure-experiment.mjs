import { existsSync, readFileSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { substituteRouteParams } from "./capture-targets.mjs";
import { primaryExampleResource, resolveManifest } from "./design-catalog.mjs";
import { parseArgs, rootDir } from "./lib.mjs";
import {
  defaultExperimentName,
  experimentPaths,
  resolveExperimentName,
  workspaceDir as resolveWorkspaceDir,
} from "./workspace-paths.mjs";

export { substituteRouteParams };

export const viewports = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "mobile", width: 390, height: 844 },
  { name: "tiny", width: 320, height: 568 },
];

function readVariantLayout(contract, ref) {
  const [patternId, variantId] = ref.split("#");
  const resource = contract.resources.find((item) => item.id === patternId);
  if (!resource) throw new Error(`契約のresourcesにpattern ${patternId} がありません`);
  const pattern = JSON.parse(readFileSync(resolve(rootDir, resource.path), "utf8"));
  return pattern.variants.find((item) => item.id === variantId)?.layout;
}

export function buildMeasurementPlan(contract, { requiredStates = [] } = {}) {
  const plan = [];
  for (const screen of contract.screens ?? []) {
    const layout = readVariantLayout(contract, screen.pattern);
    const anchorClasses = [...(layout?.classes ?? [])];
    const path = substituteRouteParams(screen.route, screen.sampleParams ?? {});
    for (const viewport of viewports) {
      plan.push({ screenId: screen.id, route: screen.route, path, state: "default", viewport, anchorClasses });
    }
    const drawerOverlay = (screen.overlays ?? []).find((overlay) => overlay.component === "component.drawer");
    if (drawerOverlay && requiredStates.includes("drawer-open")) {
      const overlayLayout = readVariantLayout(contract, drawerOverlay.pattern);
      plan.push({
        screenId: screen.id,
        route: screen.route,
        path,
        state: "drawer-open",
        viewport: viewports[0],
        anchorClasses: [...new Set([...anchorClasses, ...(overlayLayout?.classes ?? [])])],
      });
    }
  }
  return plan;
}

// ブラウザ内で実行される（シリアライズされるため自己完結にする）
/* global document, getComputedStyle */
function collectScreenMeasurements({ anchorClasses, searchLabel, backLinkText }) {
  const styleKeys = [
    "display",
    "rowGap",
    "columnGap",
    "justifyContent",
    "alignItems",
    "marginTop",
    "marginBottom",
    "paddingTop",
    "paddingRight",
    "paddingBottom",
    "paddingLeft",
    "width",
  ];
  const probe = (element) => {
    if (!element) return { found: false };
    const boundingRect = element.getBoundingClientRect();
    const computed = getComputedStyle(element);
    const styles = {};
    for (const key of styleKeys) styles[key] = computed[key];
    return {
      found: true,
      visible: element.getClientRects().length > 0 && computed.visibility !== "hidden",
      rect: { x: boundingRect.x, y: boundingRect.y, width: boundingRect.width, height: boundingRect.height },
      styles,
    };
  };
  const anchors = {};
  for (const className of anchorClasses) {
    anchors[className] = probe(document.querySelector(className));
  }
  const labelled = searchLabel
    ? document.querySelector(`[aria-label="${searchLabel.replace(/"/g, '\\"')}"]`)
    : null;
  const searchInput = labelled
    ? labelled.matches("input")
      ? labelled
      : (labelled.querySelector("input") ?? labelled)
    : document.querySelector('input[type="search"]');
  const backLink = backLinkText
    ? [...document.querySelectorAll('a, [role="link"]')].find((element) =>
        (element.textContent ?? "").includes(backLinkText),
      )
    : null;
  return {
    scrollWidth: document.documentElement.scrollWidth,
    anchors,
    elements: {
      table: probe(document.querySelector('table, [role="grid"], [role="table"]')),
      toolbar: probe(document.querySelector('[role="toolbar"]')),
      searchInput: probe(searchInput),
      heading: probe(document.querySelector("h1")),
      backLink: probe(backLink ?? null),
      dialog: probe(document.querySelector('[role="dialog"]')),
    },
  };
}

export async function measureRun({ pairId, mode, outDir, experiment = defaultExperimentName }) {
  const experimentDirs = experimentPaths(experiment);
  const manifestPath = experimentDirs.manifestPath;
  const workspaceDir = resolveWorkspaceDir(pairId, mode, process.env, experiment);
  const outputDir = outDir ? resolve(outDir) : resolve(experimentDirs.runsDir, pairId, mode);
  const contract = resolveManifest(manifestPath);
  const manifest = JSON.parse(await readFile(resolve(rootDir, manifestPath), "utf8"));
  const exampleResource = primaryExampleResource(contract);
  const example = JSON.parse(await readFile(resolve(rootDir, exampleResource.path), "utf8"));
  const searchLabel = example?.componentUsage?.["component.toolbar"]?.search?.ariaLabel;
  const plan = buildMeasurementPlan(contract, { requiredStates: manifest.requiredStates ?? [] });
  const measurements = { pairId, mode, screens: [] };

  try {
    const [{ chromium }, { createServer }] = await Promise.all([import("@playwright/test"), import("vite")]);
    const browser = await chromium.launch({ headless: true });
    try {
      const server = await createServer({
        root: workspaceDir,
        configLoader: "runner",
        logLevel: "error",
        server: { host: "127.0.0.1", port: 0 },
      });
      await server.listen();
      try {
        const address = server.httpServer?.address();
        if (!address || typeof address === "string") throw new Error(`${mode}: Viteのportを取得できません`);
        const page = await browser.newPage({
          viewport: { width: viewports[0].width, height: viewports[0].height },
          deviceScaleFactor: 1,
          reducedMotion: "reduce",
        });
        const runtimeErrors = [];
        page.on("pageerror", (error) => runtimeErrors.push(error.message));
        for (const entry of plan) {
          const record = {
            screenId: entry.screenId,
            viewport: entry.viewport.name,
            width: entry.viewport.width,
            height: entry.viewport.height,
            state: entry.state,
            route: entry.route,
          };
          try {
            runtimeErrors.length = 0;
            // hashのみの遷移は再マウントされず、viewport変更がJS側の分岐に反映される前にprobeが走りうる
            await page.goto("about:blank");
            await page.setViewportSize({ width: entry.viewport.width, height: entry.viewport.height });
            await page.goto(`http://127.0.0.1:${address.port}/#${entry.path}?state=${entry.state}`, {
              waitUntil: "networkidle",
            });
            await page.evaluate(() => document.fonts.ready);
            const collected = await page.evaluate(collectScreenMeasurements, {
              anchorClasses: entry.anchorClasses,
              searchLabel,
              backLinkText: "戻る",
            });
            Object.assign(record, collected);
            if (runtimeErrors.length > 0) record.runtimeErrors = [...runtimeErrors];
          } catch (error) {
            record.error = error instanceof Error ? error.message : String(error);
          }
          measurements.screens.push(record);
        }
        await page.close();
      } finally {
        await server.close();
      }
    } finally {
      await browser.close();
    }
  } catch (error) {
    measurements.error = error instanceof Error ? error.message : String(error);
  }

  await mkdir(outputDir, { recursive: true });
  await writeFile(resolve(outputDir, "measurements.json"), `${JSON.stringify(measurements, null, 2)}\n`);

  if (!outDir) {
    const runPath = resolve(outputDir, "run.json");
    if (existsSync(runPath)) {
      const run = JSON.parse(await readFile(runPath, "utf8"));
      if (!run.artifacts.includes("measurements.json")) run.artifacts.push("measurements.json");
      await writeFile(runPath, `${JSON.stringify(run, null, 2)}\n`);
    }
  }
  return measurements;
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const args = parseArgs(process.argv.slice(2));
  if (typeof args.pair !== "string") throw new Error("--pairを指定してください");
  const experiment = resolveExperimentName(args);
  const modes = typeof args.mode === "string" ? [args.mode] : ["baseline", "harness", "harness-corrected"];
  for (const mode of modes) {
    const workspaceDir = resolveWorkspaceDir(args.pair, mode, process.env, experiment);
    if (!existsSync(workspaceDir)) {
      if (typeof args.mode === "string") throw new Error(`workspaceがありません: ${workspaceDir}`);
      console.log(`${mode}: workspaceなし、スキップ`);
      continue;
    }
    const outDir = typeof args.out === "string" ? resolve(args.out, mode) : undefined;
    const measurements = await measureRun({ pairId: args.pair, mode, outDir, experiment });
    const errored = measurements.error ? " (error)" : "";
    console.log(`${mode}: ${measurements.screens.length} screens measured${errored}`);
  }
}
