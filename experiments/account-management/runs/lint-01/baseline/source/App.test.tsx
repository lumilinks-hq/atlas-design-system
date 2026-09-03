import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { App } from "./App";
import { resetCustomerRecords } from "./fixtures";

afterEach(() => {
  cleanup();
  resetCustomerRecords();
  window.location.hash = "";
});

function renderAt(hash: string) {
  window.location.hash = hash;
  render(<App />);
}

describe("account management", () => {
  it("moves from the customer list to an independent detail route", async () => {
    const user = userEvent.setup();
    renderAt("#/customers");

    expect(screen.getByRole("heading", { name: "顧客一覧" })).toBeInTheDocument();
    await user.click(screen.getByRole("link", { name: "株式会社ノーススター" }));

    expect(window.location.hash).toBe("#/customers/customer_northstar");
    expect(screen.getByRole("heading", { name: "株式会社ノーススター" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "顧客一覧へ戻る" })).toBeInTheDocument();
  });

  it("shows the list summary columns for every customer", () => {
    renderAt("#/customers");

    expect(screen.getByRole("columnheader", { name: "企業名" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "担当者" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "最終対応日" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "ステータス" })).toBeInTheDocument();
    expect(screen.getAllByRole("row")).toHaveLength(5); // ヘッダー + 4社
  });

  it("shows the empty state from the empty state query", () => {
    renderAt("#/customers?state=empty");

    expect(screen.getByRole("heading", { name: "顧客がまだありません" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "株式会社ノーススター" })).not.toBeInTheDocument();
  });

  it("shows the full detail of the selected customer", () => {
    renderAt("#/customers/customer_northstar");

    expect(screen.getByText("aoi.sato@example.com")).toBeInTheDocument();
    expect(screen.getByText("03-1234-5678")).toBeInTheDocument();
    expect(screen.getByText("次回の定例は9月5日。新しい担当者を紹介予定。")).toBeInTheDocument();
  });

  it("opens the edit drawer from the drawer-open state query", () => {
    renderAt("#/customers/customer_northstar?state=drawer-open");

    expect(screen.getByRole("heading", { name: "顧客情報を編集" })).toBeInTheDocument();
    expect(screen.getByLabelText("会社名")).toHaveValue("株式会社ノーススター");
  });

  it("keeps the save button busy so the form cannot be submitted twice", () => {
    renderAt("#/customers/customer_northstar?state=loading");

    expect(screen.getByRole("button", { name: "保存中…" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "キャンセル" })).toBeDisabled();
  });

  it("reports an invalid email address and blocks the save", async () => {
    const user = userEvent.setup();
    renderAt("#/customers/customer_northstar?state=invalid-email");

    expect(screen.getByText("メールアドレスは「name@example.com」の形式で入力してください。")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "保存する" }));

    expect(screen.getByRole("heading", { name: "顧客情報を編集" })).toBeInTheDocument();
    expect(screen.queryByText("顧客情報を保存しました。")).not.toBeInTheDocument();
  });

  it("requires a company name", async () => {
    const user = userEvent.setup();
    renderAt("#/customers/customer_northstar?state=drawer-open");

    await user.clear(screen.getByLabelText("会社名"));
    await user.click(screen.getByRole("button", { name: "保存する" }));

    expect(screen.getByText("会社名を入力してください。")).toBeInTheDocument();
  });

  it("applies a successful save to the detail screen", async () => {
    const user = userEvent.setup();
    renderAt("#/customers/customer_northstar?state=drawer-open");

    const companyName = screen.getByLabelText("会社名");
    await user.clear(companyName);
    await user.type(companyName, "ノーススター株式会社");
    await user.click(screen.getByRole("button", { name: "保存する" }));

    expect(await screen.findByRole("heading", { name: "ノーススター株式会社" })).toBeInTheDocument();
    expect(screen.getByText("顧客情報を保存しました。")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "顧客情報を編集" })).not.toBeInTheDocument();
  });

  it("keeps the entered values after a failed save so it can be retried", async () => {
    const user = userEvent.setup();
    renderAt("#/customers/customer_northstar?state=failure");

    expect(screen.getByText("顧客情報を保存できませんでした。")).toBeInTheDocument();
    expect(screen.getByLabelText("会社名")).toHaveValue("株式会社ノーススター");

    await user.click(screen.getByRole("button", { name: "保存する" }));

    expect(await screen.findByText("顧客情報を保存しました。")).toBeInTheDocument();
  });

  it("confirms the company name before deleting and returns to the list", async () => {
    const user = userEvent.setup();
    renderAt("#/customers/customer_northstar?state=delete-confirm");

    expect(screen.getByRole("heading", { name: "この顧客を削除しますか？" })).toBeInTheDocument();
    expect(screen.getByText("「株式会社ノーススター」を削除します。")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "削除する" }));

    expect(await screen.findByText("「株式会社ノーススター」を削除しました。")).toBeInTheDocument();
    expect(window.location.hash).toBe("#/customers");
    expect(screen.queryByRole("link", { name: "株式会社ノーススター" })).not.toBeInTheDocument();
  });

  it("cancels the delete without removing the customer", async () => {
    const user = userEvent.setup();
    renderAt("#/customers/customer_northstar?state=delete-confirm");

    await user.click(screen.getByRole("button", { name: "キャンセル" }));

    await waitFor(() => {
      expect(screen.queryByRole("heading", { name: "この顧客を削除しますか？" })).not.toBeInTheDocument();
    });
    expect(screen.getByRole("heading", { name: "株式会社ノーススター" })).toBeInTheDocument();
  });

  it("returns to the list from the detail screen", async () => {
    const user = userEvent.setup();
    renderAt("#/customers/customer_northstar");

    await user.click(screen.getByRole("link", { name: "顧客一覧へ戻る" }));

    expect(window.location.hash).toBe("#/customers");
    expect(screen.getByRole("heading", { name: "顧客一覧" })).toBeInTheDocument();
  });
});
