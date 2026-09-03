import { Alert, EmptyState, Link, Table, Typography } from "@heroui/react";
import { useMemo } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import { CustomerStatusChip } from "./CustomerStatus";
import { readCustomerSummaries } from "./customerApi";
import { readListDemoState } from "./demoState";
import type { CustomerSummary } from "./fixtures";

type ListLocationState = { deletedCompanyName?: string } | null;

function formatDate(isoDate: string): string {
  const [year, month, day] = isoDate.split("-");
  return `${year}/${month}/${day}`;
}

export function CustomerListPage() {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const demoState = readListDemoState(searchParams);
  const deletedCompanyName = (location.state as ListLocationState)?.deletedCompanyName;

  // 一覧では要約情報だけを読み込む。削除後に戻ったときも読み直す。
  const customers = useMemo<CustomerSummary[]>(
    () => (demoState === "empty" ? [] : readCustomerSummaries()),
    [demoState, location.key],
  );

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-10 sm:px-6">
      <Typography.Heading level={1}>顧客一覧</Typography.Heading>

      {deletedCompanyName ? (
        <Alert role="status" status="success">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>「{deletedCompanyName}」を削除しました</Alert.Title>
          </Alert.Content>
        </Alert>
      ) : null}

      {customers.length === 0 ? (
        <EmptyState>
          <Typography.Heading level={2}>顧客が登録されていません</Typography.Heading>
          <Typography.Paragraph color="muted">
            顧客が登録されると、ここに一覧が表示されます。
          </Typography.Paragraph>
        </EmptyState>
      ) : (
        <Table>
          <Table.ScrollContainer>
            <Table.Content aria-label="顧客一覧">
              <Table.Header>
                <Table.Column isRowHeader>企業名</Table.Column>
                <Table.Column>担当者</Table.Column>
                <Table.Column>最終対応日</Table.Column>
                <Table.Column>ステータス</Table.Column>
              </Table.Header>
              <Table.Body items={customers}>
                {(customer) => (
                  <Table.Row>
                    <Table.Cell>
                      <Link href={`/customers/${customer.id}`}>{customer.companyName}</Link>
                    </Table.Cell>
                    <Table.Cell>{customer.contactName}</Table.Cell>
                    <Table.Cell>{formatDate(customer.lastContactedAt)}</Table.Cell>
                    <Table.Cell>
                      <CustomerStatusChip status={customer.status} />
                    </Table.Cell>
                  </Table.Row>
                )}
              </Table.Body>
            </Table.Content>
          </Table.ScrollContainer>
        </Table>
      )}
    </main>
  );
}
