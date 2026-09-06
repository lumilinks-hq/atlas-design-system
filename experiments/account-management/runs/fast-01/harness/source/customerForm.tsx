import { Description, FieldError, Input, Label, ListBox, Select, TextField } from "@heroui/react";
import type { CustomerStatus } from "./fixtures";

export const customerStatuses: CustomerStatus[] = ["商談中", "利用中", "休眠"];

export type CustomerFormValues = {
  companyName: string;
  contactName: string;
  email: string;
  status: CustomerStatus;
};

export type CustomerFieldErrors = Partial<Record<"companyName" | "email", string>>;

export const emptyCustomerForm: CustomerFormValues = {
  companyName: "",
  contactName: "",
  email: "",
  status: "商談中",
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const invalidEmailMessage = "メールアドレスをname@example.comの形式で入力してください。";

export function validateCustomerForm(values: CustomerFormValues): CustomerFieldErrors {
  const errors: CustomerFieldErrors = {};
  if (values.companyName.trim().length === 0) {
    errors.companyName = "会社名を入力してください。";
  }
  const email = values.email.trim();
  if (email.length > 0 && !emailPattern.test(email)) {
    errors.email = invalidEmailMessage;
  }
  return errors;
}

type CustomerFormFieldsProps = {
  values: CustomerFormValues;
  errors: CustomerFieldErrors;
  isDisabled: boolean;
  onChange: (values: CustomerFormValues) => void;
};

// 追加と編集で同じ入力単位を共有する。会社名は必須、メールアドレスはtype=emailで受け取る
export function CustomerFormFields({ values, errors, isDisabled, onChange }: CustomerFormFieldsProps) {
  return (
    <>
      <TextField
        isRequired
        isDisabled={isDisabled}
        isInvalid={Boolean(errors.companyName)}
        name="companyName"
        value={values.companyName}
        onChange={(companyName) => onChange({ ...values, companyName })}
      >
        <Label>会社名</Label>
        <Input />
        <FieldError>{errors.companyName}</FieldError>
      </TextField>

      <TextField
        isDisabled={isDisabled}
        name="contactName"
        value={values.contactName}
        onChange={(contactName) => onChange({ ...values, contactName })}
      >
        <Label>担当者名</Label>
        <Input />
      </TextField>

      <TextField
        autoComplete="email"
        isDisabled={isDisabled}
        isInvalid={Boolean(errors.email)}
        name="email"
        type="email"
        value={values.email}
        onChange={(email) => onChange({ ...values, email })}
      >
        <Label>メールアドレス</Label>
        <Input />
        <Description>連絡に使うメールアドレスを入力します。</Description>
        <FieldError>{errors.email}</FieldError>
      </TextField>

      <Select
        isDisabled={isDisabled}
        selectedKey={values.status}
        onSelectionChange={(key) => onChange({ ...values, status: key as CustomerStatus })}
      >
        <Label>ステータス</Label>
        <Select.Trigger>
          <Select.Value />
          <Select.Indicator />
        </Select.Trigger>
        <Select.Popover>
          <ListBox>
            {customerStatuses.map((status) => (
              <ListBox.Item key={status} id={status} textValue={status}>
                {status}
                <ListBox.ItemIndicator />
              </ListBox.Item>
            ))}
          </ListBox>
        </Select.Popover>
      </Select>
    </>
  );
}
