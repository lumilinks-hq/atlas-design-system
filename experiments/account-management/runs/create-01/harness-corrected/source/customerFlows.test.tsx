import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { App } from "./App";
import { resetCustomerRecords } from "./fixtures";

afterEach(() => { cleanup(); window.location.hash = ""; resetCustomerRecords(); });

function go(hash: string) {
  window.location.hash = hash;
  render(<App />);
}

function firstAlertDialog(): HTMLElement {
  const [dialog] = screen.getAllByRole("alertdialog");
  if (!dialog) throw new Error("alertdialog が見つかりません");
  return dialog;
}

describe("required states", () => {
  it("default", () => {
    go("#/customers?state=default");
    expect(screen.getByRole("heading", { name: "顧客一覧" })).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "株式会社ノーススター" }).length).toBe(1);
  });
  it("empty", () => {
    go("#/customers?state=empty");
    expect(screen.getAllByText(/登録されている顧客はありません/).length).toBeGreaterThan(0);
  });
  it("create-open", () => {
    go("#/customers?state=create-open");
    expect(screen.getByRole("heading", { name: "顧客の追加" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "保存する" })).toBeEnabled();
  });
  it("drawer-open", () => {
    go("#/customers/customer_northstar?state=drawer-open");
    expect(screen.getByRole("heading", { name: "顧客の編集" })).toBeInTheDocument();
    expect(screen.getByLabelText("会社名")).toHaveValue("株式会社ノーススター");
  });
  it("invalid-email", () => {
    go("#/customers/customer_northstar?state=invalid-email");
    expect(screen.getByText(/name@example.com の形式/)).toBeInTheDocument();
  });
  it("loading", () => {
    go("#/customers/customer_northstar?state=loading");
    expect(screen.getByRole("button", { name: "保存する" })).toBeDisabled();
  });
  it("success", async () => {
    go("#/customers/customer_northstar?state=success");
    expect((await screen.findAllByText("顧客を保存しました")).length).toBeGreaterThan(0);
  });
  it("failure", () => {
    go("#/customers/customer_northstar?state=failure");
    expect(screen.getByText("保存できませんでした")).toBeInTheDocument();
    expect(screen.getByText(/顧客の保存に失敗しました/)).toBeInTheDocument();
  });
  it("delete-confirm", () => {
    go("#/customers/customer_northstar?state=delete-confirm");
    const dialog = firstAlertDialog();
    expect(within(dialog).getByText("株式会社ノーススター")).toBeInTheDocument();
    expect(within(dialog).getByText(/取り消せません/)).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "削除する" })).toBeInTheDocument();
  });
});

describe("customer flows", () => {
  it("keeps the input and shows the reason when the company name is missing", async () => {
    const user = userEvent.setup();
    go("#/customers?state=create-open");
    await user.type(screen.getByLabelText("メールアドレス"), "nagi.suzuki@example.com");
    await user.click(screen.getByRole("button", { name: "保存する" }));
    expect(screen.getByText("会社名を入力してください。")).toBeInTheDocument();
    expect(screen.getByLabelText("メールアドレス")).toHaveValue("nagi.suzuki@example.com");
  });

  it("adds a customer, notifies completion and reflects it in the list", async () => {
    const user = userEvent.setup();
    go("#/customers?state=create-open");
    await user.type(screen.getByLabelText("会社名"), "五月商会株式会社");
    await user.type(screen.getByLabelText("担当者名"), "山本 環");
    await user.type(screen.getByLabelText("メールアドレス"), "tamaki.yamamoto@example.com");
    await user.click(screen.getByRole("button", { name: "保存する" }));
    expect(await screen.findByRole("link", { name: "五月商会株式会社" })).toBeInTheDocument();
    expect((await screen.findAllByText("顧客を保存しました")).length).toBeGreaterThan(0);
  });

  it("keeps the input inside the drawer when adding fails", async () => {
    const user = userEvent.setup();
    go("#/customers?state=failure");
    await user.clear(screen.getByLabelText("会社名"));
    await user.type(screen.getByLabelText("会社名"), "五月商会株式会社");
    await user.type(screen.getByLabelText("メールアドレス"), "tamaki.yamamoto@example.com");
    await user.click(screen.getByRole("button", { name: "保存する" }));
    expect(await screen.findByText(/顧客の追加に失敗しました/)).toBeInTheDocument();
    expect(screen.getByLabelText("会社名")).toHaveValue("五月商会株式会社");
  });

  it("reflects the edited value on the detail screen", async () => {
    const user = userEvent.setup();
    go("#/customers/customer_northstar?state=drawer-open");
    await user.clear(screen.getByLabelText("担当者名"));
    await user.type(screen.getByLabelText("担当者名"), "高橋 陸");
    await user.click(screen.getByRole("button", { name: "保存する" }));
    await waitFor(() => expect(screen.queryByRole("heading", { name: "顧客の編集" })).not.toBeInTheDocument());
    expect(screen.getByText("高橋 陸")).toBeInTheDocument();
  });

  it("deletes the customer and returns to the list", async () => {
    const user = userEvent.setup();
    go("#/customers/customer_northstar?state=delete-confirm");
    const dialog = firstAlertDialog();
    await user.click(within(dialog).getByRole("button", { name: "削除する" }));
    await waitFor(() => expect(window.location.hash).toBe("#/customers"));
    expect(screen.queryByRole("link", { name: "株式会社ノーススター" })).not.toBeInTheDocument();
    expect((await screen.findAllByText("顧客を削除しました")).length).toBeGreaterThan(0);
  });
});
