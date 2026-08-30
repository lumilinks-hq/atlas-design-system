import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { App } from "./App";

describe("account management", () => {
  it("renders the customer name", () => {
    render(<App />);
    expect(screen.getByRole("heading", { name: "株式会社ノーススター" })).toBeInTheDocument();
  });
});
