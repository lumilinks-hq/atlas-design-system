import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { App } from "./App";

afterEach(() => {
  cleanup();
  window.location.hash = "";
});

describe("invoice management", () => {
  it("moves from the invoice list to an independent detail route", async () => {
    const user = userEvent.setup();
    window.location.hash = "#/invoices";
    render(<App />);

    expect(screen.getByRole("heading", { name: "請求書一覧" })).toBeInTheDocument();
    await user.click(screen.getByRole("link", { name: "INV-2026-0142" }));

    expect(window.location.hash).toBe("#/invoices/invoice_2026_0142");
    expect(screen.getByRole("heading", { name: "INV-2026-0142" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "請求書一覧へ戻る" })).toBeInTheDocument();
  });
});
