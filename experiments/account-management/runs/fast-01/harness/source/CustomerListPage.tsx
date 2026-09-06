import { useState } from "react";
import type { FormEvent } from "react";
import { Alert, Button, Chip, Drawer, Form, Link, SearchField, Table, Toolbar, toast } from "@heroui/react";
import { createCustomer, listCustomerSummaries } from "./fixtures";
import type { CustomerSummary } from "./fixtures";
import {
  CustomerFormFields,
  emptyCustomerForm,
  validateCustomerForm,
} from "./customerForm";
import type { CustomerFieldErrors, CustomerFormValues } from "./customerForm";
import { useScreenState, wait } from "./screenState";

type ColumnId = "companyName" | "contactName" | "lastContactedAt" | "status";

type CustomerColumn = {
  id: ColumnId;
  label: string;
  width: `${number}%`;
  minWidth: number;
  align: "start" | "end";
  isRowHeader: boolean;
  tabular: boolean;
};

// 列のid、見出し、幅、最小幅、揃えを一つの定義配列で管理し、HeaderとRowが同じ定義を参照する
const customerColumns: CustomerColumn[] = [
  { id: "companyName", label: "企業名", width: "38%", minWidth: 240, align: "start", isRowHeader: true, tabular: false },
  { id: "contactName", label: "担当者", width: "22%", minWidth: 160, align: "start", isRowHeader: false, tabular: false },
  { id: "lastContactedAt", label: "最終対応日", width: "22%", minWidth: 160, align: "end", isRowHeader: false, tabular: true },
  { id: "status", label: "ステータス", width: "18%", minWidth: 128, align: "start", isRowHeader: false, tabular: false },
];

function columnClassName(column: CustomerColumn): string | undefined {
  const classNames = [];
  if (column.align === "end") classNames.push("collection-table__cell--end");
  if (column.tabular) classNames.push("table-cell--numeric");
  return classNames.length > 0 ? classNames.join(" ") : undefined;
}

