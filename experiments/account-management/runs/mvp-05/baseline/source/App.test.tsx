import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "./App";

function setLocationState(state: string) {
  window.history.replaceState({}, "", `/?state=${state}`);
}

describe("account management", () => {
  beforeEach(() => {
    window.history.replaceState({}, "", "/?state=default");
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("renders the customer contract overview", () => {
    render(<App />);

    expect(screen.getByRole("heading", { name: "株式会社ノーススター" })).toBeInTheDocument();
    expect(screen.getByText("Business")).toBeInTheDocument();
    expect(screen.getByText("50")).toBeInTheDocument();
    expect(screen.getByText("42")).toBeInTheDocument();
    expect(screen.getByText("8")).toBeInTheDocument();
  });

  it("blocks contract editing for viewers", () => {
    setLocationState("unauthorized");
    render(<App />);

    expect(screen.getByText("CS Viewerは閲覧のみ可能です。契約変更はCS Manager権限が必要です。")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "契約変更" })).toBeDisabled();
  });

  it("shows the invalid seat validation state", () => {
    setLocationState("invalid-seat-count");
    render(<App />);

    expect(screen.getByTestId("contract-drawer")).toBeInTheDocument();
    expect(screen.getByText("契約席数は利用席数の42以上で設定してください。")).toBeInTheDocument();
  });

  it("renders loading and prevents duplicate submit", () => {
    setLocationState("loading");
    render(<App />);

    expect(screen.getByText("変更を保存しています。")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /保存する/ })).toBeDisabled();
  });

  it("updates contract values after a successful save", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "契約変更" }));
    await user.click(screen.getByRole("radio", { name: "Enterprise" }));
    await user.clear(screen.getByLabelText("契約席数"));
    await user.type(screen.getByLabelText("契約席数"), "60");
    await user.click(screen.getByRole("button", { name: "変更内容を確認" }));
    await user.click(screen.getByRole("button", { name: "保存する" }));

    expect(await screen.findByText("契約内容を更新しました。")).toBeInTheDocument();

    const overviewCard = screen.getByRole("heading", { name: "契約と利用状況" }).closest("[data-slot='card']");
    expect(overviewCard).not.toBeNull();
    expect(within(overviewCard as HTMLElement).getByText("60")).toBeInTheDocument();
    expect(within(overviewCard as HTMLElement).getByText("18")).toBeInTheDocument();
  });

  it("keeps draft values after a failed save", () => {
    setLocationState("failure");
    render(<App />);

    expect(screen.getByText("保存に失敗しました。内容を保持したまま再試行できます。")).toBeInTheDocument();
    expect(screen.getByDisplayValue("60")).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Enterprise" })).toHaveAttribute("aria-checked", "true");
  });
});
