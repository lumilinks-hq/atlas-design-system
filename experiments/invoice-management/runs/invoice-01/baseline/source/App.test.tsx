import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { App } from "./App";
import { resetInvoiceRecords } from "./fixtures";
import { resetSavedEdits } from "./invoiceApi";

afterEach(() => {
  cleanup();
  window.location.hash = "";
  resetInvoiceRecords();
  resetSavedEdits();
});

function renderAt(hash: string) {
  window.location.hash = hash;
  return { user: userEvent.setup(), ...render(<App />) };
}

describe("invoice list", () => {
  it("moves from the invoice list to an independent detail route", async () => {
    const { user } = renderAt("#/invoices");

    expect(screen.getByRole("heading", { name: "請求書一覧" })).toBeInTheDocument();
    await user.click(screen.getByRole("link", { name: "INV-2026-0142" }));

    expect(window.location.hash).toBe("#/invoices/invoice_2026_0142");
    expect(screen.getByRole("heading", { name: "INV-2026-0142" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "請求書一覧へ戻る" })).toBeInTheDocument();
  });

  it("shows the summary columns for every invoice", () => {
    renderAt("#/invoices");

    const table = screen.getByRole("grid", { name: "請求書一覧" });
    for (const columnName of ["請求書番号", "顧客名", "発行日", "金額", "ステータス"]) {
      expect(within(table).getByRole("columnheader", { name: columnName })).toBeInTheDocument();
    }

    const row = within(table).getByRole("row", { name: /INV-2026-0142/ });
    expect(within(row).getByText("有限会社みなも")).toBeInTheDocument();
    expect(within(row).getByText("2026/08/20")).toBeInTheDocument();
    expect(within(row).getByText("￥482,000")).toBeInTheDocument();
    expect(within(row).getByText("送付済み")).toBeInTheDocument();
  });

  it("shows the empty state when there is no invoice", () => {
    renderAt("#/invoices?state=empty");

    expect(screen.getByRole("heading", { name: "請求書がありません" })).toBeInTheDocument();
    expect(screen.queryByRole("grid", { name: "請求書一覧" })).not.toBeInTheDocument();
  });
});

describe("invoice detail", () => {
  it("shows the full information of the selected invoice", () => {
    renderAt("#/invoices/invoice_2026_0142");

    expect(screen.getByRole("heading", { name: "INV-2026-0142" })).toBeInTheDocument();
    expect(screen.getByText("2026/09/30")).toBeInTheDocument();
    expect(screen.getByText("先方の締め日は月末。請求書番号を件名に入れる。")).toBeInTheDocument();

    const lineItems = screen.getByRole("grid", { name: "請求明細" });
    expect(within(lineItems).getByText("月額利用料（スタンダード）")).toBeInTheDocument();
    expect(within(lineItems).getByText("初期設定サポート")).toBeInTheDocument();
  });

  it("falls back to the list for an unknown invoice", () => {
    renderAt("#/invoices/unknown");

    expect(screen.getByRole("heading", { name: "請求書一覧" })).toBeInTheDocument();
  });
});

describe("invoice edit", () => {
  it("keeps the invalid due date on screen and saves once it is fixed", async () => {
    const { user } = renderAt("#/invoices/invoice_2026_0142");

    await user.click(screen.getByRole("button", { name: "編集" }));

    const dueDate = await screen.findByRole("textbox", { name: "支払期限" });
    await user.clear(dueDate);
    await user.click(screen.getByRole("button", { name: "保存" }));

    expect(await screen.findByText("支払期限を入力してください。")).toBeInTheDocument();
    expect(screen.queryByText("変更を保存しました")).not.toBeInTheDocument();

    await user.type(dueDate, "2026-10-31");
    const customerName = screen.getByRole("textbox", { name: "顧客名" });
    await user.clear(customerName);
    await user.type(customerName, "みなも商事株式会社");
    await user.click(screen.getByRole("button", { name: "保存" }));

    expect(await screen.findByText("変更を保存しました")).toBeInTheDocument();
    expect(screen.getByText("2026/10/31")).toBeInTheDocument();
    expect(screen.getAllByText("みなも商事株式会社").length).toBeGreaterThan(0);
  });

  it("rejects a value that cannot be read as a date", async () => {
    const { user } = renderAt("#/invoices/invoice_2026_0142?state=drawer-open");

    const dueDate = await screen.findByRole("textbox", { name: "支払期限" });
    await user.clear(dueDate);
    await user.type(dueDate, "2026-13-45");
    await user.click(screen.getByRole("button", { name: "保存" }));

    expect(
      await screen.findByText("支払期限に実在する日付を入力してください。"),
    ).toBeInTheDocument();
  });

  it("shows the invalid due date state from the url", async () => {
    renderAt("#/invoices/invoice_2026_0142?state=invalid-due-date");

    expect(await screen.findByText("支払期限を入力してください。")).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "支払期限" })).toHaveValue("");
  });

  it("blocks a second submission while saving", async () => {
    renderAt("#/invoices/invoice_2026_0142?state=loading");

    expect(await screen.findByRole("button", { name: /保存しています/ })).toBeDisabled();
  });

  it("keeps the entered values after a failure and allows a retry", async () => {
    const { user } = renderAt("#/invoices/invoice_2026_0142?state=failure");

    expect(await screen.findByText("保存できませんでした")).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "支払期限" })).toHaveValue("2026-09-30");

    await user.click(screen.getByRole("button", { name: "保存" }));

    expect(await screen.findByText("変更を保存しました")).toBeInTheDocument();
  });

  it("shows the saved state from the url", () => {
    renderAt("#/invoices/invoice_2026_0142?state=success");

    expect(screen.getByText("変更を保存しました")).toBeInTheDocument();
  });
});

describe("invoice void", () => {
  it("confirms the invoice number before voiding and returns to the list", async () => {
    const { user } = renderAt("#/invoices/invoice_2026_0142?state=void-confirm");

    const dialog = await screen.findByRole("alertdialog");
    expect(
      within(dialog).getByRole("heading", { name: "INV-2026-0142を無効化しますか" }),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByText("無効化すると、この請求書は一覧から削除され、元に戻せません。"),
    ).toBeInTheDocument();

    await user.click(within(dialog).getByRole("button", { name: "無効化する" }));

    expect(await screen.findByText("INV-2026-0142を無効化しました")).toBeInTheDocument();
    expect(window.location.hash).toBe("#/invoices");
    expect(screen.queryByRole("link", { name: "INV-2026-0142" })).not.toBeInTheDocument();
  });

  it("opens the confirmation from the detail screen", async () => {
    const { user } = renderAt("#/invoices/invoice_2026_0138");

    await user.click(screen.getByRole("button", { name: "無効化" }));

    expect(await screen.findByRole("alertdialog")).toBeInTheDocument();
  });

  it("shows the reason after a failure and allows a retry", async () => {
    const { user } = renderAt("#/invoices/invoice_2026_0131?state=void-failure");

    const dialog = await screen.findByRole("alertdialog");
    expect(within(dialog).getByText("無効化できませんでした")).toBeInTheDocument();

    await user.click(within(dialog).getByRole("button", { name: "再試行" }));

    expect(await screen.findByText("INV-2026-0131を無効化しました")).toBeInTheDocument();
  });
});
