import { describe, expect, it } from "vitest";
import { formatAmount, formatDate, statusChipColor, validateDueDate } from "./format";

describe("formatAmount", () => {
  it("formats an amount as Japanese yen", () => {
    expect(formatAmount(482000)).toBe("￥482,000");
  });
});

describe("formatDate", () => {
  it("formats an ISO date", () => {
    expect(formatDate("2026-08-20")).toBe("2026/08/20");
  });

  it("returns the original value when it cannot be read", () => {
    expect(formatDate("来月末")).toBe("来月末");
  });
});

describe("validateDueDate", () => {
  it("accepts a real date", () => {
    expect(validateDueDate("2026-09-30")).toBeNull();
  });

  it("rejects an empty value", () => {
    expect(validateDueDate("  ")).toBe("支払期限を入力してください。");
  });

  it("rejects a value that is not a date", () => {
    expect(validateDueDate("来月末")).toBe(
      "支払期限は2026-09-30のような形式で入力してください。",
    );
  });

  it("rejects a date that does not exist", () => {
    expect(validateDueDate("2026-02-30")).toBe("支払期限に実在する日付を入力してください。");
  });
});

describe("statusChipColor", () => {
  it("maps each status to a colour", () => {
    expect(statusChipColor("入金済み")).toBe("success");
    expect(statusChipColor("期限超過")).toBe("danger");
    expect(statusChipColor("送付済み")).toBe("accent");
    expect(statusChipColor("下書き")).toBe("default");
  });
});
