import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { App } from "./App";

afterEach(cleanup);

describe("Atlas Design System demo", () => {
  it("presents the public site as a demo design system", async () => {
    const user = userEvent.setup();
    render(<MemoryRouter initialEntries={["/"]}><App /></MemoryRouter>);
    expect(screen.getByRole("heading", { name: "Atlas Design System" })).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "Atlas Design System" })).toHaveLength(2);
    expect(screen.getByText("Design Harnessを用いて設計・検証する、デモ用のデザインシステムです。")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "導入方法を見る" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "導入方法を見る" })).toHaveClass("button--lg");
    expect(screen.getByRole("button", { name: "実装比較デモを見る" })).toHaveClass("button--lg");
    expect(screen.queryByRole("button", { name: "今すぐ使ってみる" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /色、文字、余白/ })).toHaveAttribute("href", "/foundations");
    expect(screen.getByRole("link", { name: /色、文字、余白/ })).toHaveClass("site-card");
    expect(screen.getByRole("link", { name: /採用するHeroUI部品/ })).toHaveAttribute("href", "/components");
    expect(screen.getByRole("link", { name: /業務オブジェクトの関係/ })).toHaveAttribute("href", "/patterns/page-layout");
    expect(screen.getByRole("link", { name: /実装後に自動検査/ })).toHaveAttribute("href", "/rules");

    await user.click(screen.getByRole("button", { name: "導入方法を見る" }));
    expect(screen.getByRole("heading", { level: 1, name: "導入方法" })).toBeInTheDocument();
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
    expect(screen.getAllByText("導入")).toHaveLength(3);
    expect(screen.getAllByText("確認")).toHaveLength(3);
    expect(screen.getAllByText("更新")).toHaveLength(3);
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

  it("moves through the four presentation scenes", async () => {
    const user = userEvent.setup();
    render(<MemoryRouter initialEntries={["/demo/runs/account-management"]}><App /></MemoryRouter>);
    expect(screen.getByRole("heading", { name: "顧客を探して、情報を更新したい" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "次へ" }));
    expect(screen.getByRole("heading", { name: "Issueに、Atlasの設計情報を重ねる" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "次へ" }));
    expect(screen.getByRole("heading", { name: "AIは設計を読み、作り、検査結果で直す" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "次へ" }));
    expect(screen.getByRole("heading", { name: "設計指示があると、修正可能な実装になる" })).toBeInTheDocument();
    expect(screen.getByText("AIにIssueだけ渡す")).toBeInTheDocument();
    expect(screen.getByText("Atlasを適用する")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "設計指示なしの画面を操作する" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Atlas適用後の画面を操作する" })).toBeInTheDocument();
  });
});
