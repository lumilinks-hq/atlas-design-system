import { useState } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import {
  Alert,
  Button,
  EmptyState,
  Heading,
  Paragraph,
  Table,
  useOverlayState,
} from "@heroui/react";
import type { CustomerDetail, CustomerSummary } from "../fixtures";
import { formatContactDate, loadCustomerSummaries } from "../customerService";
import { CustomerCreateModal } from "../components/CustomerCreateModal";
import { StatusChip } from "../components/StatusChip";
import type { DetailScreenState, ListScreenState } from "../screenState";

type CustomerListPageProps = {
  screenState: ListScreenState;
  /** 詳細画面の状態が一覧の URL に指定されたとき、先頭の顧客の詳細へ送るために使う */
  detailScreenStateRequest: DetailScreenState | null;
};

type ListLocationState = { notice?: string } | null;

export function CustomerListPage({
  screenState,
  detailScreenStateRequest,
}: CustomerListPageProps) {
  const location = useLocation();
  // 一覧では要約情報だけを取得する
  const [customers, setCustomers] = useState<CustomerSummary[]>(loadCustomerSummaries);
  const [notice, setNotice] = useState<string | null>(
    (location.state as ListLocationState)?.notice ?? null,
  );
  const [createdIds, setCreatedIds] = useState<string[]>([]);
  const createState = useOverlayState({ defaultOpen: screenState === "create-open" });

  const handleCreated = (customer: CustomerDetail) => {
    createState.close();
    setCreatedIds((current) => [...current, customer.id]);
    setCustomers(loadCustomerSummaries());
    setNotice(`「${customer.companyName}」を追加しました。`);
  };

  if (detailScreenStateRequest && customers.length > 0) {
    return (
      <Navigate
        replace
        to={`/customers/${customers[0].id}?state=${detailScreenStateRequest}`}
      />
    );
  }

  // empty 状態では既存の顧客を伏せ、この画面で追加した顧客だけを反映する
  const visibleCustomers =
    screenState === "empty"
      ? customers.filter((customer) => createdIds.includes(customer.id))
      : customers;

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <Heading level={1}>
            顧客一覧
          </Heading>
          <Paragraph color="muted" size="sm">
            全{visibleCustomers.length}件
          </Paragraph>
        </div>
        <Button variant="primary" onPress={createState.open}>
          顧客を追加
        </Button>
      </header>

      {notice ? (
        <Alert className="mt-6" status="success">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Description>{notice}</Alert.Description>
          </Alert.Content>
        </Alert>
      ) : null}

      {visibleCustomers.length === 0 ? (
        <EmptyState className="mt-6">
          <Heading className="mb-1" level={2}>
            顧客が登録されていません
          </Heading>
          <Paragraph className="mb-5" color="muted" size="sm">
            顧客を追加すると、ここに一覧が表示されます。
          </Paragraph>
          <Button variant="primary" onPress={createState.open}>
            顧客を追加
          </Button>
        </EmptyState>
      ) : (
        <Table className="mt-6">
          <Table.ScrollContainer>
            <Table.Content aria-label="顧客一覧">
              <Table.Header>
                <Table.Column isRowHeader>企業名</Table.Column>
                <Table.Column>担当者</Table.Column>
                <Table.Column>最終対応日</Table.Column>
                <Table.Column>ステータス</Table.Column>
              </Table.Header>
              <Table.Body>
                {visibleCustomers.map((customer) => (
                  <Table.Row key={customer.id} id={customer.id}>
                    <Table.Cell>
                      <Link
                        className="font-medium text-link underline-offset-4 hover:underline"
                        to={`/customers/${customer.id}`}
                      >
                        {customer.companyName}
                      </Link>
                    </Table.Cell>
                    <Table.Cell>{customer.contactName}</Table.Cell>
                    <Table.Cell>{formatContactDate(customer.lastContactedAt)}</Table.Cell>
                    <Table.Cell>
                      <StatusChip status={customer.status} />
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Content>
          </Table.ScrollContainer>
        </Table>
      )}

      <CustomerCreateModal state={createState} onCreated={handleCreated} />
    </main>
  );
}
