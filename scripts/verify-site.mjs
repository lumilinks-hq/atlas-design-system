import { fileURLToPath } from "node:url";
import AxeBuilder from "@axe-core/playwright";
import { chromium } from "@playwright/test";
import { createServer } from "vite";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

// WCAG 2.1 AA 相当。ここに無いタグ（best-practice など）は検査しません。
export const AXE_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

// 横スクロール検査の幅。720 は 1440 の 200% 拡大（WCAG 1.4.10 リフロー）の代替です。
export const OVERFLOW_VIEWPORTS = [
  { width: 1440, height: 900 },
  { width: 768, height: 1024 },
  { width: 720, height: 900 },
  { width: 390, height: 844 },
];

// axe をかけるページと、描画完了の目印にする h1（null なら最初の h1 を待つ）。
export const AXE_PAGES = [
  ["/", "Atlas Design System"],
  ["/harness", "デザインハーネス"],
  ["/getting-started", "導入方法"],
  ["/technical-specifications", null],
  ["/foundations", null],
  ["/components", null],
  ["/patterns/page-layout", null],
  ["/patterns/spacing-layout", null],
  ["/patterns/visual-grouping", "視覚的グルーピング"],
  ["/patterns/mobile-layout", "モバイルレイアウト"],
  ["/examples/account-management", null],
  ["/examples/account-management/results", "生成結果の比較"],
  ["/examples/invoice-management", null],
  ["/examples/invoice-management/results", "生成結果の比較"],
  ["/rules", null],
  ["/no-such-page", "ページが見つかりません"],
];

// axe の violation を「page rule target」の行に整形します。除外は行いません。
export function formatAxeViolations(path, violations) {
  return violations.flatMap((violation) =>
    violation.nodes.map((node) => `${path} ${violation.id} (${violation.impact ?? "unknown"}) ${node.target.join(" ")} - ${violation.help}`),
  );
}

