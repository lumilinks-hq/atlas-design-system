import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { App } from "./App";

afterEach(() => {
  cleanup();
  window.location.hash = "";
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
});
