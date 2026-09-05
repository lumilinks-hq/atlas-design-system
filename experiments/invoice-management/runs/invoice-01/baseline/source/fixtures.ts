export type InvoiceStatus = "下書き" | "送付済み" | "入金済み" | "期限超過";

export type InvoiceLineItem = {
  name: string;
  quantity: number;
  unitPrice: number;
};

type InvoiceRecord = {
  id: string;
  invoiceNumber: string;
  customerName: string;
  issuedOn: string;
  dueDate: string;
  amount: number;
  status: InvoiceStatus;
  lineItems: InvoiceLineItem[];
  note: string;
};

export type InvoiceSummary = Pick<
  InvoiceRecord,
  "id" | "invoiceNumber" | "customerName" | "issuedOn" | "amount" | "status"
>;

export type InvoiceDetail = Omit<InvoiceRecord, "issuedOn"> & { issuedOn: string };

const initialInvoiceRecords: InvoiceRecord[] = [
  {
    id: "invoice_2026_0142",
    invoiceNumber: "INV-2026-0142",
    customerName: "有限会社みなも",
    issuedOn: "2026-08-20",
    dueDate: "2026-09-30",
    amount: 482000,
    status: "送付済み",
    lineItems: [
      { name: "月額利用料（スタンダード）", quantity: 4, unitPrice: 98000 },
      { name: "初期設定サポート", quantity: 1, unitPrice: 90000 },
    ],
    note: "先方の締め日は月末。請求書番号を件名に入れる。",
  },
  {
    id: "invoice_2026_0138",
    invoiceNumber: "INV-2026-0138",
    customerName: "東雲テクノ株式会社",
    issuedOn: "2026-08-12",
    dueDate: "2026-09-15",
    amount: 264000,
    status: "入金済み",
    lineItems: [{ name: "月額利用料（ベーシック）", quantity: 6, unitPrice: 44000 }],
    note: "入金確認済み。次回から自動更新。",
  },
  {
    id: "invoice_2026_0131",
    invoiceNumber: "INV-2026-0131",
    customerName: "株式会社ひかり工房",
    issuedOn: "2026-07-25",
    dueDate: "2026-08-25",
    amount: 176000,
    status: "期限超過",
    lineItems: [
      { name: "月額利用料（ベーシック）", quantity: 3, unitPrice: 44000 },
      { name: "追加ストレージ", quantity: 2, unitPrice: 22000 },
    ],
    note: "支払期限を過ぎている。経理部へ再確認する。",
  },
  {
    id: "invoice_2026_0150",
    invoiceNumber: "INV-2026-0150",
    customerName: "若草エンジニアリング株式会社",
    issuedOn: "2026-09-01",
    dueDate: "2026-10-15",
    amount: 638000,
    status: "下書き",
    lineItems: [
      { name: "月額利用料（エンタープライズ）", quantity: 2, unitPrice: 264000 },
      { name: "導入トレーニング", quantity: 1, unitPrice: 110000 },
    ],
    note: "見積内容の最終確認待ち。確定後に発行する。",
  },
];

let invoiceRecords: InvoiceRecord[] = initialInvoiceRecords.map((record) => ({
  ...record,
  lineItems: record.lineItems.map((item) => ({ ...item })),
}));

export function listInvoiceSummaries(): InvoiceSummary[] {
  return invoiceRecords.map(({ id, invoiceNumber, customerName, issuedOn, amount, status }) => ({
    id,
    invoiceNumber,
    customerName,
    issuedOn,
    amount,
    status,
  }));
}

export function getInvoiceDetail(invoiceId: string): InvoiceDetail | undefined {
  const invoice = invoiceRecords.find(({ id }) => id === invoiceId);
  if (!invoice) return undefined;

  return {
    id: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
    customerName: invoice.customerName,
    issuedOn: invoice.issuedOn,
    dueDate: invoice.dueDate,
    amount: invoice.amount,
    status: invoice.status,
    lineItems: invoice.lineItems.map((item) => ({ ...item })),
    note: invoice.note,
  };
}

export type VoidInvoiceResult = { ok: true } | { ok: false; reason: string };

export function voidInvoice(
  invoiceId: string,
  options: { simulateFailure?: boolean } = {},
): VoidInvoiceResult {
  if (options.simulateFailure) {
    return { ok: false, reason: "無効化に失敗しました。時間をおいて再試行してください。" };
  }
  const index = invoiceRecords.findIndex(({ id }) => id === invoiceId);
  if (index < 0) {
    return { ok: false, reason: "対象の請求書が見つかりません。" };
  }
  invoiceRecords.splice(index, 1);
  return { ok: true };
}

export function resetInvoiceRecords(): void {
  invoiceRecords = initialInvoiceRecords.map((record) => ({
    ...record,
    lineItems: record.lineItems.map((item) => ({ ...item })),
  }));
}
