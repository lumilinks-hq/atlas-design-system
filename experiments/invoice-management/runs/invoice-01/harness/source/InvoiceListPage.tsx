import { Link, SearchField, Table, Toolbar } from "@heroui/react";
import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { EmptyState } from "./EmptyState";
import { StatusChip } from "./StatusChip";
import { listInvoiceSummaries } from "./fixtures";
import {
  columnClassName,
  columnStyle,
  formatAmount,
  formatDate,
  hashHref,
  invoiceColumns,
  invoiceDetailPath,
  readScreenState,
} from "./invoice-presentation";
import { useHashNavigation } from "./use-hash-navigation";

/**
 * 請求書一覧。pattern.page-layout#collection-table と
 * pattern.mobile-layout#responsive-collection に従い、
 * 広い画面はTable、狭い画面は同じ順序のリストへ切り替える。
 */
export function InvoiceListPage() {
  const [searchParams] = useSearchParams();
  const screenState = readScreenState(searchParams.get("state"));
  const [keyword, setKeyword] = useState("");
  const goTo = useHashNavigation();

  const allInvoices = useMemo(() => listInvoiceSummaries(), []);
  const invoices = screenState === "empty" ? [] : allInvoices;
  const trimmedKeyword = keyword.trim().toLowerCase();
  const visibleInvoices = trimmedKeyword
    ? invoices.filter((invoice) => invoice.invoiceNumber.toLowerCase().includes(trimmedKeyword))
    : invoices;

  return (
    <main className="page-shell page-shell--stack">
      <header className="page-heading">
        <div className="page-heading__copy">
          <h1>請求書一覧</h1>
          <p>発行済みの請求書と入金状況を確認できます。請求書番号を選ぶと詳細画面へ移動します。</p>
        </div>
      </header>

      {invoices.length === 0 ? (
        <div className="collection-region">
          <EmptyState
            title="請求書がありません"
            description="発行された請求書は、この一覧に表示されます。"
          />
        </div>
      ) : (
        <div className="collection-region">
          <Toolbar aria-label="請求書の絞り込み" className="collection-toolbar">
            <SearchField
              aria-label="請求書番号で検索"
              className="search-field"
              onChange={setKeyword}
              value={keyword}
            >
              <SearchField.Group>
                <SearchField.SearchIcon />
                <SearchField.Input placeholder="請求書番号で検索" />
                <SearchField.ClearButton />
              </SearchField.Group>
            </SearchField>
          </Toolbar>

          {visibleInvoices.length === 0 ? (
            <EmptyState
              title="該当する請求書がありません"
              description="請求書番号を確認して、検索条件を変えてください。"
            />
          ) : (
            <>
              <div className="collection-table-wrap">
                <Table.Root className="collection-table" variant="primary">
                  <Table.ScrollContainer>
                    <Table.Content aria-label="請求書の一覧表">
                      <Table.Header>
                        {invoiceColumns.map((column) => (
                          <Table.Column
                            className={columnClassName(column.id)}
                            id={column.id}
                            isRowHeader={column.isRowHeader}
                            key={column.id}
                            style={columnStyle(column.id)}
                          >
                            {column.label}
                          </Table.Column>
                        ))}
                      </Table.Header>
                      <Table.Body items={visibleInvoices}>
                        {(invoice) => (
                          <Table.Row id={invoice.id}>
                            <Table.Cell className={columnClassName("invoiceNumber")}>
                              <Link
                                className="table-link"
                                href={hashHref(invoiceDetailPath(invoice.id))}
                                onPress={(event) => goTo(invoiceDetailPath(invoice.id), event)}
                              >
                                {invoice.invoiceNumber}
                              </Link>
                            </Table.Cell>
                            <Table.Cell className={columnClassName("customerName")}>
                              {invoice.customerName}
                            </Table.Cell>
                            <Table.Cell className={columnClassName("issuedOn")}>
                              {formatDate(invoice.issuedOn)}
                            </Table.Cell>
                            <Table.Cell className={columnClassName("amount")}>
                              {formatAmount(invoice.amount)}
                            </Table.Cell>
                            <Table.Cell className={columnClassName("status")}>
                              <StatusChip status={invoice.status} />
                            </Table.Cell>
                          </Table.Row>
                        )}
                      </Table.Body>
                    </Table.Content>
                  </Table.ScrollContainer>
                </Table.Root>
              </div>

              <ul className="collection-list-mobile plain-list">
                {visibleInvoices.map((invoice) => (
                  <li className="collection-list-mobile__content collection-list-mobile__card" key={invoice.id}>
                    <div className="collection-list-mobile__meta">
                      <span className="collection-list-mobile__title">{invoice.invoiceNumber}</span>
                      <StatusChip status={invoice.status} />
                    </div>
                    <div className="collection-list-mobile__meta">
                      <span>顧客名</span>
                      <span>{invoice.customerName}</span>
                    </div>
                    <div className="collection-list-mobile__meta">
                      <span>発行日</span>
                      <span className="numeric-text">{formatDate(invoice.issuedOn)}</span>
                    </div>
                    <div className="collection-list-mobile__meta">
                      <span>金額</span>
                      <span className="numeric-text">{formatAmount(invoice.amount)}</span>
                    </div>
                    <Link
                      aria-label={`${invoice.invoiceNumber}の請求書を確認`}
                      className="collection-list-mobile__link touch-target"
                      href={hashHref(invoiceDetailPath(invoice.id))}
                      onPress={(event) => goTo(invoiceDetailPath(invoice.id), event)}
                    >
                      請求書を確認
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </main>
  );
}
