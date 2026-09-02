import {
  Alert,
  AlertDialog,
  Button,
  Card,
  Chip,
  Description,
  Drawer,
  FieldError,
  Form,
  Input,
  Label,
  Link,
  ListBox,
  SearchField,
  Select,
  Table,
  TextField,
  Toast,
  Toolbar,
  toast,
} from "@heroui/react";
import { useEffect, useId, useState } from "react";
import { HashRouter, Navigate, Route, Routes, useLocation, useNavigate, useParams } from "react-router-dom";
import {
  type CustomerDetail,
  type CustomerStatus,
  type CustomerSummary,
  deleteCustomer,
  getCustomerDetail,
  listCustomerSummaries,
  updateCustomer,
} from "./fixtures";

const DETAIL_DELAY_MS = 120;

const STATUS_OPTIONS: Array<{ id: CustomerStatus; label: CustomerStatus }> = [
  { id: "商談中", label: "商談中" },
  { id: "利用中", label: "利用中" },
  { id: "休眠", label: "休眠" },
];

type CustomerTableColumn = {
  id: "companyName" | "contactName" | "lastContactedAt" | "status";
  label: string;
  width: string;
  minWidth: number;
  align: "start" | "end";
  isRowHeader?: boolean;
  tabular?: boolean;
};

const CUSTOMER_TABLE_COLUMNS: CustomerTableColumn[] = [
  {
    id: "companyName",
    label: "企業名",
    width: "38%",
    minWidth: 240,
    align: "start" as const,
    isRowHeader: true,
  },
  {
    id: "contactName",
    label: "担当者",
    width: "22%",
    minWidth: 160,
    align: "start" as const,
  },
  {
    id: "lastContactedAt",
    label: "最終対応日",
    width: "22%",
    minWidth: 160,
    align: "end" as const,
    tabular: true,
  },
  {
    id: "status",
    label: "ステータス",
    width: "18%",
    minWidth: 128,
    align: "start" as const,
  },
];

const DETAIL_STATE_NAMES = new Set([
  "default",
  "drawer-open",
  "invalid-email",
  "loading",
  "success",
  "failure",
  "delete-confirm",
] as const);

type DetailDemoState =
  | "default"
  | "drawer-open"
  | "invalid-email"
  | "loading"
  | "success"
  | "failure"
  | "delete-confirm";

type EditableCustomerFields = Pick<
  CustomerDetail,
  "companyName" | "contactName" | "email" | "status"
>;

type FormErrors = Partial<Record<keyof EditableCustomerFields, string>>;
type FeedbackTone = "success" | "danger";
type SaveMessage = { tone: FeedbackTone; title: string; description: string };
type DetailViewModel = {
  customer: CustomerDetail | null;
  draft: EditableCustomerFields | null;
  isEditOpen: boolean;
  isDeleteOpen: boolean;
  errors: FormErrors;
  saveMessage: SaveMessage | null;
};

function getCompanyHref(customerId: string, state?: string) {
  return state ? `#/customers/${customerId}?state=${state}` : `#/customers/${customerId}`;
}

function getListHref(state?: string) {
  return state ? `#/customers?state=${state}` : "#/customers";
}

function getStatusVariant(status: CustomerStatus) {
  if (status === "利用中") return "secondary";
  if (status === "商談中") return "primary";
  return "tertiary";
}

