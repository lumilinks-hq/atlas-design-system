import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
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

    expect(screen.getByDisplayValue("41")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "契約席数は現在の利用席数42席以上にしてください。",
    );
  });

  it("blocks contract editing for viewers", () => {
    renderWithState("unauthorized");

    expect(screen.queryByRole("button", { name: "契約を変更" })).not.toBeInTheDocument();
    expect(screen.getByText("CS Viewerは契約を変更できません")).toBeInTheDocument();
  });

  it("updates contract details after a successful save", async () => {
    const user = userEvent.setup();
    renderWithState();

    await user.click(screen.getByRole("button", { name: "契約を変更" }));
    fireEvent.change(screen.getByLabelText("プラン"), { target: { value: "enterprise" } });
    fireEvent.change(screen.getByLabelText("契約席数"), { target: { value: "60" } });
    await user.click(screen.getByRole("button", { name: "保存内容を確認" }));
    await user.click(screen.getByRole("button", { name: "保存する" }));

    await waitFor(() => {
      expect(screen.getByText("契約内容を更新しました")).toBeInTheDocument();
    }, { timeout: 2000 });
    expect(screen.getByText("Enterprise")).toBeInTheDocument();
    expect(screen.getByText("60")).toBeInTheDocument();
    expect(screen.getByText("18")).toBeInTheDocument();
  });
});
