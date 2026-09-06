import type { CustomerStatus } from "./fixtures";

export const CUSTOMER_STATUSES: CustomerStatus[] = ["商談中", "利用中", "休眠"];

/** 追加と編集で共通の入力値。business.customer-name / business.contact-email の対象 */
export type CustomerFormValues = {
  companyName: string;
  contactName: string;
  email: string;
  status: CustomerStatus;
};

export type CustomerFormErrors = Partial<Record<keyof CustomerFormValues, string>>;

export const COMPANY_NAME_ERROR = "会社名を入力してください。";
export const EMAIL_FORMAT_ERROR = "メールアドレスは name@example.com の形式で入力してください。";
export const CREATE_FAILURE_REASON = "顧客の追加に失敗しました。時間をおいて再試行してください。";
export const SAVE_FAILURE_REASON = "顧客の保存に失敗しました。時間をおいて再試行してください。";
export const SAVE_SUCCESS_MESSAGE = "顧客を保存しました";
export const DELETE_SUCCESS_MESSAGE = "顧客を削除しました";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isCustomerStatus(value: unknown): value is CustomerStatus {
  return CUSTOMER_STATUSES.some((status) => status === value);
}

export function validateCustomerForm(values: CustomerFormValues): CustomerFormErrors {
  const errors: CustomerFormErrors = {};
  if (values.companyName.trim().length === 0) errors.companyName = COMPANY_NAME_ERROR;
  if (!emailPattern.test(values.email.trim())) errors.email = EMAIL_FORMAT_ERROR;
  return errors;
}

export function hasFormError(errors: CustomerFormErrors): boolean {
  return Object.values(errors).some((message) => Boolean(message));
}

export function statusColor(status: CustomerStatus): "accent" | "success" | "default" {
  if (status === "利用中") return "success";
  if (status === "商談中") return "accent";
  return "default";
}

export function formatContactDate(value: string): string {
  const [year, month, day] = value.split("-");
  if (!year || !month || !day) return value;
  return `${year}/${month}/${day}`;
}
