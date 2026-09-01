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

  {
    const { page, errors } = await openCheckedPage("/demo/runs/account-management?scene=issue", { width: 1280, height: 720 });
    for (const scene of ["issue", "apply", "generate", "result"]) {
      await page.goto(`${origin}/demo/runs/account-management?scene=${scene}`, { waitUntil: "networkidle" });
      const layout = await page.evaluate(() => {
        const stage = globalThis.document.querySelector(".demo-stage");
        return {
          overflowX: globalThis.document.documentElement.scrollWidth > globalThis.innerWidth,
          overflowY: Boolean(stage && stage.scrollHeight > stage.clientHeight),
        };
      });
      assert(!layout.overflowX && !layout.overflowY, `Presenterの${scene}が1280x720に収まりません`);
    }
    await page.goto(`${origin}/demo/runs/account-management?scene=issue`, { waitUntil: "networkidle" });
    await page.keyboard.press("ArrowRight");
    await page.getByRole("heading", { name: "Issueに、Atlasの設計情報を重ねる", level: 1 }).waitFor();
    await page.keyboard.press("r");
    await page.getByRole("heading", { name: "顧客を探して、情報を更新したい", level: 1 }).waitFor();
    assert(errors.length === 0, `Presenterのブラウザエラー:\n${errors.join("\n")}`);
    await page.close();
  }

  {
    const { page, errors } = await openCheckedPage("/play/account-management?mode=atlas&state=invalid-email", { width: 1440, height: 900 });
    const frame = page.frameLocator("iframe[title='Atlas適用後の顧客管理画面']");
    const closeTrigger = frame.getByRole("button", { name: "編集画面を閉じる" });
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

  console.log("Site browser check OK: Overview, Getting started, Presenter, Play");
} finally {
  await browser.close();
  await server.close();
}
