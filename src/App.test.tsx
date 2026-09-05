/// <reference types="node" />
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { cwd } from "node:process";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { App } from "./App";
import { designData } from "./data/design";
import { artifactSourceHref, repositoryUrl } from "./data/repository";
import { ruleMethodLabels } from "./pages/DocsPages";
import { ChecksList, harnessArtifacts } from "./pages/HarnessPages";
import { mainFiles } from "./pages/DocsPages";
import {
  baselineEvaluation,
  comparison,
  harnessEvaluation,
  runEnvironment,
  sameModelRuns,
} from "./data/runs";

const statusLabels: Record<string, string> = { passed: "合格", failed: "違反", review: "要確認" };

afterEach(cleanup);

describe("Atlas Design System demo", () => {
  it("presents the public site as a demo design system", async () => {
    const user = userEvent.setup();
    render(<MemoryRouter initialEntries={["/"]}><App /></MemoryRouter>);
    expect(screen.getByRole("heading", { name: "Atlas Design System" })).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "Atlas Design System" })).toHaveLength(2);
    expect(screen.getByText("デザインハーネスを用いて設計・検証する、デモ用のデザインシステムです。")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "導入方法を見る" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "導入方法を見る" })).toHaveClass("button--lg");
    expect(screen.queryByRole("button", { name: "実装比較デモを見る" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "今すぐ使ってみる" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /色、文字、余白/ })).toHaveAttribute("href", "/foundations");
    expect(screen.getByRole("link", { name: /色、文字、余白/ })).toHaveClass("site-card");
    expect(screen.getByRole("link", { name: /採用するHeroUI部品/ })).toHaveAttribute("href", "/components");
    expect(screen.getByRole("link", { name: /業務オブジェクトの関係/ })).toHaveAttribute("href", "/patterns/page-layout");
    expect(screen.getByRole("link", { name: /実装後に自動検査/ })).toHaveAttribute("href", "/rules");

    await user.click(screen.getByRole("button", { name: "導入方法を見る" }));
    expect(screen.getByRole("heading", { level: 1, name: "導入方法" })).toBeInTheDocument();
  });

  it("links to the GitHub repository from the sidebar", () => {
    render(<MemoryRouter initialEntries={["/"]}><App /></MemoryRouter>);

    const repository = screen.getByRole("link", { name: "GitHub" });
    expect(repository).toHaveAttribute("href", repositoryUrl);
    expect(repository).toHaveAttribute("target", "_blank");
    expect(repository).toHaveAttribute("rel", "noreferrer");
    expect(repository).toHaveClass("nav-item");
    expect(repository.closest("nav")).toHaveClass("sidebar-nav");
    expect(document.querySelectorAll(".nav-item-active")).toHaveLength(1);
  });

  it("shows the copyright at the end of the page", () => {
    render(<MemoryRouter initialEntries={["/harness"]}><App /></MemoryRouter>);

    const footer = screen.getByText("© 2026 Lumilinks inc.").closest("footer");
    expect(footer).toHaveClass("docs-footer");
    expect(footer?.closest("main")).toHaveClass("docs-main");
  });

  it("shows GitHub, Skill, and MCP as separate setup methods", async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
    render(<MemoryRouter initialEntries={["/getting-started"]}><App /></MemoryRouter>);

    expect(screen.getByRole("heading", { level: 1, name: "導入方法" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "GitHub" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Skill" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "MCP" })).toBeInTheDocument();
    expect(screen.getAllByText("前提")).toHaveLength(3);
    // 確認コマンドは導入コマンドと同じブロックに入れ、更新手順はページ末尾に1回だけ置く
    expect(screen.getAllByText(/# 確認/)).toHaveLength(3);
    expect(screen.getByRole("heading", { name: "更新する" })).toBeInTheDocument();
    expect(screen.queryByText("このリポジトリを手元で動かす")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "GitHubの導入コマンドをコピー" }));
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining("git clone"));
    expect(screen.getByRole("button", { name: "GitHubの導入コマンドをコピーしました" })).toBeInTheDocument();
  });

  it("shows the implementation stack and the design-contract stack", () => {
    render(<MemoryRouter initialEntries={["/technical-specifications"]}><App /></MemoryRouter>);

    expect(screen.getByRole("heading", { level: 1, name: "技術仕様" })).toBeInTheDocument();
    expect(screen.getByText("React 19.2.8 / TypeScript 6.0.3")).toBeInTheDocument();
    expect(screen.getByText("HeroUI 3.2.4")).toBeInTheDocument();
    expect(screen.getByText("Agent Skill / MCP")).toBeInTheDocument();
  });

  it("links each main file in the technical specifications to its source on GitHub", () => {
    render(<MemoryRouter initialEntries={["/technical-specifications"]}><App /></MemoryRouter>);

    const files = screen.getByRole("region", { name: "主なファイル" });
    const tokens = within(files).getByRole("link", { name: "design/tokens.json" });
    expect(tokens).toHaveAttribute("href", `${repositoryUrl}/blob/main/design/tokens.json`);
    expect(tokens).toHaveAttribute("target", "_blank");
    expect(tokens).toHaveAttribute("rel", "noreferrer");
    expect(within(files).getByRole("link", { name: "design/components/*.json" })).toHaveAttribute(
      "href",
      `${repositoryUrl}/tree/main/design/components`,
    );
    expect(within(files).getByRole("link", { name: "skills/atlas-design-system/" })).toHaveAttribute(
      "href",
      `${repositoryUrl}/tree/main/skills/atlas-design-system`,
    );
    expect(within(files).getByRole("link", { name: "scripts/mcp/server.mjs" })).toHaveAttribute(
      "href",
      `${repositoryUrl}/blob/main/scripts/mcp/server.mjs`,
    );
  });

  it("shows visual previews for spacing, radius, and typography tokens", () => {
    render(<MemoryRouter initialEntries={["/foundations"]}><App /></MemoryRouter>);

    expect(screen.getByRole("list", { name: "余白トークンの実寸プレビュー" })).toBeInTheDocument();
    expect(screen.getByText("radius.base")).toBeInTheDocument();
    expect(screen.getByText("radius.pill")).toBeInTheDocument();
    expect(screen.getByText("radius.circle")).toBeInTheDocument();
    expect(screen.getByRole("generic", { name: "影トークンの実寸プレビュー" })).toBeInTheDocument();
    expect(screen.getByText("shadow.none")).toBeInTheDocument();
    expect(screen.getByText("shadow.raised")).toBeInTheDocument();
    expect(screen.getByText("shadow.dragging")).toBeInTheDocument();
    expect(screen.getByText("shadow.overlay")).toBeInTheDocument();
    expect(screen.getByText("shadow.floating")).toBeInTheDocument();
    expect(screen.getAllByText("顧客情報")).not.toHaveLength(0);
    expect(screen.getAllByText(/読みやすい行間は/)).toHaveLength(2);
  });

  it("shows previews and expandable code for the components available to business screens", async () => {
    const user = userEvent.setup();
    render(<MemoryRouter initialEntries={["/components"]}><App /></MemoryRouter>);

    expect(screen.getByRole("heading", { level: 1, name: "コンポーネント" })).toBeInTheDocument();
    expect(screen.queryByText("このサイトで使用している部品")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "保存" })).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "株式会社ノーススター" })).not.toHaveLength(0);
    const customerTable = screen.getByRole("grid", { name: "顧客一覧の例" });
    expect(customerTable.closest("[data-slot='table']")).toHaveClass("table-root--primary");
    expect(screen.getAllByRole("columnheader").slice(0, 4).map((header) => header.textContent)).toEqual([
      "企業名",
      "担当者",
      "最終対応日",
      "ステータス",
    ]);
    expect(screen.getByRole("columnheader", { name: "最終対応日" })).toHaveAttribute("data-align", "end");
    expect(screen.getByText("北斗物流株式会社")).toBeInTheDocument();
    expect(screen.getByText("青葉商事株式会社")).toBeInTheDocument();
    expect(screen.getByText("南雲製作所")).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "最終対応日" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "メールアドレス" })).toBeInTheDocument();
    expect(screen.getAllByRole("searchbox", { name: "企業名で検索" })).toHaveLength(2);
    expect(screen.getByRole("toolbar", { name: "顧客一覧の操作" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "顧客情報を編集" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "更新結果を表示" })).toBeInTheDocument();
    expect(screen.getByText("default variantはshadow.raisedで背景から一段持ち上げる")).toBeInTheDocument();
    expect(screen.getByText("通常状態ではborderを使わず、選択やフォーカスなど状態を示す場合だけ境界を加える")).toBeInTheDocument();
    expect(screen.getAllByText("利用できるサイズ")).toHaveLength(screen.getAllByText("利用できるバリエーション").length);
    expect(screen.getAllByText("sm, md, lg").length).toBeGreaterThan(0);

    await user.click(screen.getByRole("button", { name: "顧客を削除" }));
    expect(screen.getByRole("button", { name: "戻る" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "顧客を削除" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "戻る" }));

    await user.click(screen.getByRole("button", { name: "Buttonのコードを表示" }));
    expect(screen.getByText(/export function Actions/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Buttonのコードを閉じる" })).toHaveAttribute("aria-expanded", "true");

    await user.click(screen.getByRole("button", { name: "Tableのコードを表示" }));
    const tableCode = screen.getByText(/const CUSTOMER_TABLE_COLUMNS/);
    expect(tableCode).toBeInTheDocument();
    expect(tableCode).toHaveTextContent('variant="primary"');
  });

  it("documents page layout as a reusable design pattern", () => {
    render(<MemoryRouter initialEntries={["/patterns/page-layout"]}><App /></MemoryRouter>);

    expect(screen.getByRole("heading", { name: "Page layout" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "詳細（1カラム）" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "一覧（テーブル）" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "モバイルでは1カラムに積み替える" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Account management" })).not.toBeInTheDocument();
  });

  it("documents spacing as grouping, hierarchy, and responsive padding", () => {
    render(<MemoryRouter initialEntries={["/patterns/spacing-layout"]}><App /></MemoryRouter>);

    expect(screen.getByRole("heading", { level: 1, name: "余白の取り方" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "近い要素を同じまとまりにする" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "間隔と内側の余白を使い分ける" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "代表的な組み合わせ" })).toBeInTheDocument();
    expect(screen.getByText("外周32px、セクション間32px、グループ間24px、見出しと内容16px")).toBeInTheDocument();
    expect(screen.getByText("pattern.spacing-layout")).toBeInTheDocument();
  });

  it("documents visual grouping as spacing, surfaces, and dividers", () => {
    render(<MemoryRouter initialEntries={["/patterns/visual-grouping"]}><App /></MemoryRouter>);

    expect(screen.getByRole("heading", { level: 1, name: "視覚的グルーピング" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "考え方" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "構造" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "使い分け" })).toBeInTheDocument();
    expect(screen.getByText("pattern.visual-grouping")).toBeInTheDocument();
    expect(screen.getAllByRole("table").length).toBeGreaterThanOrEqual(3);
    expect(screen.getByRole("rowheader", { name: "矩形でまとめる" })).toBeInTheDocument();
    expect(screen.getAllByText(".section-block").length).toBeGreaterThan(0);
  });

  it("documents mobile layout as one column, compact spacing, and touch targets", () => {
    render(<MemoryRouter initialEntries={["/patterns/mobile-layout"]}><App /></MemoryRouter>);

    expect(screen.getByRole("heading", { level: 1, name: "モバイルレイアウト" })).toBeInTheDocument();
    expect(screen.getByText("pattern.mobile-layout")).toBeInTheDocument();
    expect(screen.getAllByRole("table").length).toBeGreaterThanOrEqual(3);
    expect(screen.getByRole("rowheader", { name: "タップ領域の確保" })).toBeInTheDocument();
    expect(screen.getByText(".touch-target")).toBeInTheDocument();
    expect(screen.getAllByText("breakpoint.narrow")).toHaveLength(4);
  });

  it("presents visual grouping principles and variants as cards", () => {
    const pattern = designData.patterns["visual-grouping"];
    render(<MemoryRouter initialEntries={["/patterns/visual-grouping"]}><App /></MemoryRouter>);

    const principles = screen.getByRole("region", { name: "考え方" });
    expect(within(principles).queryByRole("table")).not.toBeInTheDocument();
    expect(within(principles).getAllByRole("heading", { level: 3 })).toHaveLength(pattern.principles.length);
    expect(within(principles).getByRole("heading", { level: 3, name: "階層を深くしない" })).toBeInTheDocument();

    const variants = screen.getByRole("region", { name: "使い分け" });
    expect(within(variants).queryByRole("table")).not.toBeInTheDocument();
    expect(variants.querySelectorAll("[data-slot='card']")).toHaveLength(pattern.variants.length);
    const surfaceGroup = within(variants)
      .getByRole("heading", { level: 3, name: "矩形でまとめる" })
      .closest("[data-slot='card']");
    expect(surfaceGroup).toHaveClass("pattern-variant-card");
    expect(surfaceGroup).toHaveTextContent("surface-group");
    expect(surfaceGroup).toHaveTextContent("避ける場面");

    expect(screen.getByText("design/patterns/visual-grouping.json")).toBeInTheDocument();
    expect(document.querySelector(".doc-meta")).toBeNull();
  });

  it("keeps the mobile layout implementation values in a table beside the variant cards", () => {
    const pattern = designData.patterns["mobile-layout"];
    render(<MemoryRouter initialEntries={["/patterns/mobile-layout"]}><App /></MemoryRouter>);

    const variants = screen.getByRole("region", { name: "使い分け" });
    expect(variants.querySelectorAll("[data-slot='card']")).toHaveLength(pattern.variants.length);
    expect(within(variants).queryByText("breakpoint.narrow")).not.toBeInTheDocument();
    expect(within(variants).queryByText(".touch-target")).not.toBeInTheDocument();

    const layout = screen.getByRole("region", { name: "実装で使う値" });
    expect(within(layout).getByRole("rowheader", { name: "タップ領域の確保" })).toBeInTheDocument();
    expect(within(layout).getByText(".touch-target")).toBeInTheDocument();
    expect(screen.getByText("design/patterns/mobile-layout.json")).toBeInTheDocument();
  });

  it("separates the account management feature from reusable patterns", () => {
    render(<MemoryRouter initialEntries={["/examples/account-management"]}><App /></MemoryRouter>);

    expect(screen.getByRole("heading", { level: 1, name: "顧客管理" })).toBeInTheDocument();
    expect(screen.queryByText("Implementation example")).not.toBeInTheDocument();
    expect(screen.getByText("Page layout / 一覧（テーブル） → 詳細（1カラム）")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "生成された画面を操作する" })).toBeInTheDocument();
  });

  it("switches the interactive implementation between Atlas and baseline", async () => {
    const user = userEvent.setup();
    render(<MemoryRouter initialEntries={["/play/account-management?mode=atlas"]}><App /></MemoryRouter>);

    expect(screen.getByRole("heading", { name: "生成された画面を操作する" })).toBeInTheDocument();
    expect(screen.getByTitle("Atlas適用後の顧客管理画面")).toHaveAttribute("src", "/play-atlas.html#/customers?state=default");

    await user.click(screen.getByRole("button", { name: "設計指示なし" }));
    expect(screen.getByTitle("設計指示なしの顧客管理画面")).toHaveAttribute("src", "/play-baseline.html#/customers?state=default");
  });

  it("shares the selected implementation state in the URL", async () => {
    const user = userEvent.setup();
    render(<MemoryRouter initialEntries={["/play/account-management?mode=atlas&state=invalid-email"]}><App /></MemoryRouter>);

    expect(screen.getByTitle("Atlas適用後の顧客管理画面")).toHaveAttribute(
      "src",
      "/play-atlas.html#/customers/customer_northstar?state=invalid-email",
    );
    await user.click(screen.getByRole("button", { name: "設計指示なし" }));
    expect(screen.getByTitle("設計指示なしの顧客管理画面")).toHaveAttribute(
      "src",
      "/play-baseline.html#/customers/customer_northstar?state=invalid-email",
    );
  });

  it("explains the Design Harness cycle with four layers and data-driven counts", async () => {
    const user = userEvent.setup();
    const lint = designData.rules.filter((rule) => rule.method === "lint").length;
    const automatic = designData.rules.filter((rule) => rule.method === "automatic").length;
    const aiReview = designData.rules.filter((rule) => rule.method === "ai-review").length;
    const human = designData.rules.filter((rule) => rule.method === "human").length;
    render(<MemoryRouter initialEntries={["/"]}><App /></MemoryRouter>);
    await user.click(screen.getByRole("button", { name: "デザインハーネスの仕組みを見る" }));

    expect(screen.getByRole("heading", { level: 1, name: "デザインハーネス" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /デザインハーネスの公式サイト/ })).toHaveAttribute("href", "https://design-harness.com/");
    const diagram = screen.getByRole("figure", { name: "デザインハーネスのループ図" });
    const layerNames = ["制約する層", "コンテキストを渡す層", "検証する層", "フィードバックする層"];
    for (const [index, layer] of layerNames.entries()) {
      expect(await within(diagram).findByRole("button", { name: `0${index + 1} ${layer}` })).toBeInTheDocument();
    }
    expect(within(diagram).getByRole("button", { name: "01 制約する層" })).toHaveAttribute("aria-pressed", "true");
    const constrain = screen.getByRole("region", { name: "制約する層" });
    const constrainTable = within(constrain).getByRole("grid", { name: "制約する層のファイル" });
    expect(constrainTable.closest("[data-slot='table']")).toHaveClass("table-root--primary");
    expect(within(constrainTable).getByRole("columnheader", { name: "ファイル" })).toBeInTheDocument();
    expect(within(constrainTable).getByRole("rowheader", { name: "design/tokens.json" })).toBeInTheDocument();
    expect(within(constrainTable).getByRole("rowheader", { name: "design/rules.json" })).toBeInTheDocument();
    expect(constrain).toHaveTextContent(`ルール${designData.rules.length}件（Lint ${lint}、自動検証 ${automatic}、AIレビュー ${aiReview}）`);
    expect(constrain).not.toHaveTextContent("禁則");

    await user.click(within(diagram).getByRole("button", { name: "02 コンテキストを渡す層" }));
    expect(within(diagram).getByRole("button", { name: "02 コンテキストを渡す層" })).toHaveAttribute("aria-pressed", "true");
    expect(within(diagram).getByRole("button", { name: "01 制約する層" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.queryByRole("region", { name: "制約する層" })).not.toBeInTheDocument();
    const detail = screen.getByRole("region", { name: "コンテキストを渡す層" });
    expect(within(detail).getByRole("heading", { name: "コンテキストを渡す層" })).toBeInTheDocument();
    expect(detail).toHaveTextContent("DESIGN.md");
    expect(within(detail).getByRole("link", { name: /ページレイアウト/ })).toHaveAttribute("href", "/patterns/page-layout");

    within(diagram).getByRole("button", { name: "03 検証する層" }).focus();
    await user.keyboard("{Enter}");
    expect(within(diagram).getByRole("button", { name: "03 検証する層" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("region", { name: "検証する層" })).toHaveTextContent("scripts/evaluate-experiment.mjs");
    const methods = screen.getByRole("region", { name: "妥当性を、誰がどう担保するか" });
    expect(within(methods).queryByRole("list")).not.toBeInTheDocument();
    expect(within(methods).getAllByRole("paragraph").length).toBeGreaterThanOrEqual(3);
    expect(methods).toHaveTextContent(`${designData.rules.length}件のルールのうち${lint}件はESLintで、${automatic}件は評価スクリプトで自動検証`);
    expect(methods).toHaveTextContent(`${aiReview}件をレビュー`);
    expect(methods).toHaveTextContent(`人に任せているルールは${human}件`);

    const loop = screen.getByRole("region", { name: "デモ画面の生成サイクル" });
    const loopDiagram = within(loop).getByRole("figure", { name: "デモ画面の生成サイクルの図" });
    const loopTitles = [
      "Issueを渡す",
      "制約とコンテキストを渡す",
      "AIが生成する",
      "検査する",
      "検査結果をVALIDATION.mdとして返す",
      "修正版を再検査する",
    ];
    for (const title of loopTitles) {
      expect(await within(loopDiagram).findByText(title)).toBeInTheDocument();
    }
    expect(await within(loopDiagram).findByText(`違反 ${harnessEvaluation.summary.failed}件`)).toBeInTheDocument();
    expect(within(loop).queryByRole("list")).not.toBeInTheDocument();
    expect(screen.queryByText(/Figma|Storybook/)).not.toBeInTheDocument();
    expect(screen.queryByText("Agent-ready")).not.toBeInTheDocument();
    expect(screen.queryByRole("list", { name: /の実行検査$/ })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "生成結果の比較を見る" })).toHaveAttribute("href", "/examples/account-management/results");
  });

  it("links each harness artifact path to its source on GitHub", async () => {
    const user = userEvent.setup();
    render(<MemoryRouter initialEntries={["/harness"]}><App /></MemoryRouter>);

    const constrain = screen.getByRole("region", { name: "制約する層" });
    const tokens = within(constrain).getByRole("link", { name: "design/tokens.json" });
    expect(tokens).toHaveAttribute("href", `${repositoryUrl}/blob/main/design/tokens.json`);
    expect(tokens).toHaveAttribute("target", "_blank");
    expect(tokens).toHaveAttribute("rel", "noreferrer");
    expect(within(constrain).getByRole("link", { name: "design/components/*.json" })).toHaveAttribute(
      "href",
      `${repositoryUrl}/tree/main/design/components`,
    );

    const diagram = screen.getByRole("figure", { name: "デザインハーネスのループ図" });
    await user.click(await within(diagram).findByRole("button", { name: "02 コンテキストを渡す層" }));
    const context = screen.getByRole("region", { name: "コンテキストを渡す層" });
    expect(within(context).getByRole("link", { name: "skills/atlas-design-system/" })).toHaveAttribute(
      "href",
      `${repositoryUrl}/tree/main/skills/atlas-design-system`,
    );

    // VALIDATION.md は Run ごとの生成物でリポジトリに存在しないのでリンクにしない
    await user.click(await within(diagram).findByRole("button", { name: "04 フィードバックする層" }));
    const feedback = screen.getByRole("region", { name: "フィードバックする層" });
    expect(within(feedback).getByRole("rowheader", { name: "VALIDATION.md" })).toBeInTheDocument();
    expect(within(feedback).queryByRole("link", { name: "VALIDATION.md" })).not.toBeInTheDocument();
    expect(within(feedback).getByRole("link", { name: "scripts/refine-experiment.mjs" })).toHaveAttribute(
      "href",
      `${repositoryUrl}/blob/main/scripts/refine-experiment.mjs`,
    );
  });

  it("only links harness artifact paths that exist in the repository", () => {
    const repositoryRoot = cwd();
    expect(harnessArtifacts.length).toBeGreaterThan(0);

    for (const artifact of harnessArtifacts) {
      const target = artifactSourceHref(artifact.path)
        .replace(`${repositoryUrl}/blob/main/`, "")
        .replace(`${repositoryUrl}/tree/main/`, "");
      expect([artifact.path, existsSync(join(repositoryRoot, target))]).toEqual([
        artifact.path,
        artifact.inRepository !== false,
      ]);
    }
    expect(harnessArtifacts.find((artifact) => artifact.path === "VALIDATION.md")?.inRepository).toBe(false);
  });

  it("only lists main files that exist in the repository", () => {
    const repositoryRoot = cwd();
    for (const file of mainFiles) {
      const target = artifactSourceHref(file.path)
        .replace(`${repositoryUrl}/blob/main/`, "")
        .replace(`${repositoryUrl}/tree/main/`, "");
      expect([file.path, existsSync(join(repositoryRoot, target))]).toEqual([file.path, true]);
    }
  });

  it("links from the demo cycle section to the technical specifications", () => {
    render(<MemoryRouter initialEntries={["/harness"]}><App /></MemoryRouter>);
    const loop = screen.getByRole("region", { name: "デモ画面の生成サイクル" });
    expect(within(loop).getByRole("link", { name: "技術仕様（設計契約と検証）を見る" })).toHaveAttribute(
      "href",
      "/technical-specifications#design-contract-stack-title",
    );
  });

  it("shows the baseline lint check as Atlas-not-applied instead of passed", () => {
    // baseline は Atlas 層を受け取らないので、lint が通っても「Atlas ルールで合格」ではない
    const checks = [
      { name: "lint", status: "passed", exitCode: 0 },
      { name: "build", status: "passed", exitCode: 0 },
    ];
    render(<ChecksList checks={checks} label="baseline" condition="baseline" />);
    const items = within(screen.getByRole("list", { name: "baseline" })).getAllByRole("listitem");
    expect(items[0]).toHaveTextContent("Lint（Atlas ルール非適用、基本ルールのみ）");
    expect(items[0]).toHaveClass("check-skip");
    expect(items[0]).not.toHaveClass("check-pass");
    expect(items[1]).toHaveTextContent("ビルド");
    expect(items[1]).toHaveClass("check-pass");
    cleanup();

    render(<ChecksList checks={checks} label="harness" condition="harness" />);
    const harnessItem = within(screen.getByRole("list", { name: "harness" })).getAllByRole("listitem")[0];
    expect(harnessItem).toHaveTextContent("Lint（Atlas ルール含む）");
    expect(harnessItem).toHaveClass("check-pass");
  });

  it("compares the baseline and harness results side by side from the saved run", async () => {
    const user = userEvent.setup();
    render(<MemoryRouter initialEntries={["/examples/account-management/results"]}><App /></MemoryRouter>);

    expect(screen.getByRole("heading", { level: 1, name: "生成結果の比較" })).toBeInTheDocument();
    expect(screen.getByText(`Run ${comparison.pairId}`)).toBeInTheDocument();
    expect(screen.getByText(`Model ${runEnvironment.model}`)).toBeInTheDocument();

    const baseline = screen.getByRole("article", { name: "ハーネスなし" });
    expect(baseline).toHaveTextContent(`${baselineEvaluation.summary.passed} 合格`);
    expect(baseline).toHaveTextContent(`${baselineEvaluation.summary.failed} 違反`);
    expect(baseline).toHaveTextContent(`${baselineEvaluation.summary.review} 要確認`);
    const harness = screen.getByRole("article", { name: "ハーネスあり" });
    expect(harness).toHaveTextContent(`${harnessEvaluation.summary.passed} 合格`);
    expect(harness).toHaveTextContent(`${harnessEvaluation.summary.failed} 違反`);
    expect(harness).toHaveTextContent(`${harnessEvaluation.summary.review} 要確認`);

    expect(screen.getByAltText("ハーネスなしで生成した顧客管理画面（一覧）")).toHaveAttribute(
      "src",
      "/experiments/account-management/runs/lint-01/baseline.png",
    );
    await user.click(screen.getByRole("button", { name: "詳細（モバイル）" }));
    expect(screen.getByAltText("ハーネスなしで生成した顧客管理画面（詳細（モバイル））")).toHaveAttribute(
      "src",
      "/experiments/account-management/runs/lint-01/baseline-detail-mobile.png",
    );
    expect(screen.getByAltText("ハーネスありで生成した顧客管理画面（詳細（モバイル））")).toHaveAttribute(
      "src",
      "/experiments/account-management/runs/lint-01/harness-detail-mobile.png",
    );

    const table = screen.getByRole("table", { name: "ルールごとの検査結果" });
    expect(within(table).getAllByRole("row")).toHaveLength(designData.rules.length + 1);
    const firstRule = designData.rules[0]!;
    const baselineStatus = baselineEvaluation.rules.find((rule) => rule.id === firstRule.id)!.status;
    const harnessStatus = harnessEvaluation.rules.find((rule) => rule.id === firstRule.id)!.status;
    const firstRow = within(table).getByRole("row", { name: new RegExp(firstRule.title) });
    expect(firstRow).toHaveTextContent(statusLabels[baselineStatus]!);
    expect(firstRow).toHaveTextContent(statusLabels[harnessStatus]!);
    expect(firstRow).toHaveTextContent(ruleMethodLabels[firstRule.method]!);


    // 同じモデルで lint 層あり/なしを比べた run。数字は保存済みの design-evaluation.json だけを使う
    const sameModel = screen.getByRole("table", { name: "同じモデルでの比較" });
    expect(within(sameModel).getAllByRole("row")).toHaveLength(sameModelRuns.length * 2 + 1);
    for (const run of sameModelRuns) {
      const rows = within(sameModel).getAllByRole("row", { name: new RegExp(`^${run.pairId}${run.model}`) });
      expect(rows).toHaveLength(2);
      expect(rows[0]).toHaveTextContent(run.model);
      expect(rows[0]).toHaveTextContent(`${run.baseline.summary.failed}`);
      expect(rows[1]).toHaveTextContent(`${run.harness.summary.failed}`);
    }
    const sameModelSection = screen.getByRole("region", { name: "同じモデルでの比較" });
    expect(sameModelSection).toHaveTextContent("各条件 1 run");
    expect(sameModelSection).toHaveTextContent("import で辿れるファイル");
    expect(screen.getByRole("button", { name: "設計指示なしの画面を操作する" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Atlas適用後の画面を操作する" })).toBeInTheDocument();
  });

  it("redirects the retired presenter routes to the comparison page", () => {
    render(<MemoryRouter initialEntries={["/demo/runs/account-management?scene=issue"]}><App /></MemoryRouter>);
    expect(screen.getByRole("heading", { level: 1, name: "生成結果の比較" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "次へ" })).not.toBeInTheDocument();
  });
  it("marks only the comparison page as active in the sidebar on the results route", () => {
    render(<MemoryRouter initialEntries={["/examples/account-management/results"]}><App /></MemoryRouter>);
    const active = document.querySelectorAll(".nav-item-active");
    expect(active).toHaveLength(1);
    expect(active[0]).toHaveTextContent("生成結果の比較");
  });
});
