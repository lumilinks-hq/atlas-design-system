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
      await page.goto(`http://127.0.0.1:${address.port}/?state=default`, { waitUntil: "networkidle" });
      await page.screenshot({ path: resolve(outputDir, `${mode}.png`), fullPage: true });
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(`http://127.0.0.1:${address.port}/?state=default`, { waitUntil: "networkidle" });
      await page.screenshot({ path: resolve(outputDir, `${mode}-mobile.png`), fullPage: true });
      await page.close();
      console.log(`Captured ${mode}`);
    } finally {
      await server.close();
    }
  }
} finally {
  await browser.close();
}