function isEmailValid(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function toDraft(customer: CustomerDetail): EditableCustomerFields {
  return {
    companyName: customer.companyName,
    contactName: customer.contactName,
    email: customer.email,
    status: customer.status,
  };
}

function toDemoDraft(customer: CustomerDetail): EditableCustomerFields {
  return {
    companyName: `${customer.companyName} CS支援`,
    contactName: `${customer.contactName} 担当`,
    email: "team-success@example.com",
    status: "商談中",
  };
}

function getInitialListItems(listState: string | null) {
  return listState === "empty" ? [] : listCustomerSummaries();
}

function getDetailState(rawState: string | null): DetailDemoState {
  if (rawState && DETAIL_STATE_NAMES.has(rawState as DetailDemoState)) {
    return rawState as DetailDemoState;
  }
  return "default";
}

function getInitialDetailViewModel(customerId: string, detailState: DetailDemoState): DetailViewModel {
  const loadedCustomer = getCustomerDetail(customerId);

  if (!loadedCustomer) {
    return {
      customer: null,
      draft: null,
      isEditOpen: false,
      isDeleteOpen: false,
      errors: {},
      saveMessage: null,
    };
  }

  const nextDraft = toDraft(loadedCustomer);
  const demoDraft = toDemoDraft(loadedCustomer);

  return {
    customer: detailState === "success" ? { ...loadedCustomer, ...demoDraft } : loadedCustomer,
    draft:
      detailState === "drawer-open"
        ? nextDraft
        : detailState === "invalid-email"
          ? { ...demoDraft, email: "invalid-email" }
          : detailState === "loading" || detailState === "failure"
            ? demoDraft
            : nextDraft,
    isEditOpen:
      detailState === "drawer-open" ||
      detailState === "invalid-email" ||
      detailState === "loading" ||
      detailState === "failure",
    isDeleteOpen: detailState === "delete-confirm",
    errors: detailState === "invalid-email" ? { email: "メールアドレスの形式を確認してください。" } : {},
    saveMessage:
      detailState === "success"
        ? {
            tone: "success",
            title: "顧客情報を更新しました",
            description: "変更した会社名、担当者、メールアドレス、ステータスを詳細へ反映しました。",
          }
        : detailState === "failure"
          ? {
              tone: "danger",
              title: "顧客情報を更新できませんでした",
              description: "入力内容を保持したまま再試行できます。",
            }
          : null,
  };
}

function AppHeader() {
  return (
    <header className="app-header">
      <div className="page-shell app-header__inner">
        <div>
          <p className="app-header__eyebrow">営業・CS</p>
          <strong>顧客管理</strong>
        </div>
      </div>
    </header>
  );
}

function useIsNarrowLayout() {
  const getMatches = () => window.matchMedia("(max-width: 767px)").matches;
  const [isNarrow, setIsNarrow] = useState(getMatches);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 767px)");
    const handleChange = (event: MediaQueryListEvent) => setIsNarrow(event.matches);

    setIsNarrow(mediaQuery.matches);
    mediaQuery.addEventListener("change", handleChange);

    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  return isNarrow;
}

function PageFeedback({
  title,
  description,
  tone = "success",
}: {
  title: string;
  description: string;
  tone?: FeedbackTone;
}) {
  return (
    <Alert.Root status={tone}>
      <Alert.Content>
        <Alert.Title>{title}</Alert.Title>
        <Alert.Description>{description}</Alert.Description>
      </Alert.Content>
    </Alert.Root>
  );
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <Card.Root className="empty-state">
      <Card.Header>
        <Card.Title>{title}</Card.Title>
        <Card.Description>{description}</Card.Description>
      </Card.Header>
    </Card.Root>
  );
}

