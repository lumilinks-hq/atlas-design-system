import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { App } from "./App";
import { listCustomerSummaries, resetCustomerRecords } from "./fixtures";

afterEach(() => {
  cleanup();
  window.location.hash = "";
  resetCustomerRecords();
});

function renderAt(hash: string) {
  window.location.hash = hash;
  return render(<App />);
}

describe("customer list", () => {
  it("shows the summary columns for every fixture customer", () => {
    renderAt("#/customers");

    const table = screen.getByRole("grid", { name: "顧客一覧" });
    for (const column of ["企業名", "担当者", "最終対応日", "ステータス"]) {
      expect(within(table).getByRole("columnheader", { name: column })).toBeInTheDocument();
    }
    expect(within(table).getAllByRole("row")).toHaveLength(listCustomerSummaries().length + 1);
  });

  it("shows the empty state when no customer is listed", () => {
    renderAt("#/customers?state=empty");

    expect(screen.getByRole("heading", { name: "顧客が登録されていません" })).toBeInTheDocument();
    expect(screen.queryByRole("grid", { name: "顧客一覧" })).not.toBeInTheDocument();
  });

  it("opens the add form from the list heading and reflects the created customer", async () => {
    const user = userEvent.setup();
    renderAt("#/customers");

    await user.click(screen.getByRole("button", { name: "顧客を追加" }));
    expect(screen.getByRole("heading", { name: "顧客を追加" })).toBeInTheDocument();

    await user.type(screen.getByLabelText("会社名"), "株式会社テストベッド");
    await user.type(screen.getByLabelText("担当者名"), "山田 花子");
    await user.type(screen.getByLabelText("メールアドレス"), "hanako.yamada@example.com");
    await user.click(screen.getByRole("button", { name: "追加する" }));

    expect(
      await screen.findByText("「株式会社テストベッド」を追加しました。"),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "株式会社テストベッド" })).toBeInTheDocument();
  });

  it("keeps the add form open and explains why the input is rejected", async () => {
    const user = userEvent.setup();
    renderAt("#/customers?state=create-open");

    await user.type(screen.getByLabelText("メールアドレス"), "hanako.yamada");
    await user.click(screen.getByRole("button", { name: "追加する" }));

    expect(screen.getByText("会社名を入力してください。")).toBeInTheDocument();
    expect(
      screen.getByText("メールアドレスは name@example.com の形式で入力してください。"),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("メールアドレス")).toHaveValue("hanako.yamada");
    expect(listCustomerSummaries()).toHaveLength(4);
  });
});

describe("customer detail", () => {
  it("shows the full information of the selected customer only", () => {
    renderAt("#/customers/customer_northstar");

    expect(screen.getByRole("heading", { name: "株式会社ノーススター" })).toBeInTheDocument();
    expect(screen.getByText("aoi.sato@example.com")).toBeInTheDocument();
    expect(screen.getByText("03-1234-5678")).toBeInTheDocument();
    expect(screen.getByText("次回の定例は9月5日。新しい担当者を紹介予定。")).toBeInTheDocument();
    expect(screen.queryByRole("grid", { name: "顧客一覧" })).not.toBeInTheDocument();
  });

  it("saves the edited customer and reflects it in the detail", async () => {
    const user = userEvent.setup();
    renderAt("#/customers/customer_northstar?state=drawer-open");

    const companyName = screen.getByLabelText("会社名");
    await user.clear(companyName);
    await user.type(companyName, "株式会社ノーススター九州");
    await user.click(screen.getByRole("button", { name: "保存する" }));

    expect(await screen.findByText("変更を保存しました。")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "株式会社ノーススター九州" }),
    ).toBeInTheDocument();
  });

  it("blocks saving while the company name is empty", async () => {
    const user = userEvent.setup();
    renderAt("#/customers/customer_northstar?state=drawer-open");

    await user.clear(screen.getByLabelText("会社名"));
    await user.click(screen.getByRole("button", { name: "保存する" }));

    expect(screen.getByText("会社名を入力してください。")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "顧客情報を編集" })).toBeInTheDocument();
  });

  it("keeps the input and allows retry when saving fails", async () => {
    const user = userEvent.setup();
    renderAt("#/customers/customer_northstar?state=failure");

    expect(screen.getByText("変更を保存できませんでした")).toBeInTheDocument();
    expect(screen.getByLabelText("会社名")).toHaveValue("株式会社ノーススター");

    await user.click(screen.getByRole("button", { name: "保存する" }));
    expect(await screen.findByText("変更を保存しました。")).toBeInTheDocument();
  });

  it("shows the email format error on the pinned invalid-email state", () => {
    renderAt("#/customers/customer_northstar?state=invalid-email");

    expect(
      screen.getByText("メールアドレスは name@example.com の形式で入力してください。"),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("メールアドレス")).toHaveValue("aoi.sato@example");
  });

  it("shows the completion notice on the pinned success state", () => {
    renderAt("#/customers/customer_northstar?state=success");

    expect(screen.getByText("変更を保存しました。")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "顧客情報を編集" })).not.toBeInTheDocument();
  });

  it("disables both actions while saving so the request is not sent twice", () => {
    renderAt("#/customers/customer_northstar?state=loading");

    expect(screen.getByRole("button", { name: /保存中/ })).toBeDisabled();
    expect(screen.getByRole("button", { name: "キャンセル" })).toBeDisabled();
  });

  it("confirms the target and the consequence before deleting", async () => {
    const user = userEvent.setup();
    renderAt("#/customers/customer_northstar?state=delete-confirm");

    expect(screen.getByRole("heading", { name: "顧客を削除" })).toBeInTheDocument();
    expect(
      screen.getByText(
        "「株式会社ノーススター」を削除します。基本情報と対応メモは元に戻せません。",
      ),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "削除する" }));

    expect(await screen.findByText("「株式会社ノーススター」を削除しました。")).toBeInTheDocument();
    expect(window.location.hash).toBe("#/customers");
    expect(screen.queryByRole("link", { name: "株式会社ノーススター" })).not.toBeInTheDocument();
  });
});
