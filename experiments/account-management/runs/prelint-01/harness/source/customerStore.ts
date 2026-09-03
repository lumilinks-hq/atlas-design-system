import { useMemo, useSyncExternalStore } from "react";
import {
  deleteCustomer,
  getCustomerDetail,
  listCustomerSummaries,
  type CustomerDetail,
  type CustomerStatus,
  type CustomerSummary,
  type DeleteCustomerResult,
} from "./fixtures";

/** 編集Drawerで変更できる項目。 */
export type CustomerEditInput = {
  companyName: string;
  contactName: string;
  email: string;
  status: CustomerStatus;
};

export type SaveCustomerResult = { ok: true } | { ok: false; reason: string };

export const CUSTOMER_STATUSES: CustomerStatus[] = ["商談中", "利用中", "休眠"];

export const SAVE_FAILURE_REASON =
  "保存に失敗しました。通信状況を確認してから、もう一度保存してください。";

const CUSTOMER_NOT_FOUND_REASON = "対象の顧客が見つかりません。";

const SAVE_LATENCY_MS = 400;

/**
 * `src/fixtures.ts`は取得と削除だけを担うため、保存した変更はここで保持する。
 * fixturesの責務を変えずに、保存結果を一覧と詳細の両方へ反映する。
 */
const savedEdits = new Map<string, CustomerEditInput>();
const listeners = new Set<() => void>();
let revision = 0;

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getRevision(): number {
  return revision;
}

function publish(): void {
  revision += 1;
  for (const listener of listeners) listener();
}

/** 一覧用の読み取りモデル。詳細だけの項目は返さない。 */
export function fetchCustomerSummaries(): CustomerSummary[] {
  return listCustomerSummaries().map((summary) => {
    const edit = savedEdits.get(summary.id);
    if (!edit) return summary;
    return {
      ...summary,
      companyName: edit.companyName,
      contactName: edit.contactName,
      status: edit.status,
    };
  });
}

/** 詳細用の読み取りモデル。IDを指定して1件だけ取得する。 */
export function fetchCustomerDetail(customerId: string): CustomerDetail | undefined {
  const detail = getCustomerDetail(customerId);
  if (!detail) return undefined;
  const edit = savedEdits.get(customerId);
  return edit ? { ...detail, ...edit } : detail;
}

export async function saveCustomer(
  customerId: string,
  input: CustomerEditInput,
): Promise<SaveCustomerResult> {
  await new Promise((resolve) => {
    setTimeout(resolve, SAVE_LATENCY_MS);
  });

  if (!getCustomerDetail(customerId)) {
    return { ok: false, reason: CUSTOMER_NOT_FOUND_REASON };
  }

  savedEdits.set(customerId, { ...input });
  publish();
  return { ok: true };
}

export function removeCustomer(
  customerId: string,
  options: { simulateFailure?: boolean } = {},
): DeleteCustomerResult {
  const result = deleteCustomer(customerId, options);
  if (result.ok) {
    savedEdits.delete(customerId);
    publish();
  }
  return result;
}

export function resetCustomerEdits(): void {
  savedEdits.clear();
  publish();
}

export function useCustomerSummaries(): CustomerSummary[] {
  const currentRevision = useSyncExternalStore(subscribe, getRevision, getRevision);
  return useMemo(() => fetchCustomerSummaries(), [currentRevision]);
}

export function useCustomerDetail(customerId: string): CustomerDetail | undefined {
  const currentRevision = useSyncExternalStore(subscribe, getRevision, getRevision);
  return useMemo(() => fetchCustomerDetail(customerId), [customerId, currentRevision]);
}
