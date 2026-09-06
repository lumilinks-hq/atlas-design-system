import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { App } from "./App";
import { createCustomer, listCustomerSummaries, resetCustomerRecords } from "./fixtures";

afterEach(() => {
  cleanup();
  window.location.hash = "";
  resetCustomerRecords();
});

function isDisabled(element: HTMLElement): boolean {
  return element.hasAttribute("disabled") || element.getAttribute("aria-disabled") === "true";
}

describe("account management", () => {
  it("moves from the customer list to an independent detail route", async () => {
    const user = userEvent.setup();
    window.location.hash = "#/customers";
    render(<App />);

    expect(screen.getByRole("heading", { name: "顧客一覧" })).toBeInTheDocument();
    await user.click(screen.getByRole("link", { name: "株式会社ノーススター" }));

    expect(window.location.hash).toBe("#/customers/customer_northstar");
    expect(await screen.findByRole("heading", { name: "株式会社ノーススター" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "顧客一覧へ戻る" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "顧客一覧" })).not.toBeInTheDocument();
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

  it("shows an empty state when no customer is registered", async () => {
    window.location.hash = "#/customers?state=empty";
    render(<App />);

    expect(await screen.findAllByText(/顧客がまだ登録されていません/)).not.toHaveLength(0);
  });

  it("creates a customer from the collection heading and reflects it in the list", async () => {
    const user = userEvent.setup();
    window.location.hash = "#/customers?state=create-open";
    render(<App />);

    const dialog = await screen.findByRole("dialog");
    await user.type(within(dialog).getByLabelText("会社名"), "株式会社テストベッド");
    await user.click(within(dialog).getByRole("button", { name: "保存する" }));

    expect(await screen.findByRole("link", { name: "株式会社テストベッド" })).toBeInTheDocument();
  });

  it("keeps the entered values and shows the reason when adding fails", async () => {
    const user = userEvent.setup();
    window.location.hash = "#/customers?state=failure";
    render(<App />);

    const dialog = await screen.findByRole("dialog");
    await user.type(within(dialog).getByLabelText("会社名"), "株式会社テストベッド");
    await user.click(within(dialog).getByRole("button", { name: "保存する" }));

    expect(await within(dialog).findByText("顧客を追加できませんでした")).toBeInTheDocument();
    expect(within(dialog).getByLabelText("会社名")).toHaveValue("株式会社テストベッド");
  });

  it("blocks a double submit while the edit drawer is saving", async () => {
    window.location.hash = "#/customers/customer_northstar?state=loading";
    render(<App />);

    const save = await screen.findByRole("button", { name: "保存する" });
    expect(isDisabled(save)).toBe(true);
  });

  it("reports an invalid email next to the field", async () => {
    window.location.hash = "#/customers/customer_northstar?state=invalid-email";
    render(<App />);

    expect(await screen.findByText(/name@example.com/)).toBeInTheDocument();
  });

  it("confirms the company name before deleting and returns to the list", async () => {
    const user = userEvent.setup();
    window.location.hash = "#/customers/customer_northstar?state=delete-confirm";
    render(<App />);

    expect(await screen.findByText(/株式会社ノーススターを削除します/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "削除する" }));

    await waitFor(() => expect(window.location.hash).toBe("#/customers"));
    expect(listCustomerSummaries().some(({ id }) => id === "customer_northstar")).toBe(false);
  });
});
