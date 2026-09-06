import type { CustomerStatus } from "../fixtures";

export type CustomerFormValues = {
  companyName: string;
  contactName: string;
  email: string;
  status: CustomerStatus;
};

export type CustomerFormField = "companyName" | "email";

export type CustomerFormErrors = Partial<Record<CustomerFormField, string>>;

/** 一般的なメール形式。ローカル部＠ドメイン＋トップレベルドメインを求める */
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateCustomerForm(values: CustomerFormValues): CustomerFormErrors {
  const errors: CustomerFormErrors = {};

  if (values.companyName.trim().length === 0) {
    errors.companyName = "会社名を入力してください。";
  }

  const email = values.email.trim();
  if (email.length > 0 && !emailPattern.test(email)) {
    errors.email = "メールアドレスは name@example.com の形式で入力してください。";
  }

  return errors;
}

export function hasCustomerFormError(errors: CustomerFormErrors): boolean {
  return Object.keys(errors).length > 0;
}
