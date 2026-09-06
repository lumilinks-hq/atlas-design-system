import { FieldError, Input, Label, ListBox, Select, TextField } from "@heroui/react";
import type { CustomerStatus } from "../fixtures";
import { customerStatuses } from "../customerService";
import type { CustomerFormErrors, CustomerFormValues } from "./customerForm";

type CustomerFormFieldsProps = {
  values: CustomerFormValues;
  errors: CustomerFormErrors;
  isDisabled: boolean;
  onChange: (values: CustomerFormValues) => void;
};

/** 顧客の追加と編集で共通の入力項目 */
export function CustomerFormFields({
  values,
  errors,
  isDisabled,
  onChange,
}: CustomerFormFieldsProps) {
  return (
    <div className="flex flex-col gap-5">
      <TextField
        isDisabled={isDisabled}
        isInvalid={Boolean(errors.companyName)}
        isRequired
        value={values.companyName}
        onChange={(companyName) => onChange({ ...values, companyName })}
      >
        <Label>会社名</Label>
        <Input autoComplete="off" placeholder="株式会社ノーススター" />
        <FieldError>{errors.companyName}</FieldError>
      </TextField>

      <TextField
        isDisabled={isDisabled}
        value={values.contactName}
        onChange={(contactName) => onChange({ ...values, contactName })}
      >
        <Label>担当者名</Label>
        <Input autoComplete="off" placeholder="佐藤 葵" />
      </TextField>

      <TextField
        isDisabled={isDisabled}
        isInvalid={Boolean(errors.email)}
        type="email"
        value={values.email}
        onChange={(email) => onChange({ ...values, email })}
      >
        <Label>メールアドレス</Label>
        <Input autoComplete="off" placeholder="name@example.com" />
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
              </ListBox.Item>
            ))}
          </ListBox>
        </Select.Popover>
      </Select>
    </div>
  );
}