export function CustomerListPage() {
  const screenState = useScreenState();
  const [customers, setCustomers] = useState<CustomerSummary[]>(() =>
    screenState === "empty" ? [] : listCustomerSummaries(),
  );
  const [query, setQuery] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(
    screenState === "create-open" || screenState === "loading" || screenState === "failure",
  );
  const [values, setValues] = useState<CustomerFormValues>(emptyCustomerForm);
  const [fieldErrors, setFieldErrors] = useState<CustomerFieldErrors>({});
  const [createError, setCreateError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(screenState === "loading");

  const keyword = query.trim();
  const visibleCustomers =
    keyword.length === 0
      ? customers
      : customers.filter((customer) => customer.companyName.includes(keyword));

  function handleCreateOpenChange(isOpen: boolean) {
    setIsCreateOpen(isOpen);
    if (!isOpen) {
      setValues(emptyCustomerForm);
      setFieldErrors({});
      setCreateError(null);
    }
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSaving) return;

    const errors = validateCustomerForm(values);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setCreateError(null);
    setIsSaving(true);
    await wait();

    const result = createCustomer(
      {
        companyName: values.companyName,
        contactName: values.contactName,
        email: values.email,
        status: values.status,
      },
      { simulateFailure: screenState === "failure" },
    );
    setIsSaving(false);

    if (!result.ok) {
      setCreateError(result.reason);
      return;
    }

    const created = listCustomerSummaries().find((customer) => customer.id === result.customer.id);
    if (created) setCustomers((previous) => [...previous, created]);
    setValues(emptyCustomerForm);
    setIsCreateOpen(false);
    toast.success("顧客を保存しました");
  }

  const emptyMessage =
    keyword.length > 0
      ? "条件に一致する顧客が見つかりません。企業名を確認してください。"
      : "顧客がまだ登録されていません。「顧客を追加」から登録します。";

  return (
    <main className="page-shell page-shell--stack">
      <div className="page-heading">
        <div className="page-heading__copy">
          <h1>顧客一覧</h1>
          <p>担当する顧客の対応状況を確認します。</p>
        </div>
        <div className="page-heading__action">
          <Drawer isOpen={isCreateOpen} onOpenChange={handleCreateOpenChange}>
            <Drawer.Trigger className="button button--md button--primary">顧客を追加</Drawer.Trigger>
            <Drawer.Backdrop variant="blur">
              <Drawer.Content className="record-drawer" placement="right">
                <Drawer.Dialog>
                  <Drawer.CloseTrigger aria-label="閉じる" />
                  <Form validationBehavior="aria" onSubmit={handleCreate}>
                    <Drawer.Header>
                      <Drawer.Heading>顧客の追加</Drawer.Heading>
                    </Drawer.Header>
                    <Drawer.Body>
                      <div className="drawer-form">
                        {createError && (
                          <Alert status="danger">
                            <Alert.Indicator />
                            <Alert.Content>
                              <Alert.Title>顧客を追加できませんでした</Alert.Title>
                              <Alert.Description>
                                {createError}入力した内容はそのまま残しています。
                              </Alert.Description>
                            </Alert.Content>
                          </Alert>
                        )}
                        <CustomerFormFields
                          errors={fieldErrors}
                          isDisabled={isSaving}
                          values={values}
                          onChange={setValues}
                        />
                      </div>
                    </Drawer.Body>
                    <Drawer.Footer>
                      <Button
                        isDisabled={isSaving}
                        variant="tertiary"
                        onPress={() => handleCreateOpenChange(false)}
                      >
                        キャンセル
                      </Button>
                      <Button isDisabled={isSaving} isPending={isSaving} type="submit" variant="primary">
                        保存する
                      </Button>
                    </Drawer.Footer>
                  </Form>
                </Drawer.Dialog>
              </Drawer.Content>
            </Drawer.Backdrop>
          </Drawer>
        </div>
      </div>

      <div className="collection-region">
        <Toolbar aria-label="顧客一覧の操作" className="collection-toolbar">
          <SearchField
            aria-label="企業名で検索"
            className="search-field"
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
          <Table className="collection-table" variant="primary">
            <Table.ScrollContainer>
              <Table.Content aria-label="顧客">
                <Table.Header>
                  {customerColumns.map((column) => (
                    <Table.Column
                      key={column.id}
                      className={columnClassName(column)}
                      id={column.id}
                      isRowHeader={column.isRowHeader}
                      style={{ minWidth: column.minWidth }}
                      width={column.width}
                    >
                      {column.label}
                    </Table.Column>
                  ))}
                </Table.Header>
                <Table.Body
                  items={visibleCustomers}
                  renderEmptyState={() => <p className="collection-empty">{emptyMessage}</p>}
                >
                  {(customer: CustomerSummary) => (
                    <Table.Row id={customer.id}>
                      {customerColumns.map((column) => (
                        <Table.Cell key={column.id} className={columnClassName(column)}>
                          {column.id === "companyName" && (
                            <Link className="table-link" href={`#/customers/${customer.id}`}>
                              {customer.companyName}
                            </Link>
                          )}
                          {column.id === "contactName" && customer.contactName}
                          {column.id === "lastContactedAt" && customer.lastContactedAt}
                          {column.id === "status" && (
                            <Chip size="sm" variant="soft">
                              <Chip.Label>{customer.status}</Chip.Label>
                            </Chip>
                          )}
                        </Table.Cell>
                      ))}
                    </Table.Row>
                  )}
                </Table.Body>
              </Table.Content>
            </Table.ScrollContainer>
          </Table>
        </div>

        <div className="collection-list-mobile">
          {visibleCustomers.length === 0 ? (
            <p className="collection-empty">{emptyMessage}</p>
          ) : (
            visibleCustomers.map((customer) => (
              <div key={customer.id} className="collection-list-mobile__content">
                <p className="collection-list-mobile__name">{customer.companyName}</p>
                <div className="collection-list-mobile__meta">
                  <span>{customer.contactName}</span>
                  <Chip size="sm" variant="soft">
                    <Chip.Label>{customer.status}</Chip.Label>
                  </Chip>
                </div>
                <div className="collection-list-mobile__meta">
                  <span>最終対応日</span>
                  <span className="numeric-text">{customer.lastContactedAt}</span>
                </div>
                <Link
                  className="link collection-list-mobile__link touch-target"
                  href={`#/customers/${customer.id}`}
                >
                  顧客を確認
                </Link>
              </div>
            ))
          )}
        </div>
      </div>
    </main>
  );
}
