import { useState } from "react";
import type { FormEvent } from "react";
import { Alert, Button, Form, Modal, Spinner } from "@heroui/react";
import type { UseOverlayStateReturn } from "@heroui/react";
import type { CustomerDetail } from "../fixtures";
import { customerStatuses, submitCustomerCreate } from "../customerService";
import { CustomerFormFields } from "./CustomerFormFields";
import type { CustomerFormErrors, CustomerFormValues } from "./customerForm";
import { hasCustomerFormError, validateCustomerForm } from "./customerForm";

const emptyValues: CustomerFormValues = {
  companyName: "",
  contactName: "",
  email: "",
  status: customerStatuses[0],
};

type CustomerCreateModalProps = {
  state: UseOverlayStateReturn;
  onCreated: (customer: CustomerDetail) => void;
};

export function CustomerCreateModal({ state, onCreated }: CustomerCreateModalProps) {
  const [values, setValues] = useState<CustomerFormValues>(emptyValues);
  const [errors, setErrors] = useState<CustomerFormErrors>({});
  const [failureReason, setFailureReason] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    // 保存中は二重送信させない
    if (isSubmitting) return;

    const nextErrors = validateCustomerForm(values);
    setErrors(nextErrors);
    if (hasCustomerFormError(nextErrors)) return;

    setFailureReason(null);
    setIsSubmitting(true);
    const result = await submitCustomerCreate(values);
    setIsSubmitting(false);

    // 失敗しても入力内容は保持し、この入力画面のなかで理由を伝える
    if (!result.ok) {
      setFailureReason(result.reason);
      return;
    }

    setValues(emptyValues);
    setErrors({});
    onCreated(result.customer);
  };

  const handleCancel = () => {
    if (isSubmitting) return;
    setValues(emptyValues);
    setErrors({});
    setFailureReason(null);
    state.close();
  };

  return (
    <Modal state={state}>
      <Modal.Backdrop isDismissable={!isSubmitting}>
        <Modal.Container size="md">
          <Modal.Dialog>
            <Form className="flex flex-col" validationBehavior="aria" onSubmit={handleSubmit}>
              <Modal.Header>
                <Modal.Heading>顧客を追加</Modal.Heading>
              </Modal.Header>
              <Modal.Body className="flex flex-col gap-5">
                {failureReason ? (
                  <Alert status="danger">
                    <Alert.Indicator />
                    <Alert.Content>
                      <Alert.Title>顧客を追加できませんでした</Alert.Title>
                      <Alert.Description>{failureReason}</Alert.Description>
                    </Alert.Content>
                  </Alert>
                ) : null}
                <CustomerFormFields
                  errors={errors}
                  isDisabled={isSubmitting}
                  values={values}
                  onChange={setValues}
                />
              </Modal.Body>
              <Modal.Footer>
                <Button isDisabled={isSubmitting} variant="tertiary" onPress={handleCancel}>
                  キャンセル
                </Button>
                <Button isDisabled={isSubmitting} type="submit" variant="primary">
                  {isSubmitting ? <Spinner size="sm" /> : null}
                  {isSubmitting ? "追加中" : "追加する"}
                </Button>
              </Modal.Footer>
            </Form>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
