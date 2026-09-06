import { useState } from "react";
import type { FormEvent } from "react";
import { Alert, Button, Drawer, Form, Spinner } from "@heroui/react";
import type { UseOverlayStateReturn } from "@heroui/react";
import type { CustomerDetail } from "../fixtures";
import { submitCustomerUpdate } from "../customerService";
import { CustomerFormFields } from "./CustomerFormFields";
import type { CustomerFormErrors, CustomerFormValues } from "./customerForm";
import { hasCustomerFormError, validateCustomerForm } from "./customerForm";

type CustomerEditDrawerProps = {
  customer: CustomerDetail;
  state: UseOverlayStateReturn;
  /** URL の state で指定された初期表示。通常の操作では渡さない */
  initialValues?: CustomerFormValues;
  initialErrors?: CustomerFormErrors;
  initialFailureReason?: string | null;
  isSavingPinned?: boolean;
  onSaved: (customer: CustomerDetail) => void;
};

export function toCustomerFormValues(customer: CustomerDetail): CustomerFormValues {
  return {
    companyName: customer.companyName,
    contactName: customer.contactName,
    email: customer.email,
    status: customer.status,
  };
}

export function CustomerEditDrawer({
  customer,
  state,
  initialValues,
  initialErrors,
  initialFailureReason = null,
  isSavingPinned = false,
  onSaved,
}: CustomerEditDrawerProps) {
  const [values, setValues] = useState<CustomerFormValues>(
    initialValues ?? toCustomerFormValues(customer),
  );
  const [errors, setErrors] = useState<CustomerFormErrors>(initialErrors ?? {});
  const [failureReason, setFailureReason] = useState<string | null>(initialFailureReason);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSaving = isSubmitting || isSavingPinned;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    // 保存中は二重送信させない
    if (isSaving) return;

    const nextErrors = validateCustomerForm(values);
    setErrors(nextErrors);
    if (hasCustomerFormError(nextErrors)) return;

    setFailureReason(null);
    setIsSubmitting(true);
    const result = await submitCustomerUpdate(customer.id, values);
    setIsSubmitting(false);

    // 失敗しても入力内容は保持し、そのまま再試行できるようにする
    if (!result.ok) {
      setFailureReason(result.reason);
      return;
    }

    onSaved(result.customer);
  };

  const handleCancel = () => {
    if (isSaving) return;
    setValues(toCustomerFormValues(customer));
    setErrors({});
    setFailureReason(null);
    state.close();
  };

  return (
    <Drawer state={state}>
      <Drawer.Backdrop isDismissable={!isSaving}>
        <Drawer.Content placement="right">
          <Drawer.Dialog>
            <Form className="flex h-full flex-col" validationBehavior="aria" onSubmit={handleSubmit}>
              <Drawer.Header>
                <Drawer.Heading>顧客情報を編集</Drawer.Heading>
              </Drawer.Header>
              <Drawer.Body className="flex flex-col gap-5">
                {failureReason ? (
                  <Alert status="danger">
                    <Alert.Indicator />
                    <Alert.Content>
                      <Alert.Title>変更を保存できませんでした</Alert.Title>
                      <Alert.Description>{failureReason}</Alert.Description>
                    </Alert.Content>
                  </Alert>
                ) : null}
                <CustomerFormFields
                  errors={errors}
                  isDisabled={isSaving}
                  values={values}
                  onChange={setValues}
                />
              </Drawer.Body>
              <Drawer.Footer>
                <Button isDisabled={isSaving} variant="tertiary" onPress={handleCancel}>
                  キャンセル
                </Button>
                <Button isDisabled={isSaving} type="submit" variant="primary">
                  {isSaving ? <Spinner size="sm" /> : null}
                  {isSaving ? "保存中" : "保存する"}
                </Button>
              </Drawer.Footer>
            </Form>
          </Drawer.Dialog>
        </Drawer.Content>
      </Drawer.Backdrop>
    </Drawer>
  );
}
