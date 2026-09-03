import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { App } from "./App";
import { resetCustomerEdits } from "./customerStore";
import { resetCustomerRecords } from "./fixtures";

function renderAt(hash: string) {
  window.location.hash = hash;
  return render(<App />);
}

beforeEach(() => {
  resetCustomerRecords();
  resetCustomerEdits();
});

afterEach(() => {
  cleanup();
  window.location.hash = "";
  resetCustomerRecords();
  resetCustomerEdits();
});

describe("顧客一覧", () => {
  it("要約情報の列を表示する", () => {
    renderAt("#/customers");

    const table = screen.getByRole("grid", { name: "顧客" });
    expect(within(table).getByRole("columnheader", { name: "企業名" })).toBeInTheDocument();
    expect(within(table).getByRole("columnheader", { name: "担当者" })).toBeInTheDocument();
    expect(within(table).getByRole("columnheader", { name: "最終対応日" })).toBeInTheDocument();
    expect(within(table).getByRole("columnheader", { name: "ステータス" })).toBeInTheDocument();
    expect(within(table).getByText("2026-08-28")).toBeInTheDocument();
  });

  it("顧客が0件のときは空状態を表示する", () => {
    renderAt("#/customers?state=empty");

    expect(screen.getAllByText("顧客がまだ登録されていません。").length).toBeGreaterThan(0);
    expect(screen.queryByRole("link", { name: "株式会社ノーススター" })).not.toBeInTheDocument();
  });

  it("狭幅用の一覧からも詳細へLinkで移動できる", () => {
    renderAt("#/customers");

    const link = screen.getByRole("link", { name: "株式会社ノーススターの詳細を開く" });
    expect(link).toHaveAttribute("href", "#/customers/customer_northstar");
  });
});

describe("顧客詳細", () => {
  it("完全な情報を表示する", () => {
    renderAt("#/customers/customer_northstar");

    expect(screen.getByRole("heading", { level: 1, name: "株式会社ノーススター" })).toBeInTheDocument();
    expect(screen.getByText("aoi.sato@example.com")).toBeInTheDocument();
    expect(screen.getByText("03-1234-5678")).toBeInTheDocument();
    expect(screen.getByText("次回の定例は9月5日。新しい担当者を紹介予定。")).toBeInTheDocument();
  });

  it("存在しない顧客は一覧へ戻す", () => {
    renderAt("#/customers/customer_unknown");

    expect(screen.getByRole("heading", { name: "顧客一覧" })).toBeInTheDocument();
  });
});

describe("顧客情報の編集", () => {
  it("保存に成功すると詳細と一覧へ反映する", async () => {
    const user = userEvent.setup();
    renderAt("#/customers/customer_northstar?state=drawer-open");

    const companyNameInput = screen.getByLabelText("会社名");
    await user.clear(companyNameInput);
    await user.type(companyNameInput, "株式会社ノーススター・ホールディングス");
    await user.click(screen.getByRole("button", { name: "保存" }));

    expect(
      await screen.findByRole("heading", { level: 1, name: "株式会社ノーススター・ホールディングス" }),
    ).toBeInTheDocument();
    expect(screen.getByText("顧客情報を保存しました")).toBeInTheDocument();

    await user.click(screen.getByRole("link", { name: "顧客一覧へ戻る" }));
    expect(
      screen.getByRole("link", { name: "株式会社ノーススター・ホールディングス" }),
    ).toBeInTheDocument();
  });

  it("会社名が空のままでは保存しない", async () => {
    const user = userEvent.setup();
    renderAt("#/customers/customer_northstar?state=drawer-open");

    await user.clear(screen.getByLabelText("会社名"));
    await user.click(screen.getByRole("button", { name: "保存" }));

    expect(await screen.findByText("会社名を入力してください。")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "保存" })).toBeInTheDocument();
  });

  it("メールアドレスの形式が正しくないときは理由を示す", async () => {
    const user = userEvent.setup();
    renderAt("#/customers/customer_northstar?state=invalid-email");

    expect(screen.getByLabelText("メールアドレス")).toHaveValue("aoi.sato@example");
    expect(screen.getByText("メールアドレスの形式が正しくありません。")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "保存" }));
    expect(screen.getByText("メールアドレスの形式が正しくありません。")).toBeInTheDocument();
  });

  it("保存中は二重送信できない", () => {
    renderAt("#/customers/customer_northstar?state=loading");

    expect(screen.getByRole("button", { name: "保存中" })).toBeDisabled();
  });

  it("保存に失敗しても入力を保持して再試行できる", async () => {
    const user = userEvent.setup();
    renderAt("#/customers/customer_northstar?state=failure");

    expect(screen.getByText("保存できませんでした")).toBeInTheDocument();
    expect(screen.getByLabelText("会社名")).toHaveValue("株式会社ノーススター");

    await user.click(screen.getByRole("button", { name: "保存" }));
    expect(await screen.findByText("顧客情報を保存しました")).toBeInTheDocument();
  });
});

describe("顧客の削除", () => {
  it("確認画面で会社名と取り消せないことを示してから削除する", async () => {
    const user = userEvent.setup();
    renderAt("#/customers/customer_northstar?state=delete-confirm");

    const dialog = screen.getByRole("alertdialog", { name: "顧客の削除" });
    expect(within(dialog).getByText("株式会社ノーススターを削除します。")).toBeInTheDocument();
    expect(within(dialog).getByText("削除した顧客情報は元に戻せません。")).toBeInTheDocument();

    await user.click(within(dialog).getByRole("button", { name: "削除する" }));

    expect(window.location.hash).toBe("#/customers");
    expect(await screen.findByText("顧客を削除しました")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "株式会社ノーススター" })).not.toBeInTheDocument();
  });

  it("削除に失敗したら理由を示して再試行できる", async () => {
    const user = userEvent.setup();
    renderAt("#/customers/customer_northstar?state=delete-failure");

    const dialog = screen.getByRole("alertdialog", { name: "顧客の削除" });
    await user.click(within(dialog).getByRole("button", { name: "削除する" }));

    expect(
      within(dialog).getByText("削除に失敗しました。時間をおいて再試行してください。"),
    ).toBeInTheDocument();

    await user.click(within(dialog).getByRole("button", { name: "削除する" }));
    expect(window.location.hash).toBe("#/customers");
  });
});
