import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { App } from "./App";

function renderWithState(state?: string) {
  const url = state ? `/?state=${state}` : "/";
  window.history.replaceState({}, "", url);
  return render(<App />);
}

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("account management", () => {
  it("renders the customer name and seat metrics", () => {
    renderWithState();

    expect(screen.getByRole("heading", { name: "株式会社ノーススター" })).toBeInTheDocument();
    expect(screen.getByText("契約席数")).toBeInTheDocument();
    expect(screen.getByText("利用席数")).toBeInTheDocument();
    expect(screen.getByText("残り席数")).toBeInTheDocument();
  });

  it("shows the invalid seat count state from query", () => {
    renderWithState("invalid-seat-count");

    expect(screen.getByRole("textbox", { name: /契約席数/ })).toHaveValue("41");
    expect(screen.getByRole("textbox", { name: /契約席数/ })).toHaveAttribute("aria-invalid", "true");
  });

  it("blocks contract editing for viewers", () => {
    renderWithState("unauthorized");

    expect(screen.queryByRole("button", { name: "契約を変更" })).not.toBeInTheDocument();
    expect(screen.getByText("CS Viewerは契約を変更できません")).toBeInTheDocument();
  });

  it("renders the success state from query with updated contract details", () => {
    renderWithState("success");

    expect(screen.getByText("契約内容を更新しました")).toBeInTheDocument();
    expect(screen.getByText("60")).toBeInTheDocument();
    expect(screen.getByText("18")).toBeInTheDocument();
  });

  it("opens a confirmation dialog before saving contract changes", async () => {
    const user = userEvent.setup();
    renderWithState("drawer-open");

    await user.click(screen.getByRole("button", { name: "保存内容を確認" }));

    const dialog = screen.getByRole("alertdialog", { name: "契約変更を確定しますか" });

    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getByText("Business → Business")).toBeInTheDocument();
    expect(within(dialog).getByText("50席 → 50席")).toBeInTheDocument();
  });
});
