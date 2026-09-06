import { useState } from "react";
import {
  Alert,
  Button,
  Description,
  Drawer,
  FieldError,
  Form,
  Input,
  Label,
  ListBox,
  Select,
  TextField,
} from "@heroui/react";
import {
  CUSTOMER_STATUSES,
  hasFormError,
  isCustomerStatus,
  validateCustomerForm,
  type CustomerFormErrors,
  type CustomerFormValues,
} from "./customerModel";

type CustomerFormDrawerProps = {
  /** Drawer を開くトリガーのラベル(「顧客を追加」/「顧客を編集」) */
  triggerLabel: string;
  triggerVariantClass: string;
  heading: string;
  description: string;
  initialValues: CustomerFormValues;
  /** URL の state から復元する初期エラー(invalid-email 用) */
  initialErrors?: CustomerFormErrors;
  initialFailureReason?: string;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  isSaving: boolean;
  failureReason: string;
  onSubmit: (values: CustomerFormValues) => void;
};

export function CustomerFormDrawer({
  triggerLabel,
  triggerVariantClass,
  heading,
  description,
  initialValues,
  initialErrors,
  isOpen,
  onOpenChange,
  isSaving,
  failureReason,
  onSubmit,
}: CustomerFormDrawerProps) {
  const [values, setValues] = useState<CustomerFormValues>(initialValues);
  const [errors, setErrors] = useState<CustomerFormErrors>(initialErrors ?? {});

  function handleOpenChange(nextOpen: boolean) {
    // 保存中は二重送信と誤操作による閉じ込みを防ぐ
    if (isSaving) return;
    if (nextOpen) {
      setValues(initialValues);
      setErrors(initialErrors ?? {});
    }
    onOpenChange(nextOpen);
  }

  function updateValue<Key extends keyof CustomerFormValues>(key: Key, value: CustomerFormValues[Key]) {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSaving) return;
    const nextErrors = validateCustomerForm(values);
    setErrors(nextErrors);
    if (hasFormError(nextErrors)) return;
    onSubmit({
      companyName: values.companyName.trim(),
      contactName: values.contactName.trim(),
      email: values.email.trim(),
      status: values.status,
    });
  }

  return (
    <Drawer isOpen={isOpen} onOpenChange={handleOpenChange}>
      <Drawer.Trigger className={triggerVariantClass}>{triggerLabel}</Drawer.Trigger>
      <Drawer.Backdrop variant="blur">
        <Drawer.Content placement="right">
          <Drawer.Dialog>
            <Drawer.CloseTrigger />
            <Form className="drawer-form" validationBehavior="aria" onSubmit={handleSubmit}>
              <Drawer.Header>
                <Drawer.Heading>{heading}</Drawer.Heading>
                <p className="drawer-form__intro">{description}</p>
              </Drawer.Header>
              <Drawer.Body>
                <div className="drawer-form__fields">
                  {failureReason ? (
                    <Alert status="danger">
                      <Alert.Indicator />
                      <Alert.Content>
                        <Alert.Title>保存できませんでした</Alert.Title>
                        <Alert.Description>{failureReason}</Alert.Description>
                      </Alert.Content>
                    </Alert>
                  ) : null}
                  <TextField
                    name="companyName"
                    value={values.companyName}
                    onChange={(value) => updateValue("companyName", value)}
                    isInvalid={Boolean(errors.companyName)}
                    isDisabled={isSaving}
                  >
                    <Label>会社名</Label>
                    <Input type="text" placeholder="株式会社ノーススター" />
                    <Description>取引先の正式な会社名を入力します。</Description>
                    <FieldError>{errors.companyName}</FieldError>
                  </TextField>
                  <TextField
                    name="contactName"
                    value={values.contactName}
                    onChange={(value) => updateValue("contactName", value)}
                    isDisabled={isSaving}
                  >
                    <Label>担当者名</Label>
                    <Input type="text" placeholder="佐藤 葵" />
                  </TextField>
                  <TextField
                    name="email"
                    value={values.email}
                    onChange={(value) => updateValue("email", value)}
                    isInvalid={Boolean(errors.email)}
                    isDisabled={isSaving}
                  >
                    <Label>メールアドレス</Label>
                    <Input type="email" placeholder="aoi.sato@example.com" />
                    <FieldError>{errors.email}</FieldError>
                  </TextField>
                  <Select
                    variant="primary"
                    name="status"
                    placeholder="ステータスを選択"
                    value={values.status}
                    onChange={(value) => {
                      if (isCustomerStatus(value)) updateValue("status", value);
                    }}
                    isDisabled={isSaving}
                  >
                    <Label>ステータス</Label>
                    <Select.Trigger>
                      <Select.Value />
                      <Select.Indicator />
                    </Select.Trigger>
                    <Select.Popover>
                      <ListBox>
                        {CUSTOMER_STATUSES.map((status) => (
                          <ListBox.Item key={status} id={status}>
                            {status}
                          </ListBox.Item>
                        ))}
                      </ListBox>
                    </Select.Popover>
                  </Select>
                </div>
              </Drawer.Body>
              <Drawer.Footer>
                <Button variant="tertiary" isDisabled={isSaving} onPress={() => handleOpenChange(false)}>
                  キャンセル
                </Button>
                <Button type="submit" variant="primary" isPending={isSaving} isDisabled={isSaving}>
                  保存する
                </Button>
              </Drawer.Footer>
            </Form>
          </Drawer.Dialog>
        </Drawer.Content>
      </Drawer.Backdrop>
    </Drawer>
  );
}
