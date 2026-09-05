import { chromium } from "@playwright/test";
import { createServer } from "vite";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const server = await createServer({
  configLoader: "runner",
  logLevel: "error",
  server: { host: "127.0.0.1", port: 0 },
});

await server.listen();
const address = server.httpServer?.address();
if (!address || typeof address === "string") throw new Error("Viteのportを取得できません");
const origin = `http://127.0.0.1:${address.port}`;
const browser = await chromium.launch({ headless: true });

async function openCheckedPage(path, viewport) {
  const page = await browser.newPage({ viewport });
  const errors = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(`console: ${message.text()}`);
  });
  page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
  await page.goto(`${origin}${path}`, { waitUntil: "networkidle" });
  return { page, errors };
}

try {
  for (const viewport of [{ width: 1440, height: 900 }, { width: 768, height: 1024 }, { width: 390, height: 844 }]) {
    const { page, errors } = await openCheckedPage("/", viewport);
    await page.getByRole("heading", { name: "Atlas Design System", level: 1 }).waitFor();
    const hasHorizontalOverflow = await page.evaluate(() => globalThis.document.documentElement.scrollWidth > globalThis.innerWidth);
    assert(!hasHorizontalOverflow, `Overviewに横スクロールがあります: ${viewport.width}px`);
    assert(errors.length === 0, `Overviewのブラウザエラー:\n${errors.join("\n")}`);
    await page.close();
  }

  {
    const { page, errors } = await openCheckedPage("/getting-started", { width: 1440, height: 900 });
    await page.getByRole("heading", { name: "導入方法", level: 1 }).waitFor();
    assert(await page.getByRole("button", { name: /導入コマンドをコピー/ }).count() === 5, "導入コマンドのコピー操作が5件揃っていません");
    assert(await page.locator(".setup-card").count() === 3, "導入方法が縦3件で表示されていません");
    assert(errors.length === 0, `導入方法のブラウザエラー:\n${errors.join("\n")}`);
    await page.close();
  }

  for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
    const { page, errors } = await openCheckedPage("/harness", viewport);
    await page.getByRole("heading", { name: "デザインハーネス", level: 1 }).waitFor();
    const cycleFigure = page.locator(".harness-flow");
    assert(await cycleFigure.locator(".react-flow__node-layer").count() === 4, "デザインハーネスの4層ノードが表示されていません");
    await cycleFigure.locator(".react-flow__edge").nth(3).waitFor({ state: "attached" });
    assert(await cycleFigure.locator(".react-flow__edge").count() === 4, "デザインハーネスのループの矢印が4本表示されていません");
    const loopFigure = page.locator(".harness-loop");
    assert(await loopFigure.locator(".react-flow__node-step").count() === 6, "デモ画面の生成サイクルの6ノードが表示されていません");
    await loopFigure.locator(".react-flow__edge").nth(4).waitFor({ state: "attached" });
    assert(await loopFigure.locator(".react-flow__edge").count() === 5, "デモ画面の生成サイクルの矢印が5本表示されていません");
    await page.getByRole("button", { name: "02 コンテキストを渡す層" }).click();
    await page.getByRole("region", { name: "コンテキストを渡す層" }).getByText("DESIGN.md", { exact: true }).waitFor();
    const hasHorizontalOverflow = await page.evaluate(() => globalThis.document.documentElement.scrollWidth > globalThis.innerWidth);
    assert(!hasHorizontalOverflow, `デザインハーネスの説明に横スクロールがあります: ${viewport.width}px`);
    assert(errors.length === 0, `デザインハーネスの説明のブラウザエラー:\n${errors.join("\n")}`);
    await page.close();
  }

  for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
    const { page, errors } = await openCheckedPage("/examples/account-management/results", viewport);
    await page.getByRole("heading", { name: "生成結果の比較", level: 1 }).waitFor();
    await page.getByRole("button", { name: "詳細（モバイル）" }).click();
    await page.waitForFunction(() => {
      const images = Array.from(globalThis.document.querySelectorAll(".compare-figure img"));
      return (
        images.length === 2 &&
        images.every((image) => image.complete && image.naturalWidth > 0 && (image.getAttribute("src") ?? "").endsWith("-detail-mobile.png"))
      );
    });
    const hasHorizontalOverflow = await page.evaluate(() => globalThis.document.documentElement.scrollWidth > globalThis.innerWidth);
    assert(!hasHorizontalOverflow, `生成結果の比較に横スクロールがあります: ${viewport.width}px`);
    assert(errors.length === 0, `生成結果の比較のブラウザエラー:\n${errors.join("\n")}`);
    await page.close();
  }

  {
    const { page } = await openCheckedPage("/demo/runs/account-management?scene=issue", { width: 1440, height: 900 });
    await page.waitForURL(/\/examples\/account-management\/results$/);
    await page.getByRole("heading", { name: "生成結果の比較", level: 1 }).waitFor();
    await page.close();
  }

  {
    const { page, errors } = await openCheckedPage("/play/account-management?mode=atlas&state=invalid-email", { width: 1440, height: 900 });
    const frame = page.frameLocator("iframe[title='Atlas適用後の顧客管理画面']");
    const closeTrigger = frame.getByRole("button", { name: "編集を閉じる" });
    await closeTrigger.waitFor();
    const closeBox = await closeTrigger.boundingBox();
    const closeText = (await closeTrigger.textContent())?.trim() ?? "";
    assert(Boolean(closeBox) && closeText === "" && closeBox.width >= 24 && closeBox.width <= 48, "Drawerの閉じる操作が崩れています");
    await frame.getByText("メールアドレスの形式を確認してください。").waitFor();
    assert(errors.length === 0, `Atlas操作画面のブラウザエラー:\n${errors.join("\n")}`);
    await page.getByRole("button", { name: "設計指示なし" }).click();
    await page.waitForURL(/mode=baseline&state=invalid-email/);
    await page.locator("iframe[title='設計指示なしの顧客管理画面']").waitFor();
    const baselineFrameSrc = await page.locator("iframe").getAttribute("src");
    assert(
      baselineFrameSrc === "/play-baseline.html#/customers/customer_northstar?state=invalid-email",
      `比較条件の切替で状態が維持されていません: ${baselineFrameSrc}`,
    );
    await page.close();
  }

  console.log("Site browser check OK: Overview, Getting started, デザインハーネス, Results, Play");
} finally {
  await browser.close();
  await server.close();
}
