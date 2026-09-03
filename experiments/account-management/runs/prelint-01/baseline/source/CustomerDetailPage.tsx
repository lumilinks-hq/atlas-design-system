import { Alert, Button, Card, Link, Typography } from "@heroui/react";
import { useCallback, useEffect, useState } from "react";
import { Navigate, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { CustomerEditDrawer, type EditDrawerSeed } from "./CustomerEditDrawer";
import { CustomerStatusChip } from "./CustomerStatus";
import { DeleteCustomerDialog } from "./DeleteCustomerDialog";
import { readCustomerDetail, SAVE_FAILURE_REASON } from "./customerApi";
import { readDetailDemoState, type DetailDemoState } from "./demoState";
import type { CustomerDetail } from "./fixtures";

const EDIT_OPEN_STATES: DetailDemoState[] = ["drawer-open", "invalid-email", "loading", "failure"];
const DELETE_OPEN_STATES: DetailDemoState[] = ["delete-confirm", "delete-failure"];

/** URLの`state` queryで指定された編集画面の初期状態を組み立てる。 */
function buildEditSeed(demoState: DetailDemoState, customer: CustomerDetail): EditDrawerSeed | undefined {
  switch (demoState) {
    case "invalid-email":
      // ドメインの末尾を欠いた、形式が正しくないメールアドレス。
      return { values: { email: customer.email.replace(/\.[^.]*$/, "") }, showErrors: true };
    case "loading":
      return { isSaving: true };
    case "failure":
      return { errorMessage: SAVE_FAILURE_REASON };
    default:
      return undefined;
  }
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 border-b border-default-200 py-3 last:border-b-0 sm:flex-row sm:gap-6">
      <dt className="sm:w-40 sm:shrink-0">
        <Typography.Paragraph color="muted" size="sm">
          {label}
        </Typography.Paragraph>
      </dt>
      <dd className="min-w-0">
        <Typography.Paragraph>{value}</Typography.Paragraph>
      </dd>
    </div>
  );
}

export function CustomerDetailPage() {
  const { customerId = "" } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const demoState = readDetailDemoState(searchParams);

  // 詳細では選択した顧客の完全な情報を読み込む。
  const [customer, setCustomer] = useState(() => readCustomerDetail(customerId));
  const [isEditOpen, setIsEditOpen] = useState(() => EDIT_OPEN_STATES.includes(demoState));
  const [isDeleteOpen, setIsDeleteOpen] = useState(() => DELETE_OPEN_STATES.includes(demoState));
  const [savedMessage, setSavedMessage] = useState<string | null>(
    demoState === "success" ? "顧客情報を保存しました。" : null,
  );

  useEffect(() => {
    setCustomer(readCustomerDetail(customerId));
  }, [customerId]);

  const handleSaved = useCallback((saved: CustomerDetail) => {
    setCustomer(saved);
    setIsEditOpen(false);
    setSavedMessage("顧客情報を保存しました。");
  }, []);

  const handleDeleted = useCallback(
    (deleted: CustomerDetail) => {
      navigate("/customers", { replace: true, state: { deletedCompanyName: deleted.companyName } });
    },
    [navigate],
  );

  if (!customer) return <Navigate replace to="/customers" />;

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-10 sm:px-6">
      <Link href="/customers">顧客一覧へ戻る</Link>

      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <Typography.Heading level={1}>{customer.companyName}</Typography.Heading>
          <CustomerStatusChip status={customer.status} />
        </div>
        <div className="flex gap-2">
          <Button onPress={() => setIsEditOpen(true)}>編集</Button>
          <Button variant="danger-soft" onPress={() => setIsDeleteOpen(true)}>
            削除
          </Button>
        </div>
      </header>

      {savedMessage ? (
        <Alert role="status" status="success">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>{savedMessage}</Alert.Title>
          </Alert.Content>
        </Alert>
      ) : null}

      <Card>
        <Card.Header>
          <Card.Title>基本情報</Card.Title>
        </Card.Header>
        <Card.Content>
          <dl>
            <DetailRow label="会社名" value={customer.companyName} />
            <DetailRow label="担当者名" value={customer.contactName} />
            <DetailRow label="メールアドレス" value={customer.email} />
            <DetailRow label="電話番号" value={customer.phone} />
            <DetailRow label="ステータス" value={customer.status} />
          </dl>
        </Card.Content>
      </Card>

      <Card>
        <Card.Header>
          <Card.Title>対応状況</Card.Title>
        </Card.Header>
        <Card.Content>
          <Typography.Paragraph>{customer.note}</Typography.Paragraph>
        </Card.Content>
      </Card>

      <CustomerEditDrawer
        customer={customer}
        isOpen={isEditOpen}
        seed={buildEditSeed(demoState, customer)}
        onOpenChange={setIsEditOpen}
        onSaved={handleSaved}
      />

      <DeleteCustomerDialog
        customer={customer}
        isOpen={isDeleteOpen}
        seedFailure={demoState === "delete-failure"}
        onDeleted={handleDeleted}
        onOpenChange={setIsDeleteOpen}
      />
    </main>
  );
}
