import { Card, SearchField, Table, Toolbar, cn } from "@heroui/react";
import { useMemo, useState, type ReactNode } from "react";
import { Link as RouterLink } from "react-router-dom";
import { CustomerStatusChip } from "./CustomerStatusChip";
import { useCustomerSummaries } from "./customerStore";
import type { CustomerSummary } from "./fixtures";
import type { ListScreenState } from "./screenState";

type CustomerColumn = {
  id: string;
  label: string;
  isRowHeader?: boolean;
  width: string;
  minWidth: number;
  align: "start" | "end";
  tabular?: boolean;
  renderCell: (customer: CustomerSummary) => ReactNode;
};

/** HeaderとRowが共有する列定義。順序、幅、揃え、row headerをここだけで管理する。 */
const CUSTOMER_COLUMNS: CustomerColumn[] = [
  {
    id: "companyName",
    label: "企業名",
    isRowHeader: true,
    width: "38%",
    minWidth: 240,
    align: "start",
    renderCell: (customer) => (
      <RouterLink className={cn("link", "table-link")} to={`/customers/${customer.id}`}>
        {customer.companyName}
      </RouterLink>
    ),
  },
  {
    id: "contactName",
    label: "担当者",
    width: "22%",
    minWidth: 160,
    align: "start",
    renderCell: (customer) => customer.contactName,
  },
  {
    id: "lastContactedAt",
    label: "最終対応日",
    width: "22%",
    minWidth: 160,
    align: "end",
    tabular: true,
    renderCell: (customer) => customer.lastContactedAt,
  },
  {
    id: "status",
    label: "ステータス",
    width: "18%",
    minWidth: 128,
    align: "start",
    renderCell: (customer) => <CustomerStatusChip status={customer.status} />,
  },
];

function columnClassName(column: CustomerColumn): string {
  return cn(column.align === "end" && "table-cell--end", column.tabular && "table-cell--numeric") ?? "";
}

export function CustomerListPage({ screenState }: { screenState: ListScreenState }) {
  const [keyword, setKeyword] = useState("");
  const allCustomers = useCustomerSummaries();
  const customers = screenState === "empty" ? [] : allCustomers;

  const visibleCustomers = useMemo(() => {
    const trimmed = keyword.trim();
    if (!trimmed) return customers;
    return customers.filter((customer) => customer.companyName.includes(trimmed));
  }, [customers, keyword]);

  const emptyMessage =
    customers.length === 0
      ? "顧客がまだ登録されていません。"
      : "条件に一致する顧客がありません。企業名を変えて検索してください。";

  return (
    <main className="page-shell page-shell--stack">
      <div className="page-heading">
        <div className="page-heading__copy">
          <h1>顧客一覧</h1>
          <p>担当している顧客の対応状況を確認します。</p>
        </div>
      </div>

      <div className="collection-region">
        <Toolbar aria-label="顧客一覧の操作" className="collection-toolbar">
          <SearchField
            aria-label="企業名で検索"
            className="search-field"
            onChange={setKeyword}
            value={keyword}
          >
            <SearchField.Group>
              <SearchField.SearchIcon />
              <SearchField.Input placeholder="企業名で検索" />
              <SearchField.ClearButton aria-label="検索条件を消す" />
            </SearchField.Group>
          </SearchField>
        </Toolbar>

        <div className="collection-table-wrap">
          <Table className="collection-table" variant="primary">
            <Table.ScrollContainer>
              <Table.Content aria-label="顧客">
                <Table.Header>
                  {CUSTOMER_COLUMNS.map((column) => (
                    <Table.Column
                      className={columnClassName(column)}
                      id={column.id}
                      isRowHeader={column.isRowHeader}
                      key={column.id}
                      style={{ minWidth: column.minWidth, width: column.width }}
                    >
                      {column.label}
                    </Table.Column>
                  ))}
                </Table.Header>
                <Table.Body
                  items={visibleCustomers}
                  renderEmptyState={() => <p className="collection-empty">{emptyMessage}</p>}
                >
                  {(customer) => (
                    <Table.Row id={customer.id}>
                      {CUSTOMER_COLUMNS.map((column) => (
                        <Table.Cell className={columnClassName(column)} key={column.id}>
                          {column.renderCell(customer)}
                        </Table.Cell>
                      ))}
                    </Table.Row>
                  )}
                </Table.Body>
              </Table.Content>
            </Table.ScrollContainer>
          </Table>
        </div>

        <ul className="collection-list-mobile">
          {visibleCustomers.length === 0 ? (
            <li>
              <p className="collection-empty">{emptyMessage}</p>
            </li>
          ) : (
            visibleCustomers.map((customer) => (
              <li key={customer.id}>
                <Card>
                  <Card.Header>
                    <Card.Title>{customer.companyName}</Card.Title>
                  </Card.Header>
                  <Card.Content className="collection-list-mobile__content">
                    <div className="collection-list-mobile__meta">
                      <span>{customer.contactName}</span>
                      <span className="numeric-text">{customer.lastContactedAt}</span>
                    </div>
                    <CustomerStatusChip status={customer.status} />
                    <RouterLink
                      aria-label={`${customer.companyName}の詳細を開く`}
                      className={cn("link", "collection-list-mobile__link")}
                      to={`/customers/${customer.id}`}
                    >
                      詳細を開く
                    </RouterLink>
                  </Card.Content>
                </Card>
              </li>
            ))
          )}
        </ul>
      </div>
    </main>
  );
}
