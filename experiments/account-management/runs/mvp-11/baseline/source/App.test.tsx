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

describe("account management", () => {
  it("moves from the customer list to an independent detail route", async () => {
    const user = userEvent.setup();
    window.location.hash = "#/customers";
    render(<App />);

    expect(await screen.findByRole("heading", { name: "顧客一覧" })).toBeInTheDocument();
    await user.click(await screen.findByRole("link", { name: "株式会社ノーススター" }));

    expect(window.location.hash).toBe("#/customers/customer_northstar");
    expect(await screen.findByRole("heading", { name: "株式会社ノーススター" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "顧客一覧へ戻る" })).toBeInTheDocument();
  });

  it("edits a customer and reflects the saved detail", async () => {
    const user = userEvent.setup();
    window.location.hash = "#/customers/customer_hokuto";
    render(<App />);

    expect(await screen.findByRole("heading", { name: "北斗物流株式会社" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "顧客情報を編集" }));
    await user.clear(screen.getByLabelText("会社名"));
    await user.type(screen.getByLabelText("会社名"), "北斗ロジスティクス株式会社");
    await user.clear(screen.getByLabelText("メールアドレス"));
    await user.type(screen.getByLabelText("メールアドレス"), "sales@hokuto-logi.example.com");
    await user.click(screen.getByRole("button", { name: "保存する" }));

    expect(await screen.findByText("顧客情報を更新しました。")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "北斗ロジスティクス株式会社" })).toBeInTheDocument();
    expect(screen.getByText("sales@hokuto-logi.example.com")).toBeInTheDocument();
  });

  it("keeps the edit drawer open when the email is invalid", async () => {
    const user = userEvent.setup();
    window.location.hash = "#/customers/customer_northstar?state=invalid-email";
    render(<App />);

    expect(await screen.findByRole("heading", { name: "株式会社ノーススター" })).toBeInTheDocument();
    expect(screen.getByLabelText("メールアドレス")).toHaveValue("invalid-email");
    await user.click(screen.getByRole("button", { name: "保存する" }));

    expect(screen.getByText("一般的なメール形式で入力してください。")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "顧客情報を編集" })).toBeInTheDocument();
  });

  it("deletes a customer after confirmation and returns to the list", async () => {
    const user = userEvent.setup();
    window.location.hash = "#/customers/customer_nagumo?state=delete-confirm";
    render(<App />);

    expect(await screen.findByRole("heading", { name: "南雲製作所" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "削除の確認" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "削除を実行" }));

    await waitFor(() => expect(window.location.hash).toBe("#/customers?flash=deleted"));
    expect(await screen.findByRole("heading", { name: "顧客一覧" })).toBeInTheDocument();
    expect(screen.getByText("顧客を削除しました。顧客一覧へ戻りました。")).toBeInTheDocument();
  });

  it("shows the empty state when the list is forced empty", async () => {
    window.location.hash = "#/customers?state=empty";
    render(<App />);

    expect(await screen.findByRole("heading", { name: "顧客一覧" })).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "表示できる顧客がありません" })).toBeInTheDocument();
  });
});
