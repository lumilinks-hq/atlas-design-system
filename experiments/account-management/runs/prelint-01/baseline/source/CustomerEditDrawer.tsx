import {
  Alert,
  Button,
  Drawer,
  FieldError,
  Form,
  Input,
  Label,
  ListBox,
  Select,
  Spinner,
  TextField,
} from "@heroui/react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { CUSTOMER_STATUSES } from "./CustomerStatus";
import { saveCustomer, type CustomerEditValues } from "./customerApi";
import type { CustomerDetail, CustomerStatus } from "./fixtures";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type EditDrawerSeed = {
  values?: Partial<CustomerEditValues>;
  showErrors?: boolean;
  isSaving?: boolean;
  errorMessage?: string | null;
};

type CustomerEditDrawerProps = {
  customer: CustomerDetail;
  isOpen: boolean;
  seed?: EditDrawerSeed;
  onOpenChange: (isOpen: boolean) => void;
  onSaved: (customer: CustomerDetail) => void;
};

type EditErrors = {
  companyName?: string;
  email?: string;
};

function toEditValues(customer: CustomerDetail): CustomerEditValues {
  return {
    companyName: customer.companyName,
    contactName: customer.contactName,
    email: customer.email,
    status: customer.status,
  };
}

function validate(values: CustomerEditValues): EditErrors {
  const errors: EditErrors = {};

  if (!values.companyName.trim()) {
    errors.companyName = "会社名を入力してください。";
  }
  if (!values.email.trim()) {
    errors.email = "メールアドレスを入力してください。";
  } else if (!EMAIL_PATTERN.test(values.email.trim())) {
    errors.email = "メールアドレスは name@example.com の形式で入力してください。";
  }

  return errors;
}

export function CustomerEditDrawer({ customer, isOpen, seed, onOpenChange, onSaved }: CustomerEditDrawerProps) {
  const [values, setValues] = useState<CustomerEditValues>(() => ({ ...toEditValues(customer), ...seed?.values }));
  const [showErrors, setShowErrors] = useState(seed?.showErrors ?? false);
  const [isSaving, setIsSaving] = useState(seed?.isSaving ?? false);
  const [saveError, setSaveError] = useState<string | null>(seed?.errorMessage ?? null);
  const wasOpen = useRef(isOpen);

  // 開き直したときは、保存済みの内容から入力し直す。
  useEffect(() => {
    if (isOpen && !wasOpen.current) {
      setValues(toEditValues(customer));
      setShowErrors(false);
      setIsSaving(false);
      setSaveError(null);
    }
    wasOpen.current = isOpen;
  }, [customer, isOpen]);

  const errors = validate(values);
  const hasErrors = Boolean(errors.companyName || errors.email);

  const updateValue = <K extends keyof CustomerEditValues>(key: K, value: CustomerEditValues[K]) => {
    setValues((current) => ({ ...current, [key]: value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSaving) return;

    setShowErrors(true);
    if (hasErrors) return;

    setIsSaving(true);
    setSaveError(null);

    const result = await saveCustomer(customer.id, values);
    setIsSaving(false);

    if (!result.ok) {
      setSaveError(result.reason);
      return;
    }
    onSaved(result.customer);
  };

  return (
    <Drawer isOpen={isOpen} onOpenChange={onOpenChange}>
      <Drawer.Backdrop>
        <Drawer.Content placement="right">
          <Drawer.Dialog aria-label="顧客情報の編集">
            <Form className="contents" validationBehavior="aria" onSubmit={handleSubmit}>
              <Drawer.Header>
                <Drawer.Heading>顧客情報を編集</Drawer.Heading>
              </Drawer.Header>

              <Drawer.Body className="flex flex-col gap-4">
                {saveError ? (
                  <Alert role="alert" status="danger">
                    <Alert.Indicator />
                    <Alert.Content>
                      <Alert.Title>保存できませんでした</Alert.Title>
                      <Alert.Description>{saveError}</Alert.Description>
                    </Alert.Content>
                  </Alert>
                ) : null}

                <TextField
                  isInvalid={showErrors && Boolean(errors.companyName)}
                  isRequired
                  value={values.companyName}
                  onChange={(companyName) => updateValue("companyName", companyName)}
                >
                  <Label>会社名</Label>
                  <Input />
                  <FieldError>{errors.companyName}</FieldError>
                </TextField>

                <TextField value={values.contactName} onChange={(contactName) => updateValue("contactName", contactName)}>
                  <Label>担当者名</Label>
                  <Input />
                </TextField>

                <TextField
                  isInvalid={showErrors && Boolean(errors.email)}
                  value={values.email}
                  onChange={(email) => updateValue("email", email)}
                >
                  <Label>メールアドレス</Label>
                  <Input type="email" />
                  <FieldError>{errors.email}</FieldError>
                </TextField>

                <Select
                  selectedKey={values.status}
                  onSelectionChange={(key) => updateValue("status", key as CustomerStatus)}
                >
                  <Label>ステータス</Label>
                  <Select.Trigger>
                    <Select.Value />
                    <Select.Indicator />
                  </Select.Trigger>
                  <Select.Popover>
                    <ListBox>
                      {CUSTOMER_STATUSES.map((status) => (
                        <ListBox.Item key={status} id={status} textValue={status}>
                          {status}
                        </ListBox.Item>
                      ))}
                    </ListBox>
                  </Select.Popover>
                </Select>
              </Drawer.Body>

              <Drawer.Footer className="flex justify-end gap-2">
                <Button isDisabled={isSaving} variant="tertiary" onPress={() => onOpenChange(false)}>
                  キャンセル
                </Button>
                <Button isDisabled={isSaving} type="submit">
                  {isSaving ? (
                    <>
                      {/* 状態はボタン文言で伝わるため、装飾のスピナーは支援技術から隠す。 */}
                      <Spinner aria-hidden aria-label={undefined} color="current" role={undefined} size="sm" />
                      保存中
                    </>
                  ) : (
                    "保存"
                  )}
                </Button>
              </Drawer.Footer>
            </Form>
          </Drawer.Dialog>
        </Drawer.Content>
      </Drawer.Backdrop>
    </Drawer>
  );
}
