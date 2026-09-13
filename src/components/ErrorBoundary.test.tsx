import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ErrorBoundary } from "./ErrorBoundary";

function Thrower(): never {
  throw new Error("壊れました");
}

afterEach(cleanup);

describe("ErrorBoundary", () => {
  it("renders children when nothing throws", () => {
    render(<MemoryRouter><ErrorBoundary><p>正常</p></ErrorBoundary></MemoryRouter>);
    expect(screen.getByText("正常")).toBeInTheDocument();
  });

  it("shows the error message, a reload button and a link to the top", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    render(<MemoryRouter><ErrorBoundary><Thrower /></ErrorBoundary></MemoryRouter>);
    expect(screen.getByRole("heading", { level: 1, name: "表示中にエラーが発生しました" })).toBeInTheDocument();
    expect(screen.getByText("壊れました")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "再読み込み" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "トップへ戻る" })).toHaveAttribute("href", "/");
    spy.mockRestore();
  });
});
