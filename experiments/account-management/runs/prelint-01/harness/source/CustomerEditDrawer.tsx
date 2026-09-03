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
  buttonVariants,
} from "@heroui/react";
import { useState, type FormEvent } from "react";
import {
  CUSTOMER_STATUSES,
  SAVE_FAILURE_REASON,
  saveCustomer,
  type CustomerEditInput,
} from "./customerStore";
import type { CustomerDetail, CustomerStatus } from "./fixtures";
import type { DetailScreenState } from "./screenState";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const COMPANY_NAME_ERROR = "会社名を入力してください。";
const EMAIL_ERROR = "メールアドレスの形式が正しくありません。";

function toEditInput(customer: CustomerDetail): CustomerEditInput {
  return {
    companyName: customer.companyName,
    contactName: customer.contactName,
    email: customer.email,
    status: customer.status,
  };
}

/** URLの`state`から初期値を組み立てる。画面に状態切り替え用のUIは置かない。 */
function seedInput(customer: CustomerDetail, screenState: DetailScreenState): CustomerEditInput {
  const input = toEditInput(customer);
  if (screenState === "invalid-email") {
    return { ...input, email: customer.email.replace(/\.[^.]+$/, "") };
  }
  return input;
}

const OPEN_STATES: DetailScreenState[] = ["drawer-open", "invalid-email", "loading", "failure"];

export function CustomerEditDrawer({
  customer,
  onSaved,
  screenState,
}: {
  customer: CustomerDetail;
  onSaved: () => void;
  screenState: DetailScreenState;
}) {
  const [isOpen, setIsOpen] = useState(OPEN_STATES.includes(screenState));
  const [input, setInput] = useState<CustomerEditInput>(() => seedInput(customer, screenState));
  const [isSaving, setIsSaving] = useState(screenState === "loading");
  const [failureReason, setFailureReason] = useState<string | null>(
    screenState === "failure" ? SAVE_FAILURE_REASON : null,
  );
  const [isSubmitted, setIsSubmitted] = useState(
    screenState === "invalid-email" || screenState === "failure",
  );

  const companyNameError = input.companyName.trim() === "" ? COMPANY_NAME_ERROR : null;
  const emailError =
    input.email.trim() !== "" && !EMAIL_PATTERN.test(input.email.trim()) ? EMAIL_ERROR : null;

  function updateInput(patch: Partial<CustomerEditInput>) {
    setInput((current) => ({ ...current, ...patch }));
  }

  function handleOpenChange(open: boolean) {
    setIsOpen(open);
    if (open) {
      setInput(toEditInput(customer));
      setIsSaving(false);
      setFailureReason(null);
      setIsSubmitted(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSaving) return;

    setIsSubmitted(true);
    if (companyNameError || emailError) return;

    setFailureReason(null);
    setIsSaving(true);
    const result = await saveCustomer(customer.id, {
      ...input,
      companyName: input.companyName.trim(),
      contactName: input.contactName.trim(),
      email: input.email.trim(),
    });
    setIsSaving(false);

    if (!result.ok) {
      setFailureReason(result.reason);
      return;
    }
    setIsOpen(false);
    onSaved();
  }

  return (
    <Drawer isOpen={isOpen} onOpenChange={handleOpenChange}>
      <Drawer.Trigger className={buttonVariants({ variant: "primary" })}>顧客を編集</Drawer.Trigger>
      <Drawer.Backdrop>
        <Drawer.Content placement="right">
          <Drawer.Dialog aria-label="顧客情報の編集">
            <Drawer.CloseTrigger aria-label="閉じる" />
            <Form className="drawer-dialog-form" onSubmit={handleSubmit} validationBehavior="aria">
              <Drawer.Header>
                <Drawer.Heading>顧客情報の編集</Drawer.Heading>
              </Drawer.Header>

              <Drawer.Body>
                <div className="drawer-form">
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
                    autoComplete="organization"
                    isInvalid={isSubmitted && companyNameError !== null}
                    isRequired
                    onChange={(value) => updateInput({ companyName: value })}
                    value={input.companyName}
                  >
                    <Label>会社名</Label>
                    <Input />
                    <FieldError>{COMPANY_NAME_ERROR}</FieldError>
                  </TextField>

                  <TextField
                    autoComplete="name"
                    onChange={(value) => updateInput({ contactName: value })}
                    value={input.contactName}
                  >
                    <Label>担当者名</Label>
                    <Input />
                  </TextField>

                  <TextField
                    autoComplete="email"
                    isInvalid={isSubmitted && emailError !== null}
                    onChange={(value) => updateInput({ email: value })}
                    type="email"
                    value={input.email}
                  >
                    <Label>メールアドレス</Label>
                    <Input />
                    <FieldError>{EMAIL_ERROR}</FieldError>
                  </TextField>

                  <Select
                    onSelectionChange={(key) => updateInput({ status: key as CustomerStatus })}
                    selectedKey={input.status}
                  >
                    <Label>ステータス</Label>
                    <Select.Trigger>
                      <Select.Value />
                      <Select.Indicator />
                    </Select.Trigger>
                    <Select.Popover>
                      <ListBox>
                        {CUSTOMER_STATUSES.map((status) => (
                          <ListBox.Item id={status} key={status} textValue={status}>
                            {status}
                          </ListBox.Item>
                        ))}
                      </ListBox>
                    </Select.Popover>
                  </Select>
                </div>
              </Drawer.Body>

              <Drawer.Footer>
                <Button isDisabled={isSaving} onPress={() => setIsOpen(false)} variant="tertiary">
                  キャンセル
                </Button>
                <Button isDisabled={isSaving} isPending={isSaving} type="submit" variant="primary">
                  {isSaving ? (
                    <>
                      <span aria-hidden="true">
                        <Spinner color="current" size="sm" />
                      </span>
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
