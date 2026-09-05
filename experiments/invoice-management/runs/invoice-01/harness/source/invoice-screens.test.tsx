import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { App } from "./App";
import { resetInvoiceRecords } from "./fixtures";

const detailHash = "#/invoices/invoice_2026_0142";

function renderAt(hash: string) {
  window.location.hash = hash;
  return render(<App />);
}

beforeEach(() => {
  resetInvoiceRecords();
});

afterEach(() => {
  cleanup();
  window.location.hash = "";
});

describe("請求書一覧", () => {
  it("要約情報だけを列定義どおりに表示する", () => {
    renderAt("#/invoices");

    expect(screen.getByRole("columnheader", { name: "請求書番号" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "ステータス" })).toBeInTheDocument();
    expect(screen.getAllByText("有限会社みなも").length).toBeGreaterThan(0);
    expect(screen.getAllByText("￥482,000").length).toBeGreaterThan(0);
    expect(screen.queryByText("先方の締め日は月末。請求書番号を件名に入れる。")).not.toBeInTheDocument();
  });

  it("請求書番号で絞り込める", async () => {
    const user = userEvent.setup();
    renderAt("#/invoices");

    await user.type(screen.getByRole("searchbox", { name: "請求書番号で検索" }), "0131");

    expect(screen.getAllByRole("link", { name: "INV-2026-0131" }).length).toBeGreaterThan(0);
    expect(screen.queryByRole("link", { name: "INV-2026-0142" })).not.toBeInTheDocument();
  });

  it("state=empty で空状態を表示する", () => {
    renderAt("#/invoices?state=empty");

    expect(screen.getByText("請求書がありません")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "INV-2026-0142" })).not.toBeInTheDocument();
  });
});

describe("請求書詳細", () => {
  it("完全な情報を表示する", () => {
    renderAt(detailHash);

    expect(screen.getByRole("heading", { name: "INV-2026-0142" })).toBeInTheDocument();
    expect(screen.getByText("2026/09/30")).toBeInTheDocument();
    expect(screen.getByText("初期設定サポート")).toBeInTheDocument();
    expect(screen.getByText("先方の締め日は月末。請求書番号を件名に入れる。")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "請求書一覧" })).not.toBeInTheDocument();
  });

  it("state=drawer-open で編集Drawerが開く", () => {
    renderAt(`${detailHash}?state=drawer-open`);

    expect(screen.getByRole("textbox", { name: "顧客名" })).toHaveValue("有限会社みなも");
    expect(screen.getByLabelText("支払期限")).toHaveValue("2026-09-30");
  });

  it("state=invalid-due-date で支払期限のエラーを表示し、保存しない", async () => {
    const user = userEvent.setup();
    renderAt(`${detailHash}?state=invalid-due-date`);

    expect(screen.getByText("支払期限を入力してください。")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "変更を保存" }));

    expect(screen.getByText("支払期限を入力してください。")).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("state=loading で保存ボタンを二重送信できない", () => {
    renderAt(`${detailHash}?state=loading`);

    expect(screen.getByRole("button", { name: "変更を保存" })).toBeDisabled();
  });

  it("state=success で保存完了を詳細に反映する", () => {
    renderAt(`${detailHash}?state=success`);

    expect(screen.getByText("請求書の変更を保存しました")).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("state=failure で入力を保ったまま再試行できる", async () => {
    const user = userEvent.setup();
    renderAt(`${detailHash}?state=failure`);

    expect(screen.getByText("保存できませんでした")).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "顧客名" })).toHaveValue("有限会社みなも");

    await user.click(screen.getByRole("button", { name: "変更を保存" }));

    expect(await screen.findByText("請求書の変更を保存しました")).toBeInTheDocument();
  });

  it("編集した顧客名とメモを保存すると詳細へ反映する", async () => {
    const user = userEvent.setup();
    renderAt(`${detailHash}?state=drawer-open`);

    const customerName = screen.getByRole("textbox", { name: "顧客名" });
    await user.clear(customerName);
    await user.type(customerName, "有限会社みなも商会");
    await user.click(screen.getByRole("button", { name: "変更を保存" }));

    expect(await screen.findByText("請求書の変更を保存しました")).toBeInTheDocument();
    expect(screen.getByText("有限会社みなも商会")).toBeInTheDocument();
  });
});

describe("請求書の無効化", () => {
  it("state=void-confirm で対象と結果を確認してから無効化し、一覧へ戻る", async () => {
    const user = userEvent.setup();
    renderAt(`${detailHash}?state=void-confirm`);

    const dialog = screen.getByRole("alertdialog", { name: "請求書を無効化" });
    expect(within(dialog).getByText(/INV-2026-0142/)).toBeInTheDocument();
    expect(within(dialog).getByText(/元に戻せません/)).toBeInTheDocument();

    await user.click(within(dialog).getByRole("button", { name: "無効化する" }));

    expect(window.location.hash).toBe("#/invoices");
    expect(screen.getByRole("heading", { name: "請求書一覧" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "INV-2026-0142" })).not.toBeInTheDocument();
    expect(await screen.findByText("請求書を無効化しました")).toBeInTheDocument();
  });

  it("state=void-failure で理由を表示し、再試行できる", async () => {
    const user = userEvent.setup();
    renderAt(`${detailHash}?state=void-failure`);

    const dialog = screen.getByRole("alertdialog", { name: "請求書を無効化" });
    expect(within(dialog).getByText("無効化に失敗しました。時間をおいて再試行してください。")).toBeInTheDocument();

    await user.click(within(dialog).getByRole("button", { name: "無効化する" }));

    expect(window.location.hash).toBe("#/invoices");
    expect(screen.queryByRole("link", { name: "INV-2026-0142" })).not.toBeInTheDocument();
  });

  it("キャンセルすると無効化しない", async () => {
    const user = userEvent.setup();
    renderAt(`${detailHash}?state=void-confirm`);

    const dialog = screen.getByRole("alertdialog", { name: "請求書を無効化" });
    await user.click(within(dialog).getByRole("button", { name: "キャンセル" }));

    expect(screen.getByRole("heading", { name: "INV-2026-0142" })).toBeInTheDocument();
  });
});
