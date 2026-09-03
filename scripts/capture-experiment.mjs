import { existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium } from "@playwright/test";
import { createServer } from "vite";
import { parseArgs, rootDir } from "./lib.mjs";

const args = parseArgs(process.argv.slice(2));
if (typeof args.pair !== "string") throw new Error("--pairを指定してください");

const modes = ["baseline", "harness", "harness-corrected"];
const outputDir = resolve(rootDir, "public", "experiments", "account-management", "runs", args.pair);
await mkdir(outputDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
try {
  for (const mode of modes) {
    const workspaceDir = resolve(rootDir, ".runs", "account-management", args.pair, mode);
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
      await page.goto(`http://127.0.0.1:${address.port}/#/customers?state=default`, { waitUntil: "networkidle" });
      await page.screenshot({ path: resolve(outputDir, `${mode}.png`), fullPage: true });
      await page.goto(`http://127.0.0.1:${address.port}/#/customers/customer_northstar?state=default`, { waitUntil: "networkidle" });
      await page.screenshot({ path: resolve(outputDir, `${mode}-detail.png`), fullPage: true });
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(`http://127.0.0.1:${address.port}/#/customers?state=default`, { waitUntil: "networkidle" });
      await page.screenshot({ path: resolve(outputDir, `${mode}-mobile.png`), fullPage: true });
      await page.goto(`http://127.0.0.1:${address.port}/#/customers/customer_northstar?state=default`, { waitUntil: "networkidle" });
      await page.screenshot({ path: resolve(outputDir, `${mode}-detail-mobile.png`), fullPage: true });
      if (mode === "harness-corrected") {
        await page.setViewportSize({ width: 1440, height: 900 });
        await page.goto(`http://127.0.0.1:${address.port}/#/customers/customer_northstar?state=invalid-email`, { waitUntil: "networkidle" });
        const closeTrigger = page.getByRole("button", { name: /閉じる/ }).first();
        const closeBox = await closeTrigger.boundingBox();
        const closeText = (await closeTrigger.textContent())?.trim() ?? "";
        if (!closeBox || closeText || closeBox.width < 24 || closeBox.height < 24 || closeBox.width > 48 || closeBox.height > 48) {
          throw new Error(`${mode}: Drawer.CloseTriggerの表示が不正です`);
        }
        await page.screenshot({ path: resolve(outputDir, `${mode}-invalid-email.png`), fullPage: true });
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
