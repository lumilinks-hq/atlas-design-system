import type { InvoiceStatus } from "./fixtures";

const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

const currencyFormatter = new Intl.NumberFormat("ja-JP", {
  style: "currency",
  currency: "JPY",
});

/** 金額を「¥482,000」の形式にする。 */
export function formatAmount(amount: number): string {
  return currencyFormatter.format(amount);
}

/** ISO形式の日付を「2026/08/20」の形式にする。読み取れない値はそのまま返す。 */
export function formatDate(value: string): string {
  const matched = ISO_DATE_PATTERN.exec(value.trim());
  if (!matched) return value;

  const [, year, month, day] = matched;
  return `${year}/${month}/${day}`;
}

/**
 * 支払期限の入力値を検証する。
 * 未入力、または日付として読み取れない場合にエラー文言を返す。
 */
export function validateDueDate(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return "支払期限を入力してください。";

  const matched = ISO_DATE_PATTERN.exec(trimmed);
  if (!matched) return "支払期限は2026-09-30のような形式で入力してください。";

  const [, year, month, day] = matched;
  const parsed = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  const isRealDate =
    parsed.getUTCFullYear() === Number(year) &&
    parsed.getUTCMonth() === Number(month) - 1 &&
    parsed.getUTCDate() === Number(day);

  if (!isRealDate) return "支払期限に実在する日付を入力してください。";

  return null;
}

/** ステータスに対応するChipの色。 */
export function statusChipColor(status: InvoiceStatus): "default" | "accent" | "success" | "danger" {
  switch (status) {
    case "入金済み":
      return "success";
    case "期限超過":
      return "danger";
    case "送付済み":
      return "accent";
    default:
      return "default";
  }
}
