import { existsSync } from "node:fs";
import { mkdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium } from "@playwright/test";
import { createServer } from "vite";
import { buildCaptureTargets } from "./capture-targets.mjs";
import { resolveManifest } from "./design-catalog.mjs";
import { parseArgs, rootDir } from "./lib.mjs";
import { experimentPaths, resolveExperimentName, workspaceDir as resolveWorkspaceDir } from "./workspace-paths.mjs";

const args = parseArgs(process.argv.slice(2));
if (typeof args.pair !== "string") throw new Error("--pairを指定してください");

const experiment = resolveExperimentName(args);
const experimentDirs = experimentPaths(experiment);
const modes = ["baseline", "harness", "harness-corrected"];
const outputDir = resolve(experimentDirs.publicRunsDir, args.pair);
await mkdir(outputDir, { recursive: true });

// 撮る画面と状態はmanifestが決める。routeもファイル名もここでは組み立てない
const contract = resolveManifest(experimentDirs.manifestPath);
const manifest = JSON.parse(await readFile(resolve(rootDir, experimentDirs.manifestPath), "utf8"));
const targets = buildCaptureTargets(contract, { requiredStates: manifest.requiredStates ?? [] });

const browser = await chromium.launch({ headless: true });
try {
  for (const mode of modes) {
    const workspaceDir = resolveWorkspaceDir(args.pair, mode, process.env, experiment);
    // measure と同じく、修正 Run が無い pair（初回で全件 passed）ではそのモードを飛ばす
    if (!existsSync(workspaceDir)) {
      console.log(`${mode}: workspaceなし、スキップ`);
      continue;
    }
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
      const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
      const runtimeErrors = [];
      page.on("console", (message) => {
        if (message.type() === "error") runtimeErrors.push(`console: ${message.text()}`);
      });
      page.on("pageerror", (error) => runtimeErrors.push(`pageerror: ${error.message}`));
      let currentViewport = "desktop";
      for (const target of targets) {
        if (!target.modes.includes(mode)) continue;
        if (target.viewport.name !== currentViewport) {
          await page.setViewportSize({ width: target.viewport.width, height: target.viewport.height });
          currentViewport = target.viewport.name;
        }
        const url = `http://127.0.0.1:${address.port}/#${target.path}?state=${target.state}`;
        await page.goto(url, { waitUntil: "networkidle" });
        if (target.overlay === "component.drawer") {
          const closeTrigger = page.getByRole("button", { name: /閉じる/ }).first();
          const closeBox = await closeTrigger.boundingBox();
          const closeText = (await closeTrigger.textContent())?.trim() ?? "";
          if (!closeBox || closeText || closeBox.width < 24 || closeBox.height < 24 || closeBox.width > 48 || closeBox.height > 48) {
            throw new Error(`${mode}: Drawer.CloseTriggerの表示が不正です`);
          }
        }
        await page.screenshot({ path: resolve(outputDir, `${mode}${target.suffix}.png`), fullPage: true });
      }
      await page.close();
      if (mode === "harness-corrected" && runtimeErrors.length > 0) {
        throw new Error(`${mode}: 実ブラウザエラー\n${runtimeErrors.join("\n")}`);
      }
      console.log(`Captured ${mode}`);
    } finally {
      await server.close();
    }
  }
} finally {
  await browser.close();
}