function CustomerSummaryTable({
  items,
  detailState,
  isNarrow,
}: {
  items: CustomerSummary[];
  detailState?: string;
  isNarrow: boolean;
}) {
  return (
    <>
      {isNarrow ? (
        <div className="collection-list-mobile" aria-label="顧客一覧モバイル">
          {items.map((customer) => (
            <Card.Root key={customer.id}>
              <Card.Header>
                <Card.Title>
                  <Link href={getCompanyHref(customer.id, detailState)} className="table-link">
                    {customer.companyName}
                  </Link>
                </Card.Title>
                <Card.Description>{customer.contactName}</Card.Description>
              </Card.Header>
              <Card.Content className="collection-list-mobile__content">
                <div className="collection-list-mobile__meta">
                  <span>最終対応日</span>
                  <span className="numeric-text">{customer.lastContactedAt}</span>
                </div>
                <div>
                  <Chip.Root variant={getStatusVariant(customer.status)}>
                    <Chip.Label>{customer.status}</Chip.Label>
                  </Chip.Root>
                </div>
              </Card.Content>
            </Card.Root>
          ))}
        </div>
      ) : (
        <div className="collection-table-wrap">
          <Table.Root variant="primary" aria-label="顧客一覧" className="collection-table">
            <Table.ScrollContainer>
              <Table.Content>
                <Table.Header columns={CUSTOMER_TABLE_COLUMNS}>
                  {(column) => (
                    <Table.Column
                      key={column.id}
                      id={column.id}
                      isRowHeader={column.isRowHeader}
                      style={{ width: column.width, minWidth: column.minWidth, textAlign: column.align }}
                    >
                      {column.label}
                    </Table.Column>
                  )}
                </Table.Header>
                <Table.Body items={items}>
                  {(customer) => (
                    <Table.Row id={customer.id}>
                      {CUSTOMER_TABLE_COLUMNS.map((column) => (
                        <Table.Cell
                          key={column.id}
                          className={column.tabular ? "table-cell--numeric" : undefined}
                          style={{ textAlign: column.align }}
                        >
                          {column.id === "companyName" ? (
                            <Link href={getCompanyHref(customer.id, detailState)} className="table-link">
                              {customer.companyName}
                            </Link>
                          ) : null}
                          {column.id === "contactName" ? customer.contactName : null}
                          {column.id === "lastContactedAt" ? customer.lastContactedAt : null}
                          {column.id === "status" ? (
                            <Chip.Root variant={getStatusVariant(customer.status)}>
                              <Chip.Label>{customer.status}</Chip.Label>
                            </Chip.Root>
                          ) : null}
                        </Table.Cell>
                      ))}
                    </Table.Row>
                  )}
                </Table.Body>
              </Table.Content>
            </Table.ScrollContainer>
          </Table.Root>
        </div>
      )}
    </>
  );
}

function CustomerListPage({
  dataVersion,
}: {
  dataVersion: number;
}) {
  const location = useLocation();
  const listState = new URLSearchParams(location.search).get("state");
  const detailState = listState && DETAIL_STATE_NAMES.has(listState as DetailDemoState) ? listState : undefined;
  const isNarrow = useIsNarrowLayout();
  const [searchValue, setSearchValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [items, setItems] = useState<CustomerSummary[]>(() => getInitialListItems(listState));

  useEffect(() => {
    setItems(getInitialListItems(listState));
    setIsLoading(false);
  }, [dataVersion, listState]);

  const filteredItems = items.filter((customer) => customer.companyName.includes(searchValue.trim()));

  return (
    <main className="page-shell page-shell--stack">
      <div className="page-heading">
        <div className="page-heading__copy">
          <h1>顧客一覧</h1>
          <p>企業名で顧客を探し、選択した会社の詳細画面で基本情報と対応状況を確認します。</p>
        </div>
      </div>

      <section className="collection-region" aria-label="顧客一覧セクション">
        <Toolbar.Root aria-label="顧客一覧の検索" className="collection-toolbar">
          <SearchField.Root
            aria-label="企業名で検索"
            className="search-field"
            value={searchValue}
            onChange={setSearchValue}
          >
            <SearchField.Group>
              <SearchField.SearchIcon />
              <SearchField.Input placeholder="企業名で検索" />
              <SearchField.ClearButton aria-label="検索条件をクリア" />
            </SearchField.Group>
          </SearchField.Root>
        </Toolbar.Root>

        {isLoading ? (
          <EmptyState title="顧客情報を読み込んでいます" description="一覧の要約情報を取得しています。" />
        ) : filteredItems.length === 0 ? (
          <EmptyState
            title={searchValue ? "該当する顧客がありません" : "顧客がありません"}
            description={
              searchValue
                ? "企業名を変えて再検索してください。"
                : "顧客が追加されると、ここに企業名、担当者、最終対応日、ステータスを表示します。"
            }
          />
        ) : (
          <CustomerSummaryTable items={filteredItems} detailState={detailState} isNarrow={isNarrow} />
        )}
      </section>
    </main>
  );
}

function DetailSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <Card.Root>
      <Card.Header>
        <Card.Title>{title}</Card.Title>
        {description ? <Card.Description>{description}</Card.Description> : null}
      </Card.Header>
      <Card.Content className="detail-section__content">{children}</Card.Content>
    </Card.Root>
  );
}

