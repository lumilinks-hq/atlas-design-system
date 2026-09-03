import {
  deleteCustomer,
  getCustomerDetail,
  listCustomerSummaries,
  type CustomerDetail,
  type CustomerStatus,
  type CustomerSummary,
  type DeleteCustomerResult,
} from "./fixtures";

/** 保存・削除の通信を模した待ち時間（ミリ秒）。 */
const REQUEST_LATENCY_MS = 300;

export const SAVE_FAILURE_REASON = "保存に失敗しました。時間をおいて再試行してください。";

export type CustomerEditValues = {
  companyName: string;
  contactName: string;
  email: string;
  status: CustomerStatus;
};

export type SaveCustomerResult = { ok: true; customer: CustomerDetail } | { ok: false; reason: string };

/** fixtures.tsは更新を受け付けないため、保存済みの編集内容はこの層で保持する。 */
const savedEdits = new Map<string, CustomerEditValues>();

function delay<T>(value: T): Promise<T> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(value), REQUEST_LATENCY_MS);
  });
}

function mergeSummary(summary: CustomerSummary): CustomerSummary {
  const edit = savedEdits.get(summary.id);
  if (!edit) return summary;

  return {
    ...summary,
    companyName: edit.companyName,
    contactName: edit.contactName,
    status: edit.status,
  };
}

function mergeDetail(detail: CustomerDetail): CustomerDetail {
  const edit = savedEdits.get(detail.id);
  return edit ? { ...detail, ...edit } : detail;
}

/** 一覧向けに要約情報だけを取得する。 */
export function readCustomerSummaries(): CustomerSummary[] {
  return listCustomerSummaries().map(mergeSummary);
}

/** 詳細向けに選択した顧客の完全な情報を取得する。 */
export function readCustomerDetail(customerId: string): CustomerDetail | undefined {
  const detail = getCustomerDetail(customerId);
  return detail ? mergeDetail(detail) : undefined;
}

export function saveCustomer(
  customerId: string,
  values: CustomerEditValues,
  options: { simulateFailure?: boolean } = {},
): Promise<SaveCustomerResult> {
  if (options.simulateFailure) {
    return delay<SaveCustomerResult>({ ok: false, reason: SAVE_FAILURE_REASON });
  }

  const current = getCustomerDetail(customerId);
  if (!current) {
    return delay<SaveCustomerResult>({ ok: false, reason: "対象の顧客が見つかりません。" });
  }

  savedEdits.set(customerId, values);
  return delay<SaveCustomerResult>({ ok: true, customer: mergeDetail(current) });
}

export function removeCustomer(
  customerId: string,
  options: { simulateFailure?: boolean } = {},
): Promise<DeleteCustomerResult> {
  const result = deleteCustomer(customerId, options);
  if (result.ok) savedEdits.delete(customerId);

  return delay(result);
}

/** テストから編集内容を初期化するために使う。 */
export function resetCustomerEdits(): void {
  savedEdits.clear();
}
