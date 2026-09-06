import { useState } from "react";
import type { FormEvent } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { Alert, AlertDialog, Button, Card, Chip, Drawer, Form, Link, toast } from "@heroui/react";
import { deleteCustomer, getCustomerDetail } from "./fixtures";
import type { CustomerDetail } from "./fixtures";
import { CustomerFormFields, invalidEmailMessage, validateCustomerForm } from "./customerForm";
import type { CustomerFieldErrors, CustomerFormValues } from "./customerForm";
import { useScreenState, wait } from "./screenState";

const saveFailureReason = "顧客情報を保存できませんでした。時間をおいて再試行してください。";

function toFormValues(customer: CustomerDetail): CustomerFormValues {
  return {
    companyName: customer.companyName,
    contactName: customer.contactName,
    email: customer.email,
    status: customer.status,
  };
}

type DetailItem = { term: string; description: string };

function CustomerDetailScreen({ customerId }: { customerId: string }) {
  const screenState = useScreenState();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState(() => getCustomerDetail(customerId));

  const [isEditOpen, setIsEditOpen] = useState(
    screenState === "drawer-open" ||
      screenState === "invalid-email" ||
      screenState === "loading" ||
      screenState === "failure",
  );
  const [values, setValues] = useState<CustomerFormValues>(() => {
    const initial = customer ? toFormValues(customer) : { companyName: "", contactName: "", email: "", status: "商談中" as const };
    return screenState === "invalid-email" ? { ...initial, email: "aoi.sato@example" } : initial;
  });
  const [fieldErrors, setFieldErrors] = useState<CustomerFieldErrors>(
    screenState === "invalid-email" ? { email: invalidEmailMessage } : {},
  );
  const [saveError, setSaveError] = useState<string | null>(
    screenState === "failure" ? saveFailureReason : null,
  );
  const [isSaving, setIsSaving] = useState(screenState === "loading");
  const [savedNotice, setSavedNotice] = useState(screenState === "success");

  const [isDeleteOpen, setIsDeleteOpen] = useState(screenState === "delete-confirm");
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  if (!customer) return <Navigate replace to="/customers" />;

  function handleEditOpenChange(isOpen: boolean) {
    setIsEditOpen(isOpen);
    if (!isOpen && customer) {
      setValues(toFormValues(customer));
      setFieldErrors({});
      setSaveError(null);
    }
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSaving || !customer) return;

    const errors = validateCustomerForm(values);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSaveError(null);
    setIsSaving(true);
    await wait();
    setIsSaving(false);

    if (screenState === "failure") {
      setSaveError(saveFailureReason);
      return;
    }

    setCustomer({
      ...customer,
      companyName: values.companyName.trim(),
      contactName: values.contactName.trim(),
      email: values.email.trim(),
      status: values.status,
    });
    setSavedNotice(true);
    setIsEditOpen(false);
    toast.success("顧客を保存しました");
  }

  async function handleDelete() {
    if (isDeleting || !customer) return;

    setDeleteError(null);
    setIsDeleting(true);
    await wait();

    const result = deleteCustomer(customer.id, { simulateFailure: screenState === "failure" });
    setIsDeleting(false);

    if (!result.ok) {
      setDeleteError(result.reason);
      return;
    }

    setIsDeleteOpen(false);
    toast.success("顧客を削除しました");
    navigate("/customers");
  }

  const detailItems: DetailItem[] = [
    { term: "会社名", description: customer.companyName },
    { term: "担当者名", description: customer.contactName },
    { term: "メールアドレス", description: customer.email },
    { term: "電話番号", description: customer.phone },
  ];

  return (
    <main className="page-shell page-shell--stack">
      <div className="detail-page__heading">
        <div>
          <Link href="#/customers">顧客一覧へ戻る</Link>
        </div>
        <div className="page-heading">
          <div className="page-heading__copy">
            <h1>{customer.companyName}</h1>
            <p>担当者への連絡先と対応状況を確認します。</p>
            <div className="page-heading__status">
              <Chip size="sm" variant="soft">
                <Chip.Label>{customer.status}</Chip.Label>
              </Chip>
            </div>
          </div>
          <div className="page-heading__action detail-page__actions">
            <Drawer isOpen={isEditOpen} onOpenChange={handleEditOpenChange}>
              <Drawer.Trigger className="button button--md button--primary">顧客を編集</Drawer.Trigger>
              <Drawer.Backdrop variant="blur">
                <Drawer.Content className="record-drawer" placement="right">
                  <Drawer.Dialog>
                    <Drawer.CloseTrigger aria-label="閉じる" />
                    <Form validationBehavior="aria" onSubmit={handleSave}>
                      <Drawer.Header>
                        <Drawer.Heading>顧客情報の編集</Drawer.Heading>
                      </Drawer.Header>
                      <Drawer.Body>
                        <div className="drawer-form">
                          {saveError && (
                            <Alert status="danger">
                              <Alert.Indicator />
                              <Alert.Content>
                                <Alert.Title>顧客情報を保存できませんでした</Alert.Title>
                                <Alert.Description>
                                  {saveError}入力した内容はそのまま残しています。
                                </Alert.Description>
                              </Alert.Content>
                            </Alert>
                          )}
                          <CustomerFormFields
                            errors={fieldErrors}
                            isDisabled={isSaving}
                            values={values}
                            onChange={setValues}
                          />
                        </div>
                      </Drawer.Body>
                      <Drawer.Footer>
                        <Button
                          isDisabled={isSaving}
                          variant="tertiary"
                          onPress={() => handleEditOpenChange(false)}
                        >
                          キャンセル
                        </Button>
                        <Button isDisabled={isSaving} isPending={isSaving} type="submit" variant="primary">
                          保存する
                        </Button>
                      </Drawer.Footer>
                    </Form>
                  </Drawer.Dialog>
                </Drawer.Content>
              </Drawer.Backdrop>
            </Drawer>

            <AlertDialog isOpen={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
              <AlertDialog.Trigger>
                <Button variant="danger-soft">顧客を削除</Button>
              </AlertDialog.Trigger>
              <AlertDialog.Backdrop variant="blur">
                <AlertDialog.Container size="sm">
                  <AlertDialog.Dialog className="confirm-dialog">
                    <AlertDialog.Header>
                      <AlertDialog.Icon status="danger" />
                      <AlertDialog.Heading>顧客の削除</AlertDialog.Heading>
                    </AlertDialog.Header>
                    <AlertDialog.Body>
                      <div className="confirm-dialog__body">
                        <p>
                          {customer.companyName}を削除します。削除すると顧客一覧から消え、元に戻せません。
                        </p>
                        {deleteError && (
                          <Alert status="danger">
                            <Alert.Indicator />
                            <Alert.Content>
                              <Alert.Title>顧客を削除できませんでした</Alert.Title>
                              <Alert.Description>{deleteError}</Alert.Description>
                            </Alert.Content>
                          </Alert>
                        )}
                      </div>
                    </AlertDialog.Body>
                    <AlertDialog.Footer>
                      <Button
                        isDisabled={isDeleting}
                        variant="tertiary"
                        onPress={() => setIsDeleteOpen(false)}
                      >
                        キャンセル
                      </Button>
                      <Button
                        isDisabled={isDeleting}
                        isPending={isDeleting}
                        variant="danger"
                        onPress={handleDelete}
                      >
                        削除する
                      </Button>
                    </AlertDialog.Footer>
                  </AlertDialog.Dialog>
                </AlertDialog.Container>
              </AlertDialog.Backdrop>
            </AlertDialog>
          </div>
        </div>
      </div>

      <div className="detail-grid">
        {savedNotice && (
          <Alert status="success">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Title>顧客情報を保存しました</Alert.Title>
              <Alert.Description>変更した内容を基本情報に反映しました。</Alert.Description>
            </Alert.Content>
          </Alert>
        )}

        <Card variant="default">
          <Card.Header>
            <Card.Title>基本情報</Card.Title>
          </Card.Header>
          <Card.Content>
            <dl className="detail-content">
              {detailItems.map((item) => (
                <div key={item.term} className="detail-item">
                  <dt>{item.term}</dt>
                  <dd>{item.description}</dd>
                </div>
              ))}
              <div className="detail-item">
                <dt>ステータス</dt>
                <dd>
                  <Chip size="sm" variant="soft">
                    <Chip.Label>{customer.status}</Chip.Label>
                  </Chip>
                </dd>
              </div>
            </dl>
          </Card.Content>
        </Card>

        <Card variant="default">
          <Card.Header>
            <Card.Title>対応メモ</Card.Title>
          </Card.Header>
          <Card.Content>
            <p className="detail-note">{customer.note}</p>
          </Card.Content>
        </Card>
      </div>
    </main>
  );
}

export function CustomerDetailPage() {
  const { customerId = "" } = useParams();
  return <CustomerDetailScreen key={customerId} customerId={customerId} />;
}