function DetailRow({ label, value, numeric = false }: { label: string; value: React.ReactNode; numeric?: boolean }) {
  return (
    <div className="detail-row">
      <dt>{label}</dt>
      <dd className={numeric ? "numeric-text" : undefined}>{value}</dd>
    </div>
  );
}

function CustomerDetailPage({
  onDataChange,
}: {
  onDataChange: () => void;
}) {
  const detailDescriptionId = useId();
  const { customerId = "" } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const detailState = getDetailState(new URLSearchParams(location.search).get("state"));
  const initialViewModel = getInitialDetailViewModel(customerId, detailState);
  const [isLoading, setIsLoading] = useState(false);
  const [customer, setCustomer] = useState<CustomerDetail | null>(initialViewModel.customer);
  const [isEditOpen, setIsEditOpen] = useState(initialViewModel.isEditOpen);
  const [isDeleteOpen, setIsDeleteOpen] = useState(initialViewModel.isDeleteOpen);
  const [draft, setDraft] = useState<EditableCustomerFields | null>(initialViewModel.draft);
  const [errors, setErrors] = useState<FormErrors>(initialViewModel.errors);
  const [saveMessage, setSaveMessage] = useState<SaveMessage | null>(initialViewModel.saveMessage);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [simulateSaveFailureOnce, setSimulateSaveFailureOnce] = useState(detailState === "failure");
  const [simulateDeleteFailureOnce, setSimulateDeleteFailureOnce] = useState(detailState === "failure");

  useEffect(() => {
    const nextViewModel = getInitialDetailViewModel(customerId, detailState);

    setIsLoading(false);
    setSaveMessage(null);
    setDeleteError(null);
    setCustomer(nextViewModel.customer);
    setDraft(nextViewModel.draft);
    setIsEditOpen(nextViewModel.isEditOpen);
    setIsDeleteOpen(nextViewModel.isDeleteOpen);
    setErrors(nextViewModel.errors);
    setIsSaving(detailState === "loading");
    setSaveMessage(nextViewModel.saveMessage);
  }, [customerId, detailState]);

  if (!isLoading && !customer) {
    return <Navigate replace to="/customers" />;
  }

  const validateDraft = (candidate: EditableCustomerFields) => {
    const nextErrors: FormErrors = {};

    if (!candidate.companyName.trim()) {
      nextErrors.companyName = "会社名を入力してください。";
    }

    if (!isEmailValid(candidate.email)) {
      nextErrors.email = "メールアドレスの形式を確認してください。";
    }

    return nextErrors;
  };

  const closeEditDrawer = (open: boolean) => {
    if (isSaving && !open) return;
    setIsEditOpen(open);
  };

  const handleSave = () => {
    if (!customer || !draft || isSaving) return;

    const nextErrors = validateDraft(draft);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      setIsEditOpen(true);
      return;
    }

    setSaveMessage(null);
    setIsSaving(true);

    window.setTimeout(() => {
      const result = updateCustomer(customer.id, draft, { simulateFailure: simulateSaveFailureOnce });

      if (!result.ok) {
        setSimulateSaveFailureOnce(false);
        setSaveMessage({
          tone: "danger",
          title: "顧客情報を更新できませんでした",
          description: result.reason,
        });
        setIsSaving(false);
        return;
      }

      setCustomer(result.customer);
      setDraft(toDraft(result.customer));
      setSaveMessage({
        tone: "success",
        title: "顧客情報を更新しました",
        description: "変更内容をこの詳細画面へ反映しました。",
      });
      setIsSaving(false);
      setIsEditOpen(false);
      onDataChange();
    }, DETAIL_DELAY_MS);
  };

  const handleDelete = () => {
    if (!customer || isDeleting) return;

    setDeleteError(null);
    setIsDeleting(true);

    window.setTimeout(() => {
      const result = deleteCustomer(customer.id, { simulateFailure: simulateDeleteFailureOnce });

      if (!result.ok) {
        setSimulateDeleteFailureOnce(false);
        setDeleteError(result.reason);
        setIsDeleting(false);
        return;
      }

      toast.success("顧客を削除しました", {
        description: `${customer.companyName}を顧客一覧から削除しました。`,
      });
      setIsDeleting(false);
      setIsDeleteOpen(false);
      onDataChange();
      navigate("/customers");
    }, DETAIL_DELAY_MS);
  };

  return (
    <main className="page-shell page-shell--stack">
      <div className="detail-page__heading">
        <Link href={getListHref()} className="back-link">
          顧客一覧に戻る
        </Link>

        <div className="page-heading">
          <div className="page-heading__copy">
            <h1>{customer?.companyName ?? "顧客詳細"}</h1>
            <p>基本情報と対応状況を確認し、必要に応じて顧客情報の編集や削除を行います。</p>
            <div className="page-heading__status">
              {customer ? (
                <Chip.Root variant={getStatusVariant(customer.status)}>
                  <Chip.Label>{customer.status}</Chip.Label>
                </Chip.Root>
              ) : null}
            </div>
          </div>

          <div className="page-heading__action">
            <div className="detail-actions">
              <Drawer.Root isOpen={isEditOpen} onOpenChange={closeEditDrawer}>
                <Drawer.Trigger className="button button--md button--primary">顧客を編集</Drawer.Trigger>
                <Drawer.Backdrop>
                  <Drawer.Content placement="right">
                    <Drawer.Dialog aria-describedby={detailDescriptionId}>
                      <Drawer.Header>
                        <Drawer.Heading>顧客の編集</Drawer.Heading>
                        <Drawer.CloseTrigger aria-label="編集画面を閉じる" isDisabled={isSaving} />
                      </Drawer.Header>
                      <Drawer.Body>
                        <p id={detailDescriptionId} className="drawer-description">
                          会社名、担当者名、メールアドレス、ステータスを変更できます。
                        </p>

                        {saveMessage ? (
                          <PageFeedback
                            title={saveMessage.title}
                            description={saveMessage.description}
                            tone={saveMessage.tone}
                          />
                        ) : null}

                        {detailState === "loading" && isSaving ? (
                          <PageFeedback
                            title="顧客情報を更新しています"
                            description="保存が完了するまで、この画面を閉じずにお待ちください。"
                          />
                        ) : null}

                        <Form.Root className="drawer-form" onSubmit={(event) => event.preventDefault()}>
                          <TextField.Root
                            isRequired
                            isInvalid={Boolean(errors.companyName)}
                            validationBehavior="aria"
                            value={draft?.companyName ?? ""}
                            onChange={(value) => {
                              setDraft((current) => (current ? { ...current, companyName: value } : current));
                              setErrors((current) => ({ ...current, companyName: undefined }));
                            }}
                          >
                            <Label>会社名</Label>
                            <Input />
                            <FieldError>{errors.companyName}</FieldError>
                          </TextField.Root>

                          <TextField.Root
                            value={draft?.contactName ?? ""}
                            onChange={(value) => {
                              setDraft((current) => (current ? { ...current, contactName: value } : current));
                            }}
                          >
                            <Label>担当者名</Label>
                            <Input />
                          </TextField.Root>

                          <TextField.Root
                            isInvalid={Boolean(errors.email)}
                            validationBehavior="aria"
                            value={draft?.email ?? ""}
                            onChange={(value) => {
                              setDraft((current) => (current ? { ...current, email: value } : current));
                              setErrors((current) => ({ ...current, email: undefined }));
                            }}
                          >
                            <Label>メールアドレス</Label>
                            <Input type="email" autoComplete="email" />
                            <Description>一般的なメール形式で入力してください。</Description>
                            <FieldError>{errors.email}</FieldError>
                          </TextField.Root>

                          <Select.Root
                            aria-label="ステータス"
                            selectedKey={draft?.status}
                            onSelectionChange={(key) => {
                              if (typeof key === "string") {
                                setDraft((current) => (current ? { ...current, status: key as CustomerStatus } : current));
                              }
                            }}
                          >
                            <Label>ステータス</Label>
                            <Select.Trigger>
                              <Select.Value />
                              <Select.Indicator />
                            </Select.Trigger>
                            <Select.Popover>
                              <ListBox>
                                {STATUS_OPTIONS.map((item) => (
                                  <ListBox.Item key={item.id} id={item.id}>
                                    {item.label}
                                  </ListBox.Item>
                                ))}
                              </ListBox>
                            </Select.Popover>
                          </Select.Root>
                        </Form.Root>
                      </Drawer.Body>
                      <Drawer.Footer>
                        <Button variant="tertiary" onPress={() => closeEditDrawer(false)} isDisabled={isSaving}>
                          キャンセル
                        </Button>
                        <Button variant="primary" onPress={handleSave} isDisabled={isSaving}>
                          {isSaving ? "保存中" : "保存"}
                        </Button>
                      </Drawer.Footer>
                    </Drawer.Dialog>
                  </Drawer.Content>
                </Drawer.Backdrop>
              </Drawer.Root>

              <AlertDialog.Root isOpen={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
                <AlertDialog.Trigger>
                  <Button variant="danger-soft">顧客を削除</Button>
                </AlertDialog.Trigger>
                <AlertDialog.Backdrop>
                  <AlertDialog.Container size="md">
                    <AlertDialog.Dialog>
                      <AlertDialog.Header>
                        <AlertDialog.Heading>顧客の削除</AlertDialog.Heading>
                        <AlertDialog.CloseTrigger aria-label="削除確認を閉じる" />
                      </AlertDialog.Header>
                      <AlertDialog.Body className="alert-dialog__body">
                        <p>{customer?.companyName} を削除します。</p>
                        <p>削除すると、詳細画面から戻したり復元したりできません。</p>
                        {deleteError ? (
                          <PageFeedback title="顧客を削除できませんでした" description={deleteError} tone="danger" />
                        ) : null}
                      </AlertDialog.Body>
                      <AlertDialog.Footer>
                        <Button variant="tertiary" onPress={() => setIsDeleteOpen(false)} isDisabled={isDeleting}>
                          キャンセル
                        </Button>
                        <Button variant="danger" onPress={handleDelete} isDisabled={isDeleting}>
                          {isDeleting ? "削除中" : "削除する"}
                        </Button>
                      </AlertDialog.Footer>
                    </AlertDialog.Dialog>
                  </AlertDialog.Container>
                </AlertDialog.Backdrop>
              </AlertDialog.Root>
            </div>
          </div>
        </div>
      </div>

      {isLoading ? (
        <EmptyState title="顧客情報を読み込んでいます" description="選択した顧客の完全な情報を取得しています。" />
      ) : customer ? (
        <div className="detail-grid">
          <div className="detail-content">
            {saveMessage ? (
              <PageFeedback title={saveMessage.title} description={saveMessage.description} tone={saveMessage.tone} />
            ) : null}

            <DetailSection title="基本情報" description="担当者と連絡先を確認できます。">
              <dl className="detail-list">
                <DetailRow label="会社名" value={customer.companyName} />
                <DetailRow label="担当者名" value={customer.contactName} />
                <DetailRow label="メールアドレス" value={customer.email} />
                <DetailRow label="電話番号" value={customer.phone} />
              </dl>
            </DetailSection>

            <DetailSection title="対応状況" description="現在の進行状況と共有メモです。">
              <dl className="detail-list">
                <DetailRow
                  label="ステータス"
                  value={
                    <Chip.Root variant={getStatusVariant(customer.status)}>
                      <Chip.Label>{customer.status}</Chip.Label>
                    </Chip.Root>
                  }
                />
                <DetailRow label="対応メモ" value={customer.note} />
              </dl>
            </DetailSection>
          </div>
        </div>
      ) : null}
    </main>
  );
}

function AppRoutes({
  dataVersion,
  onDataChange,
}: {
  dataVersion: number;
  onDataChange: () => void;
}) {
  return (
    <Routes>
      <Route path="/customers" element={<CustomerListPage dataVersion={dataVersion} />} />
      <Route path="/customers/:customerId" element={<CustomerDetailPage onDataChange={onDataChange} />} />
      <Route path="*" element={<Navigate replace to="/customers" />} />
    </Routes>
  );
}

export function App() {
  const [dataVersion, setDataVersion] = useState(0);

  return (
    <HashRouter>
      <AppHeader />
      <AppRoutes dataVersion={dataVersion} onDataChange={() => setDataVersion((current) => current + 1)} />
      <Toast.Provider placement="top end" />
    </HashRouter>
  );
}
