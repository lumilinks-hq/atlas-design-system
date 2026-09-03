import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { App } from "./App";
import { resetCustomerRecords } from "./fixtures";

beforeEach(() => {
  resetCustomerRecords();
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
  Object.defineProperty(window, "ResizeObserver", {
    writable: true,
    value: class ResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  });
});

afterEach(() => {
  cleanup();
  window.location.hash = "";
});

describe("account management", () => {
  it("moves from the customer list to an independent detail route", async () => {
    const user = userEvent.setup();
    window.location.hash = "#/customers";
    render(<App />);

    expect(await screen.findByRole("heading", { name: "顧客一覧" })).toBeInTheDocument();
    await user.click(await screen.findByRole("link", { name: "株式会社ノーススター" }));

    await waitFor(() => {
      expect(window.location.hash).toBe("#/customers/customer_northstar");
    });

    expect(await screen.findByRole("heading", { name: "株式会社ノーススター" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "顧客一覧へ戻る" })).toBeInTheDocument();
  });

  it("shows the empty state when no customer exists", async () => {
    window.location.hash = "#/customers?state=empty";
    render(<App />);

    expect(await screen.findByText("顧客がまだありません")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "株式会社ノーススター" })).not.toBeInTheDocument();
  });

  it("keeps the input and shows an inline error for an invalid email", async () => {
    const user = userEvent.setup();
    window.location.hash = "#/customers/customer_northstar?state=drawer-open";
    render(<App />);

    const emailInput = await screen.findByLabelText("メールアドレス");
    await user.clear(emailInput);
    await user.type(emailInput, "invalid-email");
    await user.click(screen.getByRole("button", { name: "保存" }));

    expect(await screen.findByText("メールアドレスの形式を確認してください。")).toBeInTheDocument();
    expect(emailInput).toHaveValue("invalid-email");
  });

  it("saves the edited customer and reflects it in the detail screen", async () => {
    const user = userEvent.setup();
    window.location.hash = "#/customers/customer_northstar?state=drawer-open";
    render(<App />);

    const companyNameInput = await screen.findByLabelText("会社名");
    await user.clear(companyNameInput);
    await user.type(companyNameInput, "株式会社ノーススター東日本");
    await user.click(screen.getByRole("button", { name: "保存" }));

    expect(await screen.findByRole("heading", { name: "株式会社ノーススター東日本" })).toBeInTheDocument();
    expect(screen.getByText("顧客情報を保存しました")).toBeInTheDocument();
  });

  it("confirms the company name before deleting and returns to the list", async () => {
    const user = userEvent.setup();
    window.location.hash = "#/customers/customer_hokuto";
    render(<App />);

    expect(await screen.findByRole("heading", { name: "北斗物流株式会社" })).toBeInTheDocument();

    const [deleteTrigger] = screen.getAllByRole("button", { name: "顧客を削除" });
    if (!deleteTrigger) throw new Error("「顧客を削除」が見つかりません。");
    await user.click(deleteTrigger);

    expect(await screen.findByRole("heading", { name: "顧客の削除" })).toBeInTheDocument();
    expect(screen.getByText("北斗物流株式会社を削除します。")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "削除する" }));

    await waitFor(() => {
      expect(window.location.hash).toBe("#/customers");
    });

    expect(await screen.findByRole("heading", { name: "顧客一覧" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "北斗物流株式会社" })).not.toBeInTheDocument();
  });

  it("opens the delete confirmation from the state query", async () => {
    window.location.hash = "#/customers/customer_aoba?state=delete-confirm";
    render(<App />);

    expect(await screen.findByRole("heading", { name: "顧客の削除" })).toBeInTheDocument();
    expect(screen.getByText("青葉商事株式会社を削除します。")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "削除する" })).toBeInTheDocument();
  });

  it("keeps the save failure and a retry path inside the edit drawer", async () => {
    const user = userEvent.setup();
    window.location.hash = "#/customers/customer_nagumo?state=failure";
    render(<App />);

    const companyNameInput = await screen.findByLabelText("会社名");
    await user.click(screen.getByRole("button", { name: "保存" }));

    expect(await screen.findByText("顧客情報を保存できませんでした")).toBeInTheDocument();
    expect(companyNameInput).toHaveValue("南雲製作所 CS支援");

    await user.click(screen.getByRole("button", { name: "保存" }));

    expect(await screen.findByText("顧客情報を保存しました")).toBeInTheDocument();
  });

  it("shows the saved detail information", async () => {
    window.location.hash = "#/customers/customer_northstar";
    render(<App />);

    expect(await screen.findByText("aoi.sato@example.com")).toBeInTheDocument();
    expect(screen.getByText("03-1234-5678")).toBeInTheDocument();
    expect(screen.getByText("次回の定例は9月5日。新しい担当者を紹介予定。")).toBeInTheDocument();
  });

  it("blocks a second submission while saving", async () => {
    window.location.hash = "#/customers/customer_northstar?state=loading";
    render(<App />);

    expect(await screen.findByText("顧客情報を保存しています")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /保存中/ })).toBeDisabled();
  });

  it("reflects the saved values on the detail screen", async () => {
    window.location.hash = "#/customers/customer_northstar?state=success";
    render(<App />);

    expect(await screen.findByText("顧客情報を保存しました")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "株式会社ノーススター CS支援" })).toBeInTheDocument();
  });
});
