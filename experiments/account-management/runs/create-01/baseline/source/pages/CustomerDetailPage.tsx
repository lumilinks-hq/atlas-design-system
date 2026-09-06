import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { Alert, Button, Card, Heading, Paragraph, useOverlayState } from "@heroui/react";
import type { CustomerDetail } from "../fixtures";
import { customerUpdateFailureReason, loadCustomerDetail } from "../customerService";
import { CustomerDeleteDialog } from "../components/CustomerDeleteDialog";
import { CustomerEditDrawer, toCustomerFormValues } from "../components/CustomerEditDrawer";
import type { CustomerFormErrors, CustomerFormValues } from "../components/customerForm";
import { StatusChip } from "../components/StatusChip";
import type { DetailScreenState, ListScreenState } from "../screenState";

type CustomerDetailPageProps = {
  customerId: string;
  screenState: DetailScreenState | null;
  /** 一覧画面の状態が詳細の URL に指定されたとき、一覧へ戻すために使う */
  listScreenStateRequest: ListScreenState | null;
};

const editOpenStates: DetailScreenState[] = [
  "drawer-open",
  "invalid-email",
  "loading",
  "failure",
];

/** invalid-email 状態の初期値。トップレベルドメインを欠いた形式にする */
function toInvalidEmail(email: string): string {
  return email.replace(/\.[^.@]*$/, "") || "name@example";
}

export function CustomerDetailPage({
  customerId,
  screenState,
  listScreenStateRequest,
}: CustomerDetailPageProps) {
  const navigate = useNavigate();
  // 詳細では選択した顧客の完全な情報を一覧とは別に取得する
  const [customer, setCustomer] = useState<CustomerDetail | undefined>(() =>
    loadCustomerDetail(customerId),
  );
  const [notice, setNotice] = useState<string | null>(
    screenState === "success" ? "変更を保存しました。" : null,
  );
  // 保存のたびに編集画面を作り直し、最新の顧客情報から入力を始められるようにする
  const [editSession, setEditSession] = useState(0);
  const editState = useOverlayState({
    defaultOpen: screenState !== null && editOpenStates.includes(screenState),
  });
  const [isDeleteOpen, setIsDeleteOpen] = useState(screenState === "delete-confirm");

  if (listScreenStateRequest) {
    return <Navigate replace to={`/customers?state=${listScreenStateRequest}`} />;
  }

  if (customer === undefined) {
    return <Navigate replace to="/customers" />;
  }

  const handleSaved = (saved: CustomerDetail) => {
    setCustomer(saved);
    setEditSession((current) => current + 1);
    editState.close();
    setNotice("変更を保存しました。");
  };

  const handleDeleted = (deleted: CustomerDetail) => {
    setIsDeleteOpen(false);
    navigate("/customers", {
      replace: true,
      state: { notice: `「${deleted.companyName}」を削除しました。` },
    });
  };

  const initialValues: CustomerFormValues | undefined =
    screenState === "invalid-email"
      ? { ...toCustomerFormValues(customer), email: toInvalidEmail(customer.email) }
      : undefined;
  const initialErrors: CustomerFormErrors | undefined =
    screenState === "invalid-email"
      ? { email: "メールアドレスは name@example.com の形式で入力してください。" }
      : undefined;

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
      <Link
        className="text-sm text-muted underline-offset-4 hover:underline"
        to="/customers"
      >
        顧客一覧へ戻る
      </Link>

      <header className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col items-start gap-2">
          <Heading level={1}>
            {customer.companyName}
          </Heading>
          <StatusChip status={customer.status} />
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onPress={editState.open}>
            編集
          </Button>
          <Button variant="danger-soft" onPress={() => setIsDeleteOpen(true)}>
            削除
          </Button>
        </div>
      </header>

      {notice ? (
        <Alert className="mt-6" status="success">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Description>{notice}</Alert.Description>
          </Alert.Content>
        </Alert>
      ) : null}

      <div className="mt-6 flex flex-col gap-4">
        <Card>
          <Card.Header>
            <Card.Title>基本情報</Card.Title>
          </Card.Header>
          <Card.Content>
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <DetailField label="会社名" value={customer.companyName} />
              <DetailField label="担当者名" value={customer.contactName} />
              <DetailField label="メールアドレス" value={customer.email} />
              <DetailField label="電話番号" value={customer.phone} />
              <div className="flex flex-col gap-1">
                <dt className="text-sm text-muted">ステータス</dt>
                <dd>
                  <StatusChip status={customer.status} />
                </dd>
              </div>
            </dl>
          </Card.Content>
        </Card>

        <Card>
          <Card.Header>
            <Card.Title>対応メモ</Card.Title>
          </Card.Header>
          <Card.Content>
            <Paragraph className="whitespace-pre-wrap" size="sm">
              {customer.note.length > 0 ? customer.note : "対応メモはまだありません。"}
            </Paragraph>
          </Card.Content>
        </Card>
      </div>

      <CustomerEditDrawer
        key={`${customer.id}-${editSession}`}
        customer={customer}
        initialErrors={initialErrors}
        initialFailureReason={screenState === "failure" ? customerUpdateFailureReason : null}
        initialValues={initialValues}
        isSavingPinned={screenState === "loading"}
        state={editState}
        onSaved={handleSaved}
      />

      <CustomerDeleteDialog
        customer={customer}
        isOpen={isDeleteOpen}
        onDeleted={handleDeleted}
        onOpenChange={setIsDeleteOpen}
      />
    </main>
  );
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="text-sm break-all">{value.length > 0 ? value : "未登録"}</dd>
    </div>
  );
}
