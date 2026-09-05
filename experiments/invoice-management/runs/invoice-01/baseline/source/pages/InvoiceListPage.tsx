import { Alert, Button, EmptyState, Link, Table, Typography } from "@heroui/react";
import { useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { PageShell } from "../components/PageShell";
import { StatusChip } from "../components/StatusChip";
import { listInvoiceSummaries } from "../fixtures";
import { formatAmount, formatDate } from "../format";
import { applySavedEditsToSummary } from "../invoiceApi";
import { useListScreenState } from "../screenState";

type VoidedNotice = { voidedInvoiceNumber?: string };

export function InvoiceListPage() {
  const screenState = useListScreenState();
  const location = useLocation();
  const voidedInvoiceNumber = (location.state as VoidedNotice | null)?.voidedInvoiceNumber;
  const [isNoticeVisible, setNoticeVisible] = useState(true);

  // 一覧では要約情報だけを取得する。
  const invoices = useMemo(
    () => (screenState === "empty" ? [] : listInvoiceSummaries().map(applySavedEditsToSummary)),
    [screenState],
  );

  return (
    <PageShell>
      <header className="flex flex-col gap-1">
        <Typography.Heading className="text-2xl" level={1}>
          請求書一覧
        </Typography.Heading>
        <Typography.Paragraph className="text-muted" size="sm">
          {invoices.length > 0
            ? `${invoices.length}件の請求書があります。請求書番号を選ぶと詳細を確認できます。`
            : "表示できる請求書はありません。"}
        </Typography.Paragraph>
      </header>

      {voidedInvoiceNumber && isNoticeVisible ? (
        <Alert status="success">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>{voidedInvoiceNumber}を無効化しました</Alert.Title>
            <Alert.Description>この請求書は一覧から削除されました。</Alert.Description>
          </Alert.Content>
          <Button
            aria-label="通知を閉じる"
            onPress={() => setNoticeVisible(false)}
            size="sm"
            variant="ghost"
          >
            閉じる
          </Button>
        </Alert>
      ) : null}

      {invoices.length === 0 ? (
        <EmptyState className="rounded-xl border border-border bg-surface py-16">
          <Typography.Heading className="text-base" level={2}>
            請求書がありません
          </Typography.Heading>
          <Typography.Paragraph className="text-muted" size="sm">
            請求書を発行すると、ここに一覧が表示されます。
          </Typography.Paragraph>
        </EmptyState>
      ) : (
        <Table>
          <Table.ScrollContainer>
            <Table.Content aria-label="請求書一覧">
              <Table.Header>
                <Table.Column id="invoiceNumber" isRowHeader>
                  請求書番号
                </Table.Column>
                <Table.Column id="customerName">顧客名</Table.Column>
                <Table.Column id="issuedOn">発行日</Table.Column>
                <Table.Column className="text-right" id="amount">
                  金額
                </Table.Column>
                <Table.Column id="status">ステータス</Table.Column>
              </Table.Header>
              <Table.Body items={invoices}>
                {(invoice) => (
                  <Table.Row id={invoice.id}>
                    <Table.Cell>
                      <Link href={`/invoices/${invoice.id}`}>{invoice.invoiceNumber}</Link>
                    </Table.Cell>
                    <Table.Cell>{invoice.customerName}</Table.Cell>
                    <Table.Cell>{formatDate(invoice.issuedOn)}</Table.Cell>
                    <Table.Cell className="text-right tabular-nums">
                      {formatAmount(invoice.amount)}
                    </Table.Cell>
                    <Table.Cell>
                      <StatusChip status={invoice.status} />
                    </Table.Cell>
                  </Table.Row>
                )}
              </Table.Body>
            </Table.Content>
          </Table.ScrollContainer>
        </Table>
      )}
    </PageShell>
  );
}
