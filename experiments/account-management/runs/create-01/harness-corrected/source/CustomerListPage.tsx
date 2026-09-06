import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Card, Chip, SearchField, Table, toast, Toolbar } from "@heroui/react";
import { createCustomer, listCustomerSummaries, type CustomerSummary } from "./fixtures";
import {
  CREATE_FAILURE_REASON,
  EMAIL_FORMAT_ERROR,
  SAVE_SUCCESS_MESSAGE,
  formatContactDate,
  statusColor,
  type CustomerFormValues,
} from "./customerModel";
import { CustomerFormDrawer } from "./CustomerFormDrawer";
import { useScreenState } from "./screenState";

/** example.account-management の componentUsage["component.table"].columns をそのまま持つ定義 */
type CustomerColumn = {
  id: "companyName" | "contactName" | "lastContactedAt" | "status";
  label: string;
  width: string;
  minWidth: number;
  align: "start" | "end";
  isRowHeader?: boolean;
  tabular?: boolean;
};

const CUSTOMER_COLUMNS: CustomerColumn[] = [
  { id: "companyName", label: "企業名", isRowHeader: true, width: "38%", minWidth: 240, align: "start" },
  { id: "contactName", label: "担当者", width: "22%", minWidth: 160, align: "start" },
  { id: "lastContactedAt", label: "最終対応日", width: "22%", minWidth: 160, align: "end", tabular: true },
  { id: "status", label: "ステータス", width: "18%", minWidth: 128, align: "start" },
];

const EMPTY_FORM_VALUES: CustomerFormValues = {
  companyName: "",
  contactName: "",
  email: "",
  status: "商談中",
};

const INVALID_EMAIL_VALUES: CustomerFormValues = {
  companyName: "株式会社ノーススター",
  contactName: "佐藤 葵",
  email: "aoi.sato",
  status: "商談中",
};

