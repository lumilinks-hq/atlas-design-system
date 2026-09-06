import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { App } from "./App";
import { createCustomer, listCustomerSummaries, resetCustomerRecords } from "./fixtures";

afterEach(() => {
  cleanup();
  window.location.hash = "";
  resetCustomerRecords();
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

  it("adds a customer and reports the failure reason instead of throwing", () => {
    const before = listCustomerSummaries().length;

    const created = createCustomer({
      companyName: "株式会社テストベッド",
      contactName: "山田 花子",
      email: "hanako.yamada@example.com",
      status: "商談中",
    });
    expect(created.ok).toBe(true);
    if (created.ok) expect(created.customer.companyName).toBe("株式会社テストベッド");
    expect(listCustomerSummaries()).toHaveLength(before + 1);

    const rejected = createCustomer(
      { companyName: "株式会社テストベッド", contactName: "山田 花子", email: "hanako.yamada@example.com", status: "商談中" },
      { simulateFailure: true },
    );
    expect(rejected.ok).toBe(false);
    if (!rejected.ok) expect(rejected.reason.length).toBeGreaterThan(0);
    expect(listCustomerSummaries()).toHaveLength(before + 1);
  });
});
