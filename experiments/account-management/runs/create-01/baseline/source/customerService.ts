import {
  createCustomer,
  deleteCustomer,
  getCustomerDetail,
  listCustomerSummaries,
  updateCustomer,
} from "./fixtures";
import type {
  CreateCustomerInput,
  CreateCustomerResult,
  CustomerDetail,
  CustomerStatus,
  CustomerSummary,
  DeleteCustomerResult,
  UpdateCustomerInput,
  UpdateCustomerResult,
} from "./fixtures";

/** ステータスの選択肢。フォームの表示順もこの並びに合わせる */
export const customerStatuses: CustomerStatus[] = ["商談中", "利用中", "休眠"];

/** 保存処理が進行中であることを画面で確認できるようにするための待ち時間 */
const MUTATION_LATENCY_MS = 300;

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/** 一覧向け。要約情報だけを取得する */
export function loadCustomerSummaries(): CustomerSummary[] {
  return listCustomerSummaries();
}

/** 詳細向け。選択した顧客の完全な情報を一覧とは別に取得する */
export function loadCustomerDetail(customerId: string): CustomerDetail | undefined {
  return getCustomerDetail(customerId);
}

export async function submitCustomerCreate(
  input: CreateCustomerInput,
  options: { simulateFailure?: boolean } = {},
): Promise<CreateCustomerResult> {
  await wait(MUTATION_LATENCY_MS);
  return createCustomer(input, options);
}

export async function submitCustomerUpdate(
  customerId: string,
  input: UpdateCustomerInput,
  options: { simulateFailure?: boolean } = {},
): Promise<UpdateCustomerResult> {
  await wait(MUTATION_LATENCY_MS);
  return updateCustomer(customerId, input, options);
}

export async function submitCustomerDelete(
  customerId: string,
  options: { simulateFailure?: boolean } = {},
): Promise<DeleteCustomerResult> {
  await wait(MUTATION_LATENCY_MS);
  return deleteCustomer(customerId, options);
}

/**
 * 保存失敗の表示に使う理由。fixtures が返す文言と必ず一致させたいので、
 * 失敗応答をそのまま取り出す（simulateFailure は記録を変更しない）。
 */
export const customerUpdateFailureReason = ((): string => {
  const result = updateCustomer(
    "",
    { companyName: "", contactName: "", email: "", status: customerStatuses[0] },
    { simulateFailure: true },
  );
  return result.ok ? "変更を保存できませんでした。" : result.reason;
})();

/** 一覧に表示する日付。fixtures の ISO 形式を読みやすい表記に変換する */
export function formatContactDate(isoDate: string): string {
  return isoDate.replaceAll("-", "/");
}
