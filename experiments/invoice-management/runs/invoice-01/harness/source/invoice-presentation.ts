import type { InvoiceLineItem } from "./fixtures";

/** URL の state クエリで指定できる画面状態。切り替え専用のUIは画面へ出さない */
export type ScreenState =
  | "default"
  | "empty"
  | "drawer-open"
  | "invalid-due-date"
  | "loading"
  | "success"
  | "failure"
  | "void-confirm"
  | "void-failure";

const screenStates: ScreenState[] = [
  "default",
  "empty",
  "drawer-open",
  "invalid-due-date",
  "loading",
  "success",
  "failure",
  "void-confirm",
  "void-failure",
];

export function readScreenState(value: string | null): ScreenState {
  const found = screenStates.find((state) => state === value);
  return found ?? "default";
}

/** 編集Drawerを開いた状態で表示する画面状態 */
export function isDrawerState(state: ScreenState): boolean {
  return state === "drawer-open" || state === "invalid-due-date" || state === "loading" || state === "failure";
}

export const invoiceListPath = "/invoices";

export function invoiceDetailPath(invoiceId: string): string {
  return `${invoiceListPath}/${invoiceId}`;
}

/** HashRouter 前提のため、実アンカーの href はハッシュ付きで組み立てる */
export function hashHref(path: string): string {
  return `#${path}`;
}

const amountFormatter = new Intl.NumberFormat("ja-JP", {
  style: "currency",
  currency: "JPY",
  currencyDisplay: "symbol",
});

export function formatAmount(amount: number): string {
  return amountFormatter.format(amount);
}

export function formatDate(value: string): string {
  const [year, month, day] = value.split("-");
  if (!year || !month || !day) return value;
  return `${year}/${month}/${day}`;
}

export function formatQuantity(quantity: number): string {
  return `${quantity.toLocaleString("ja-JP")}個`;
}

export function formatLineItem(item: InvoiceLineItem): string {
  return `${formatQuantity(item.quantity)} × ${formatAmount(item.unitPrice)}`;
}

/**
 * 一覧表の列定義。example.invoice-management の component.table 契約が正本で、
 * Table.Header と Table.Row は同じ定義を参照する。
 */
export type InvoiceColumnId = "invoiceNumber" | "customerName" | "issuedOn" | "amount" | "status";

export type InvoiceColumn = {
  id: InvoiceColumnId;
  label: string;
  width: string;
  minWidth: number;
  align: "start" | "end";
  isRowHeader: boolean;
  tabular: boolean;
};

export const invoiceColumns: InvoiceColumn[] = [
  { id: "invoiceNumber", label: "請求書番号", width: "24%", minWidth: 176, align: "start", isRowHeader: true, tabular: false },
  { id: "customerName", label: "顧客名", width: "26%", minWidth: 192, align: "start", isRowHeader: false, tabular: false },
  { id: "issuedOn", label: "発行日", width: "16%", minWidth: 128, align: "end", isRowHeader: false, tabular: true },
  { id: "amount", label: "金額", width: "16%", minWidth: 128, align: "end", isRowHeader: false, tabular: true },
  { id: "status", label: "ステータス", width: "18%", minWidth: 128, align: "start", isRowHeader: false, tabular: false },
];

export function findColumn(id: InvoiceColumnId): InvoiceColumn {
  const column = invoiceColumns.find((candidate) => candidate.id === id);
  if (!column) throw new Error(`未定義の列です: ${id}`);
  return column;
}

export function columnClassName(id: InvoiceColumnId): string {
  const column = findColumn(id);
  return [column.align === "end" ? "text-end" : "text-start", column.tabular ? "table-cell--numeric" : ""]
    .filter(Boolean)
    .join(" ");
}

export function columnStyle(id: InvoiceColumnId): { width: string; minWidth: string } {
  const column = findColumn(id);
  return { width: column.width, minWidth: `${column.minWidth}px` };
}

export type InvoiceDraft = {
  customerName: string;
  dueDate: string;
  note: string;
};

export type DraftErrors = {
  customerName?: string;
  dueDate?: string;
};

const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/;

export function validateDraft(draft: InvoiceDraft): DraftErrors {
  const errors: DraftErrors = {};
  if (!draft.customerName.trim()) {
    errors.customerName = "顧客名を入力してください。";
  }
  const dueDate = draft.dueDate.trim();
  if (!dueDate) {
    errors.dueDate = "支払期限を入力してください。";
  } else if (!isoDatePattern.test(dueDate) || Number.isNaN(Date.parse(dueDate))) {
    errors.dueDate = "支払期限は日付として入力してください。例: 2026-09-30";
  }
  return errors;
}

export function hasDraftErrors(errors: DraftErrors): boolean {
  return Boolean(errors.customerName || errors.dueDate);
}