async function main() {
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
    for (const viewport of OVERFLOW_VIEWPORTS) {
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
      assert(await page.locator(".setup-grid .setup-card").count() === 3, "導入方法が縦3件で表示されていません");
      assert(errors.length === 0, `導入方法のブラウザエラー:\n${errors.join("\n")}`);
      await page.close();
    }

    for (const viewport of [{ width: 1440, height: 900 }, { width: 720, height: 900 }, { width: 390, height: 844 }]) {
      const { page, errors } = await openCheckedPage("/harness", viewport);
      await page.getByRole("heading", { name: "デザインハーネス", level: 1 }).waitFor();
      const cycleFigure = page.locator(".harness-flow");
      assert(await cycleFigure.locator(".react-flow__node-layer").count() === 4, "デザインハーネスの4層ノードが表示されていません");
      await cycleFigure.locator(".react-flow__edge").nth(3).waitFor({ state: "attached" });
      assert(await cycleFigure.locator(".react-flow__edge").count() === 4, "デザインハーネスのループの矢印が4本表示されていません");
      const loopFigure = page.locator(".harness-next");
      assert(await loopFigure.locator(".react-flow__node-step").count() === 10, "次の工程を決める図の10ノードが表示されていません");
      await loopFigure.locator(".react-flow__edge").nth(11).waitFor({ state: "attached" });
      assert(await loopFigure.locator(".react-flow__edge").count() === 12, "次の工程を決める図の矢印が12本表示されていません");
      await loopFigure.getByText("判断・根拠不足", { exact: true }).waitFor();
      const judgeFigure = page.locator(".harness-judge");
      assert(await judgeFigure.locator(".react-flow__node-step").count() === 11, "Jevの図の11ノードが表示されていません");
      await judgeFigure.locator(".react-flow__edge").nth(12).waitFor({ state: "attached" });
      assert(await judgeFigure.locator(".react-flow__edge").count() === 13, "Jevの図の矢印が13本表示されていません");
      await judgeFigure.getByText("違反の確率", { exact: true }).waitFor();
      await page.getByRole("button", { name: "02 コンテキストを渡す層" }).click();
      await page.getByRole("region", { name: "コンテキストを渡す層" }).getByText("DESIGN.md", { exact: true }).waitFor();
      const hasHorizontalOverflow = await page.evaluate(() => globalThis.document.documentElement.scrollWidth > globalThis.innerWidth);
      assert(!hasHorizontalOverflow, `デザインハーネスの説明に横スクロールがあります: ${viewport.width}px`);
      assert(errors.length === 0, `デザインハーネスの説明のブラウザエラー:\n${errors.join("\n")}`);
      await page.close();
    }

    for (const [path, heading] of [["/patterns/visual-grouping", "視覚的グルーピング"], ["/patterns/mobile-layout", "モバイルレイアウト"]]) {
      for (const viewport of [{ width: 1440, height: 900 }, { width: 720, height: 900 }, { width: 390, height: 844 }]) {
        const { page, errors } = await openCheckedPage(path, viewport);
        await page.getByRole("heading", { name: heading, level: 1 }).waitFor();
        assert(await page.locator("table.doc-table").count() >= 3, `${heading}の表が3つ以上ありません`);
        const hasHorizontalOverflow = await page.evaluate(() => globalThis.document.documentElement.scrollWidth > globalThis.innerWidth);
        assert(!hasHorizontalOverflow, `${heading}に横スクロールがあります: ${viewport.width}px`);
        assert(errors.length === 0, `${heading}のブラウザエラー:\n${errors.join("\n")}`);
        await page.close();
      }
    }

    for (const viewport of [{ width: 1440, height: 900 }, { width: 720, height: 900 }, { width: 390, height: 844 }]) {
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

    for (const viewport of [{ width: 1440, height: 900 }, { width: 720, height: 900 }, { width: 390, height: 844 }]) {
      const { page, errors } = await openCheckedPage("/examples/invoice-management/results", viewport);
      await page.getByRole("heading", { name: "生成結果の比較", level: 1 }).waitFor();
      await page.getByRole("button", { name: "詳細（モバイル）" }).click();
      await page.waitForFunction(() => {
        const images = Array.from(globalThis.document.querySelectorAll(".compare-figure img"));
        return (
          images.length === 2 &&
          images.every(
            (image) =>
              image.complete &&
              image.naturalWidth > 0 &&
              (image.getAttribute("src") ?? "").startsWith("/experiments/invoice-management/") &&
              (image.getAttribute("src") ?? "").endsWith("-detail-mobile.png"),
          )
        );
      });
      const hasHorizontalOverflow = await page.evaluate(() => globalThis.document.documentElement.scrollWidth > globalThis.innerWidth);
      assert(!hasHorizontalOverflow, `請求書管理の比較に横スクロールがあります: ${viewport.width}px`);
      assert(errors.length === 0, `請求書管理の比較のブラウザエラー:\n${errors.join("\n")}`);
      await page.close();
    }

    {
      const { page, errors } = await openCheckedPage("/examples/account-management/results", { width: 1440, height: 900 });
      const subjects = page.getByRole("group", { name: "比較する題材" });
      await subjects.getByRole("button", { name: "請求書管理" }).click();
      await page.waitForURL(/\/examples\/invoice-management\/results$/);
      await page.waitForFunction(() => {
        const image = globalThis.document.querySelector(".compare-figure img");
        return Boolean(image) && (image.getAttribute("src") ?? "").startsWith("/experiments/invoice-management/");
      });
      const activeItems = page.locator(".nav-item-active");
      assert(await activeItems.count() === 1, "比較ページで選択中のナビ項目が1件になっていません");
      assert((await activeItems.first().textContent())?.trim() === "生成結果の比較", "比較ページで選択中のナビ項目が違います");
      assert(errors.length === 0, `題材の切り替えのブラウザエラー:\n${errors.join("\n")}`);
      await page.close();
    }

    {
      const { page } = await openCheckedPage("/demo/runs/account-management?scene=issue", { width: 1440, height: 900 });
      await page.waitForURL(/\/examples\/account-management\/results$/);
      await page.getByRole("heading", { name: "生成結果の比較", level: 1 }).waitFor();
      await page.close();
    }

    {
      // 存在しない path は「/」へ飛ばさず、404 ページを出します。
      const { page, errors } = await openCheckedPage("/no-such-page", { width: 1440, height: 900 });
      await page.getByRole("heading", { name: "ページが見つかりません", level: 1 }).waitFor({ timeout: 5000 });
      assert(new URL(page.url()).pathname === "/no-such-page", `404 ページで URL が書き換わっています: ${page.url()}`);
      assert(errors.length === 0, `404 ページのブラウザエラー:\n${errors.join("\n")}`);
      await page.close();
    }

    {
      const { page, errors } = await openCheckedPage("/play/account-management?mode=atlas&state=invalid-email", { width: 1440, height: 900 });
      const frame = page.frameLocator("iframe[title='Atlas適用後の顧客管理画面']");
      // 閉じる操作とエラー文言はRunごとに言い回しが変わるため、構造で確かめます。
      const closeTrigger = frame.locator("[role='dialog'] [data-slot='drawer-close-trigger']");
      await closeTrigger.waitFor();
      assert(await closeTrigger.count() === 1, "Drawerの閉じる操作が1件になっていません");
      const closeBox = await closeTrigger.boundingBox();
      const closeText = (await closeTrigger.textContent())?.trim() ?? "";
      const closeName = (await closeTrigger.getAttribute("aria-label"))?.trim() ?? "";
      assert(Boolean(closeBox) && closeText === "" && closeBox.width >= 24 && closeBox.width <= 48, "Drawerの閉じる操作が崩れています");
      assert(closeName !== "", "Drawerの閉じる操作に読み上げ名がありません");
      assert(await frame.getByLabel("メールアドレス").getAttribute("aria-invalid") === "true", "メールアドレスの入力エラーが伝わっていません");
      const fieldError = frame.locator("[role='dialog'] [data-slot='field-error']").first();
      await fieldError.waitFor();
      assert(((await fieldError.textContent())?.trim() ?? "") !== "", "入力エラーの説明文が表示されていません");
      assert(errors.length === 0, `Atlas操作画面のブラウザエラー:\n${errors.join("\n")}`);
      // 同じルートのまま状態だけ切り替えたとき、URLのstateどおりに作り直されることを確かめます。
      // iframeのsrcはハッシュしか変わらないので、作り直さないと前の状態が残ります。
      await page.getByRole("button", { name: "状態" }).click();
      await page.getByRole("option", { name: "削除を確認" }).click();
      await frame.locator("[role='alertdialog']").waitFor();
      assert(
        (await frame.locator("[data-slot='drawer-close-trigger']").count()) === 0,
        "状態を切り替えても前の状態のDrawerが残っています",
      );
      await page.getByRole("button", { name: "状態" }).click();
      await page.getByRole("option", { name: "入力エラー" }).click();
      await frame.locator("[role='dialog'] [data-slot='field-error']").first().waitFor();
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

    {
      const { page, errors } = await openCheckedPage("/play/invoice-management?mode=atlas&state=invalid-due-date", { width: 1440, height: 900 });
      const frame = page.frameLocator("iframe[title='Atlas適用後の請求書管理画面']");
      const closeTrigger = frame.getByRole("button", { name: "編集を閉じる" });
      await closeTrigger.waitFor();
      const closeBox = await closeTrigger.boundingBox();
      const closeText = (await closeTrigger.textContent())?.trim() ?? "";
      assert(Boolean(closeBox) && closeText === "" && closeBox.width >= 24 && closeBox.width <= 48, "請求書Drawerの閉じる操作が崩れています");
      await frame.getByText("支払期限を入力してください。").waitFor();
      assert(errors.length === 0, `Atlas請求書操作画面のブラウザエラー:\n${errors.join("\n")}`);
      await page.getByRole("button", { name: "設計指示なし" }).click();
      await page.waitForURL(/mode=baseline&state=invalid-due-date/);
      await page.locator("iframe[title='設計指示なしの請求書管理画面']").waitFor();
      const baselineFrameSrc = await page.locator("iframe").getAttribute("src");
      assert(
        baselineFrameSrc === "/play-invoice-baseline.html#/invoices/invoice_2026_0142?state=invalid-due-date",
        `請求書の比較条件の切替で状態が維持されていません: ${baselineFrameSrc}`,
      );
      await page.close();
    }

    // axe は違反が多くなりがちなので、他の検査を全部通してから最後にまとめて報告します。
    {
      const axeFailures = [];
      for (const [path, heading] of AXE_PAGES) {
        for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
          // AxeBuilder は browser.newPage() のページを受け付けないので context 経由で開きます。
          const context = await browser.newContext({ viewport });
          const page = await context.newPage();
          await page.goto(`${origin}${path}`, { waitUntil: "networkidle" });
          if (heading) await page.getByRole("heading", { name: heading, level: 1 }).waitFor();
          else await page.locator("h1").first().waitFor();
          const results = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
          axeFailures.push(...formatAxeViolations(`${path}@${viewport.width}`, results.violations));
          await context.close();
        }
      }
      assert(axeFailures.length === 0, `axe (WCAG 2.1 AA) の違反:\n${axeFailures.join("\n")}`);
    }

    console.log("Site browser check OK: Overview, Getting started, デザインハーネス, デザインパターン, Results, 404, axe, Play");
  } finally {
    await browser.close();
    await server.close();
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  await main();
}
