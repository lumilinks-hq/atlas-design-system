import type { InvoiceDetail, InvoiceSummary, VoidInvoiceResult } from "./fixtures";
import { voidInvoice } from "./fixtures";

/** 編集画面で変更できる項目。 */
export type InvoiceEditDraft = {
  customerName: string;
  dueDate: string;
  note: string;
};

export type SaveInvoiceResult = { ok: true; invoice: InvoiceDetail } | { ok: false; reason: string };

const SAVE_LATENCY_MS = 400;
const VOID_LATENCY_MS = 300;

export const SAVE_FAILURE_REASON = "保存に失敗しました。時間をおいて再試行してください。";

/**
 * fixtures.tsは編集の保存先を持たないため、保存済みの変更はこのモジュールで預かる。
 * 一覧と詳細のどちらから読み直しても同じ内容になる。
 */
const savedEdits = new Map<string, InvoiceEditDraft>();

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export function toEditDraft(invoice: InvoiceDetail): InvoiceEditDraft {
  return {
    customerName: invoice.customerName,
    dueDate: invoice.dueDate,
    note: invoice.note,
  };
}

/** 詳細に保存済みの変更を反映する。 */
export function applySavedEdits(invoice: InvoiceDetail): InvoiceDetail {
  const edit = savedEdits.get(invoice.id);
  return edit ? { ...invoice, ...edit } : invoice;
}

/** 一覧の要約に保存済みの変更を反映する。 */
export function applySavedEditsToSummary(summary: InvoiceSummary): InvoiceSummary {
  const edit = savedEdits.get(summary.id);
  return edit ? { ...summary, customerName: edit.customerName } : summary;
}

/** 編集内容を保存する。保存中は呼び出し側で二重送信を防ぐ。 */
export async function saveInvoiceEdits(
  invoice: InvoiceDetail,
  draft: InvoiceEditDraft,
  options: { simulateFailure?: boolean } = {},
): Promise<SaveInvoiceResult> {
  await wait(SAVE_LATENCY_MS);

  if (options.simulateFailure) {
    return { ok: false, reason: SAVE_FAILURE_REASON };
  }

  const normalized: InvoiceEditDraft = {
    customerName: draft.customerName.trim(),
    dueDate: draft.dueDate.trim(),
    note: draft.note.trim(),
  };
  savedEdits.set(invoice.id, normalized);

  return { ok: true, invoice: { ...invoice, ...normalized } };
}

/** 請求書を無効化する。取り消せないため、呼び出し側で確認を挟む。 */
export async function requestVoidInvoice(
  invoiceId: string,
  options: { simulateFailure?: boolean } = {},
): Promise<VoidInvoiceResult> {
  await wait(VOID_LATENCY_MS);
  return voidInvoice(invoiceId, options);
}

export function resetSavedEdits(): void {
  savedEdits.clear();
}
