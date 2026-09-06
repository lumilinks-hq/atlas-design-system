import { useEffect, useRef, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { Alert, AlertDialog, Button, Card, Chip, toast } from "@heroui/react";
import { deleteCustomer, getCustomerDetail, type CustomerDetail } from "./fixtures";
import {
  DELETE_SUCCESS_MESSAGE,
  EMAIL_FORMAT_ERROR,
  SAVE_FAILURE_REASON,
  SAVE_SUCCESS_MESSAGE,
  statusColor,
  type CustomerFormValues,
} from "./customerModel";
import { CustomerFormDrawer } from "./CustomerFormDrawer";
import { useScreenState } from "./screenState";

export function CustomerDetailPage() {
  const { customerId = "" } = useParams();
  const screenState = useScreenState();
  const navigate = useNavigate();
  const stored = getCustomerDetail(customerId);
  const [saved, setSaved] = useState<CustomerDetail | undefined>(undefined);
  const [isEditOpen, setIsEditOpen] = useState(
    screenState === "drawer-open" ||
      screenState === "invalid-email" ||
      screenState === "loading" ||
      screenState === "failure",
  );
  const [isDeleteOpen, setIsDeleteOpen] = useState(screenState === "delete-confirm");
  const [isSaving, setIsSaving] = useState(screenState === "loading");
  const [isDeleting, setIsDeleting] = useState(false);
  const [saveFailureReason, setSaveFailureReason] = useState(
    screenState === "failure" ? SAVE_FAILURE_REASON : "",
  );
  const [deleteFailureReason, setDeleteFailureReason] = useState("");
  const notifiedRef = useRef(false);

  useEffect(() => {
    if (screenState !== "success" || notifiedRef.current) return;
    notifiedRef.current = true;
    toast.success(SAVE_SUCCESS_MESSAGE, { description: "顧客情報に反映しました。" });
  }, [screenState]);

  if (!stored) return <Navigate replace to="/customers" />;
  const customer = saved && saved.id === customerId ? saved : stored;

  function handleSave(values: CustomerFormValues) {
    setIsSaving(true);
    setSaveFailureReason("");
    window.setTimeout(() => {
      setIsSaving(false);
      if (screenState === "failure") {
        setSaveFailureReason(SAVE_FAILURE_REASON);
        return;
      }
      setSaved({ ...customer, ...values });
      setIsEditOpen(false);
      toast.success(SAVE_SUCCESS_MESSAGE, { description: "顧客情報に反映しました。" });
    }, 200);
  }

  function handleDelete() {
    if (isDeleting) return;
    setIsDeleting(true);
    setDeleteFailureReason("");
    window.setTimeout(() => {
      const result = deleteCustomer(customer.id, { simulateFailure: screenState === "failure" });
      setIsDeleting(false);
      if (!result.ok) {
        setDeleteFailureReason(result.reason);
        return;
      }
      setIsDeleteOpen(false);
      toast.success(DELETE_SUCCESS_MESSAGE, { description: `${customer.companyName}を一覧から削除しました。` });
      void navigate("/customers");
    }, 200);
  }

  const editValues: CustomerFormValues = {
    companyName: customer.companyName,
    contactName: customer.contactName,
    email: screenState === "invalid-email" ? "aoi.sato" : customer.email,
    status: customer.status,
  };

  return (
    <main className="page-shell page-shell--stack">
      <div className="detail-page__heading">
        <Link className="link" to="/customers">
          顧客一覧へ戻る
        </Link>
        <div className="page-heading">
          <div className="page-heading__copy">
            <h1>{customer.companyName}</h1>
            <div className="page-heading__status">
              <Chip color={statusColor(customer.status)} variant="soft">
                {customer.status}
              </Chip>
            </div>
          </div>
          <div className="page-heading__action detail-actions">
            <CustomerFormDrawer
              triggerLabel="顧客を編集"
              triggerVariantClass="button button--md button--primary detail-actions__item"
              heading="顧客の編集"
              description="登録済みの顧客情報を変更します。"
              closeLabel="編集を閉じる"
              initialValues={editValues}
              initialErrors={screenState === "invalid-email" ? { email: EMAIL_FORMAT_ERROR } : undefined}
              isOpen={isEditOpen}
              onOpenChange={setIsEditOpen}
              isSaving={isSaving}
              failureReason={saveFailureReason}
              onSubmit={handleSave}
            />
            <AlertDialog isOpen={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
              <AlertDialog.Trigger className="detail-actions__item">
                <Button variant="danger-soft" isDisabled={isDeleting}>
                  顧客を削除
                </Button>
              </AlertDialog.Trigger>
              <AlertDialog.Backdrop variant="blur">
                <AlertDialog.Container placement="center">
                  <AlertDialog.Dialog>
                    <AlertDialog.Header>
                      <AlertDialog.Icon status="danger" />
                      <AlertDialog.Heading>顧客の削除</AlertDialog.Heading>
                    </AlertDialog.Header>
                    <AlertDialog.Body>
                      <div className="dialog-body">
                        <p>
                          <strong>{customer.companyName}</strong>を削除します。
                        </p>
                        <p>削除すると基本情報と対応メモがなくなり、この操作は取り消せません。</p>
                        {deleteFailureReason ? (
                          <Alert status="danger">
                            <Alert.Indicator />
                            <Alert.Content>
                              <Alert.Title>削除できませんでした</Alert.Title>
                              <Alert.Description>{deleteFailureReason}</Alert.Description>
                            </Alert.Content>
                          </Alert>
                        ) : null}
                      </div>
                    </AlertDialog.Body>
                    <AlertDialog.Footer>
                      <Button variant="tertiary" isDisabled={isDeleting} onPress={() => setIsDeleteOpen(false)}>
                        キャンセル
                      </Button>
                      <Button variant="danger" isPending={isDeleting} isDisabled={isDeleting} onPress={handleDelete}>
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
        <Card>
          <Card.Header>
            <Card.Title>基本情報</Card.Title>
          </Card.Header>
          <Card.Content>
            <dl className="detail-content">
              <DetailItem label="会社名" value={customer.companyName} />
              <DetailItem label="担当者名" value={customer.contactName} />
              <DetailItem label="メールアドレス" value={customer.email} />
              <DetailItem label="電話番号" value={customer.phone} />
              <DetailItem label="ステータス" value={customer.status} />
            </dl>
          </Card.Content>
        </Card>
        <Card>
          <Card.Header>
            <Card.Title>対応状況</Card.Title>
          </Card.Header>
          <Card.Content>
            <p className="detail-note">{customer.note}</p>
          </Card.Content>
        </Card>
      </div>
    </main>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="detail-item">
      <dt className="detail-item__label">{label}</dt>
      <dd className="detail-item__value">{value}</dd>
    </div>
  );
}
