import { Alert, Card } from "@heroui/react";
import { useState, type ReactNode } from "react";
import { Link as RouterLink, Navigate } from "react-router-dom";
import { CustomerEditDrawer } from "./CustomerEditDrawer";
import { CustomerStatusChip } from "./CustomerStatusChip";
import { DeleteCustomerDialog } from "./DeleteCustomerDialog";
import { useCustomerDetail } from "./customerStore";
import type { DetailScreenState } from "./screenState";

function DetailField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="detail-field__label">{label}</dt>
      <dd className="detail-field__value">{children}</dd>
    </div>
  );
}

export function CustomerDetailPage({
  customerId,
  screenState,
}: {
  customerId: string;
  screenState: DetailScreenState;
}) {
  const customer = useCustomerDetail(customerId);
  const [isSaved, setIsSaved] = useState(screenState === "success");

  if (!customer) {
    return <Navigate replace to="/customers" />;
  }

  return (
    <main className="page-shell page-shell--stack">
      <div className="detail-page__heading">
        <div>
          <RouterLink className="link" to="/customers">
            顧客一覧へ戻る
          </RouterLink>
        </div>

        <div className="page-heading">
          <div className="page-heading__copy">
            <h1>{customer.companyName}</h1>
            <p>登録されている連絡先と対応状況を確認します。</p>
          </div>
          <div className="page-heading__action">
            <div className="page-heading__actions">
              <CustomerEditDrawer
                customer={customer}
                onSaved={() => setIsSaved(true)}
                screenState={screenState}
              />
              <DeleteCustomerDialog customer={customer} screenState={screenState} />
            </div>
          </div>
        </div>
      </div>

      <div className="detail-grid">
        {isSaved ? (
          <Alert status="success">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Title>顧客情報を保存しました</Alert.Title>
              <Alert.Description>編集した内容を反映しました。</Alert.Description>
            </Alert.Content>
          </Alert>
        ) : null}

        <Card>
          <Card.Header>
            <Card.Title>基本情報</Card.Title>
          </Card.Header>
          <Card.Content>
            <dl className="detail-content">
              <DetailField label="会社名">{customer.companyName}</DetailField>
              <DetailField label="担当者名">{customer.contactName}</DetailField>
              <DetailField label="メールアドレス">{customer.email}</DetailField>
              <DetailField label="電話番号">{customer.phone}</DetailField>
              <DetailField label="ステータス">
                <CustomerStatusChip status={customer.status} />
              </DetailField>
            </dl>
          </Card.Content>
        </Card>

        <Card>
          <Card.Header>
            <Card.Title>対応メモ</Card.Title>
          </Card.Header>
          <Card.Content>
            <p className="detail-field__value">{customer.note}</p>
          </Card.Content>
        </Card>
      </div>
    </main>
  );
}
