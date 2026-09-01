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
    expect(screen.getByRole("link", { name: "顧客一覧に戻る" })).toBeInTheDocument();
  });

  it("edits a customer and reflects the saved values in detail", async () => {
    const user = userEvent.setup();
    window.location.hash = "#/customers/customer_northstar";
    render(<App />);

    expect(await screen.findByRole("heading", { name: "株式会社ノーススター" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "顧客を編集" }));
    await user.clear(screen.getByLabelText("会社名"));
    await user.type(screen.getByLabelText("会社名"), "株式会社ノーススター更新");
    await user.clear(screen.getByLabelText("メールアドレス"));
    await user.type(screen.getByLabelText("メールアドレス"), "renewed@example.com");
    await user.click(screen.getByRole("button", { name: "保存" }));

    expect(await screen.findByText("顧客情報を更新しました")).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "株式会社ノーススター更新" })).toBeInTheDocument();
    expect(screen.getByText("renewed@example.com")).toBeInTheDocument();
  });

  it("confirms deletion, removes the customer, and returns to the list", async () => {
    const user = userEvent.setup();
    window.location.hash = "#/customers/customer_hokuto";
    render(<App />);

    expect(await screen.findByRole("heading", { name: "北斗物流株式会社" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "顧客を削除" }));
    expect(await screen.findByRole("heading", { name: "顧客の削除" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "削除する" }));

    await waitFor(() => {
      expect(window.location.hash).toBe("#/customers");
    });

    expect(await screen.findByRole("heading", { name: "顧客一覧" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "北斗物流株式会社" })).not.toBeInTheDocument();
  });
});