export function CustomerListPage() {
  const screenState = useScreenState();
  const [customers, setCustomers] = useState<CustomerSummary[]>(() =>
    screenState === "empty" ? [] : listCustomerSummaries(),
  );
  const [query, setQuery] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(
    screenState === "create-open" ||
      screenState === "invalid-email" ||
      screenState === "loading" ||
      screenState === "failure",
  );
  const [isSaving, setIsSaving] = useState(screenState === "loading");
  const [failureReason, setFailureReason] = useState(
    screenState === "failure" ? CREATE_FAILURE_REASON : "",
  );
  const notifiedRef = useRef(false);

  useEffect(() => {
    if (screenState !== "success" || notifiedRef.current) return;
    notifiedRef.current = true;
    toast.success(SAVE_SUCCESS_MESSAGE, { description: "顧客一覧に反映しました。" });
  }, [screenState]);

  const visibleCustomers = useMemo(() => {
    const keyword = query.trim();
    if (keyword.length === 0) return customers;
    return customers.filter((customer) => customer.companyName.includes(keyword));
  }, [customers, query]);

  function handleCreate(values: CustomerFormValues) {
    setIsSaving(true);
    setFailureReason("");
    // 保存中を実際に通過させ、二重送信を防ぐ
    window.setTimeout(() => {
      const result = createCustomer(values, { simulateFailure: screenState === "failure" });
      setIsSaving(false);
      if (!result.ok) {
        setFailureReason(result.reason);
        return;
      }
      setCustomers(listCustomerSummaries());
      setIsCreateOpen(false);
      setFailureReason("");
      toast.success(SAVE_SUCCESS_MESSAGE, { description: "顧客一覧に反映しました。" });
    }, 200);
  }

  return (
    <main className="page-shell page-shell--stack">
      <div className="page-heading">
        <div className="page-heading__copy">
          <h1>顧客一覧</h1>
          <p>担当している顧客の対応状況を確認し、新しい顧客を追加できます。</p>
        </div>
        <div className="page-heading__action">
          <CustomerFormDrawer
            triggerLabel="顧客を追加"
            triggerVariantClass="button button--md button--primary"
            heading="顧客の追加"
            description="新しい顧客の基本情報を登録します。"
            closeLabel="追加を閉じる"
            initialValues={screenState === "invalid-email" ? INVALID_EMAIL_VALUES : EMPTY_FORM_VALUES}
            initialErrors={screenState === "invalid-email" ? { email: EMAIL_FORMAT_ERROR } : undefined}
            isOpen={isCreateOpen}
            onOpenChange={setIsCreateOpen}
            isSaving={isSaving}
            failureReason={failureReason}
            onSubmit={handleCreate}
          />
        </div>
      </div>

      <div className="collection-region">
        <Toolbar className="collection-toolbar" aria-label="顧客の絞り込み">
          <SearchField
            className="search-field"
            aria-label="企業名で検索"
            value={query}
            onChange={setQuery}
          >
            <SearchField.Group>
              <SearchField.SearchIcon />
              <SearchField.Input placeholder="企業名で検索" />
              <SearchField.ClearButton />
            </SearchField.Group>
          </SearchField>
        </Toolbar>

        <div className="collection-table-wrap">
          <Table variant="primary" className="collection-table">
            <Table.ScrollContainer>
              <Table.Content aria-label="顧客">
                <Table.Header columns={CUSTOMER_COLUMNS}>
                  {(column) => (
                    <Table.Column
                      id={column.id}
                      isRowHeader={column.isRowHeader ?? false}
                      style={{ width: column.width, minWidth: column.minWidth, textAlign: column.align }}
                    >
                      {column.label}
                    </Table.Column>
                  )}
                </Table.Header>
                <Table.Body
                  items={visibleCustomers}
                  renderEmptyState={() => <p className="empty-state">{emptyMessage(customers.length)}</p>}
                >
                  {(customer) => (
                    <Table.Row id={customer.id} columns={CUSTOMER_COLUMNS}>
                      {(column) => (
                        <Table.Cell
                          className={column.tabular ? "table-cell--numeric" : undefined}
                          style={{ textAlign: column.align }}
                        >
                          {column.id === "companyName" ? (
                            <Link className="link table-link" to={`/customers/${customer.id}`}>
                              {customer.companyName}
                            </Link>
                          ) : column.id === "contactName" ? (
                            customer.contactName
                          ) : column.id === "lastContactedAt" ? (
                            <span className="numeric-text">{formatContactDate(customer.lastContactedAt)}</span>
                          ) : (
                            <Chip color={statusColor(customer.status)} variant="soft" size="sm">
                              {customer.status}
                            </Chip>
                          )}
                        </Table.Cell>
                      )}
                    </Table.Row>
                  )}
                </Table.Body>
              </Table.Content>
            </Table.ScrollContainer>
          </Table>
        </div>

        <div className="collection-list-mobile">
          {visibleCustomers.length === 0 ? (
            <p className="empty-state">{emptyMessage(customers.length)}</p>
          ) : (
            visibleCustomers.map((customer) => (
              <Card key={customer.id}>
                <Card.Header>
                  <Card.Title>{customer.companyName}</Card.Title>
                </Card.Header>
                <Card.Content>
                  <div className="collection-list-mobile__content">
                    <div className="collection-list-mobile__meta">
                      <span>{customer.contactName}</span>
                      <Chip color={statusColor(customer.status)} variant="soft" size="sm">
                        {customer.status}
                      </Chip>
                    </div>
                    <div className="collection-list-mobile__meta">
                      <span>最終対応日</span>
                      <span className="numeric-text">{formatContactDate(customer.lastContactedAt)}</span>
                    </div>
                    <Link
                      className="link button button--md button--outline collection-list-mobile__link touch-target"
                      aria-label={`${customer.companyName}の詳細を確認`}
                      to={`/customers/${customer.id}`}
                    >
                      顧客を確認
                    </Link>
                  </div>
                </Card.Content>
              </Card>
            ))
          )}
        </div>
      </div>
    </main>
  );
}

function emptyMessage(total: number): string {
  if (total === 0) return "登録されている顧客はありません。「顧客を追加」から最初の顧客を登録してください。";
  return "条件に一致する顧客が見つかりません。検索条件を変えて確認してください。";
}
