import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { App } from "./App";
import { resetCustomerEdits } from "./customerApi";
import { resetCustomerRecords } from "./fixtures";

afterEach(() => {
  cleanup();
  window.location.hash = "";
  resetCustomerRecords();
  resetCustomerEdits();
});

describe("account management", () => {
  it("moves from the customer list to an independent detail route", async () => {
    const user = userEvent.setup();
    window.location.hash = "#/customers";
    render(<App />);

    expect(screen.getByRole("heading", { name: "顧客一覧" })).toBeInTheDocument();
    await user.click(screen.getByRole("link", { name: "株式会社ノーススター" }));

    expect(window.location.hash).toBe("#/customers/customer_northstar");
    expect(screen.getByRole("heading", { name: "株式会社ノーススター" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "顧客一覧へ戻る" })).toBeInTheDocument();
  });

  it("shows the summary columns on the list and the full information on the detail", async () => {
    const user = userEvent.setup();
    window.location.hash = "#/customers";
    render(<App />);

    expect(screen.getByRole("columnheader", { name: "最終対応日" })).toBeInTheDocument();
    expect(screen.getByText("2026/08/28")).toBeInTheDocument();
    // 一覧にはメールアドレスなどの詳細情報を出さない。
    expect(screen.queryByText("aoi.sato@example.com")).not.toBeInTheDocument();

    await user.click(screen.getByRole("link", { name: "株式会社ノーススター" }));

    expect(screen.getByText("aoi.sato@example.com")).toBeInTheDocument();
    expect(screen.getByText("03-1234-5678")).toBeInTheDocument();
    expect(screen.getByText("次回の定例は9月5日。新しい担当者を紹介予定。")).toBeInTheDocument();
  });

  it("returns to the list from the detail", async () => {
    const user = userEvent.setup();
    window.location.hash = "#/customers/customer_hokuto";
    render(<App />);

    await user.click(screen.getByRole("link", { name: "顧客一覧へ戻る" }));

    expect(window.location.hash).toBe("#/customers");
    expect(screen.getByRole("heading", { name: "顧客一覧" })).toBeInTheDocument();
  });

  it("shows the empty state when there is no customer", () => {
    window.location.hash = "#/customers?state=empty";
    render(<App />);

    expect(screen.getByRole("heading", { name: "顧客が登録されていません" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "株式会社ノーススター" })).not.toBeInTheDocument();
  });

  it("saves the edited customer and reflects it on the detail", async () => {
    const user = userEvent.setup();
    window.location.hash = "#/customers/customer_northstar";
    render(<App />);

    await user.click(screen.getByRole("button", { name: "編集" }));

    const companyNameField = await screen.findByRole("textbox", { name: "会社名" });
    await user.clear(companyNameField);
    await user.type(companyNameField, "ノーススター株式会社");
    await user.click(screen.getByRole("button", { name: "保存" }));

    expect(await screen.findByRole("heading", { name: "ノーススター株式会社" })).toBeInTheDocument();
    expect(screen.getByText("顧客情報を保存しました。")).toBeInTheDocument();
    expect(screen.queryByRole("textbox", { name: "会社名" })).not.toBeInTheDocument();
  });

  it("requires a company name before saving", async () => {
    const user = userEvent.setup();
    window.location.hash = "#/customers/customer_northstar?state=drawer-open";
    render(<App />);

    const companyNameField = await screen.findByRole("textbox", { name: "会社名" });
    await user.clear(companyNameField);
    await user.click(screen.getByRole("button", { name: "保存" }));

    expect(await screen.findByText("会社名を入力してください。")).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "会社名" })).toBeInTheDocument();
  });

  it("shows the invalid email state from the url and recovers after a fix", async () => {
    const user = userEvent.setup();
    window.location.hash = "#/customers/customer_northstar?state=invalid-email";
    render(<App />);

    expect(
      await screen.findByText("メールアドレスは name@example.com の形式で入力してください。"),
    ).toBeInTheDocument();

    const emailField = screen.getByRole("textbox", { name: "メールアドレス" });
    await user.clear(emailField);
    await user.type(emailField, "aoi.sato@example.com");
    await user.click(screen.getByRole("button", { name: "保存" }));

    expect(await screen.findByText("顧客情報を保存しました。")).toBeInTheDocument();
  });

  it("blocks a second submit while saving", async () => {
    window.location.hash = "#/customers/customer_northstar?state=loading";
    render(<App />);

    expect(await screen.findByRole("button", { name: "保存中" })).toBeDisabled();
  });

  it("shows the save success and failure states from the url", async () => {
    window.location.hash = "#/customers/customer_northstar?state=success";
    const successView = render(<App />);
    expect(screen.getByText("顧客情報を保存しました。")).toBeInTheDocument();
    successView.unmount();

    window.location.hash = "#/customers/customer_northstar?state=failure";
    render(<App />);

    expect(await screen.findByText("保存に失敗しました。時間をおいて再試行してください。")).toBeInTheDocument();
    // 入力内容は保持したまま再試行できる。
    expect(screen.getByRole("textbox", { name: "会社名" })).toHaveValue("株式会社ノーススター");
    expect(screen.getByRole("button", { name: "保存" })).toBeEnabled();
  });

  it("confirms the company name before deleting and returns to the list", async () => {
    const user = userEvent.setup();
    window.location.hash = "#/customers/customer_northstar";
    render(<App />);

    await user.click(screen.getByRole("button", { name: "削除" }));

    expect(
      await screen.findByRole("heading", { name: "「株式会社ノーススター」を削除しますか？" }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "削除する" }));

    expect(await screen.findByRole("heading", { name: "顧客一覧" })).toBeInTheDocument();
    expect(screen.getByText("「株式会社ノーススター」を削除しました")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "株式会社ノーススター" })).not.toBeInTheDocument();
  });

  it("keeps the delete confirmation open when deleting fails and allows a retry", async () => {
    const user = userEvent.setup();
    window.location.hash = "#/customers/customer_northstar?state=delete-failure";
    render(<App />);

    expect(await screen.findByText("削除に失敗しました。時間をおいて再試行してください。")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "再試行" }));

    expect(await screen.findByRole("heading", { name: "顧客一覧" })).toBeInTheDocument();
    expect(screen.getByText("「株式会社ノーススター」を削除しました")).toBeInTheDocument();
  });

  it("opens the delete confirmation from the url", async () => {
    window.location.hash = "#/customers/customer_aoba?state=delete-confirm";
    render(<App />);

    expect(await screen.findByRole("heading", { name: "「青葉商事株式会社」を削除しますか？" })).toBeInTheDocument();
  });
});
