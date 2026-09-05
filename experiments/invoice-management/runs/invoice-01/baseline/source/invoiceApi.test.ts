import { afterEach, describe, expect, it } from "vitest";
import { getInvoiceDetail, listInvoiceSummaries, resetInvoiceRecords } from "./fixtures";
import {
  SAVE_FAILURE_REASON,
  applySavedEdits,
  applySavedEditsToSummary,
  requestVoidInvoice,
  resetSavedEdits,
  saveInvoiceEdits,
  toEditDraft,
} from "./invoiceApi";

const INVOICE_ID = "invoice_2026_0142";

function detail() {
  const invoice = getInvoiceDetail(INVOICE_ID);
  if (!invoice) throw new Error("fixture not found");
  return invoice;
}

afterEach(() => {
  resetInvoiceRecords();
  resetSavedEdits();
});

describe("saveInvoiceEdits", () => {
  it("stores the trimmed draft and reflects it on the detail and the summary", async () => {
    const invoice = detail();
    const result = await saveInvoiceEdits(invoice, {
      ...toEditDraft(invoice),
      customerName: "  みなも商事株式会社  ",
      dueDate: "2026-10-31",
    });

    expect(result).toEqual({
      ok: true,
      invoice: expect.objectContaining({
        customerName: "みなも商事株式会社",
        dueDate: "2026-10-31",
      }),
    });
    expect(applySavedEdits(detail()).dueDate).toBe("2026-10-31");

    const summary = listInvoiceSummaries().find(({ id }) => id === INVOICE_ID);
    expect(summary && applySavedEditsToSummary(summary).customerName).toBe("みなも商事株式会社");
  });

  it("reports the reason and keeps the stored value untouched on failure", async () => {
    const invoice = detail();
    const result = await saveInvoiceEdits(
      invoice,
      { ...toEditDraft(invoice), note: "変更したメモ" },
      { simulateFailure: true },
    );

    expect(result).toEqual({ ok: false, reason: SAVE_FAILURE_REASON });
    expect(applySavedEdits(detail()).note).toBe(invoice.note);
  });
});

describe("requestVoidInvoice", () => {
  it("removes the invoice from the list", async () => {
    await expect(requestVoidInvoice(INVOICE_ID)).resolves.toEqual({ ok: true });
    expect(listInvoiceSummaries().some(({ id }) => id === INVOICE_ID)).toBe(false);
  });

  it("returns the reason when the invoice is missing", async () => {
    await expect(requestVoidInvoice("unknown")).resolves.toEqual({
      ok: false,
      reason: "対象の請求書が見つかりません。",
    });
  });
});
