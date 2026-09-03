import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import {
  Alert,
  AlertDialog,
  Button,
  Chip,
  Drawer,
  EmptyState,
  ErrorMessage,
  Form,
  Input,
  Label,
  Link,
  ListBox,
  RouterProvider,
  Select,
  Spinner,
  Table,
  TextField,
} from "@heroui/react";
import {
  HashRouter,
  Navigate,
  Route,
  Routes,
  useHref,
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import type { CustomerDetail, CustomerStatus, CustomerSummary, DeleteCustomerResult } from "./fixtures";
import { deleteCustomer, getCustomerDetail, listCustomerSummaries } from "./fixtures";

const CUSTOMER_STATUSES = ["商談中", "利用中", "休眠"] as const satisfies readonly CustomerStatus[];

const STATUS_CHIP_COLOR: Record<CustomerStatus, "accent" | "success" | "default"> = {
  商談中: "accent",
  利用中: "success",
  休眠: "default",
};

// 一般的なメール形式（ローカル部@ドメイン.TLD）だけを受け付ける
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const SAVE_DURATION_MS = 700;
const DELETE_DURATION_MS = 600;

/* -------------------------------------------------------------------------------------------------
 * 顧客ストア
 * fixtures.ts は読み取りと削除だけを担うため、編集内容の保持はアプリ側で行う
 * -----------------------------------------------------------------------------------------------*/

type CustomerEdit = Pick<CustomerDetail, "companyName" | "contactName" | "email" | "status">;

type CustomerStore = {
  listSummaries: () => CustomerSummary[];
  getDetail: (customerId: string) => CustomerDetail | undefined;
  saveCustomer: (customerId: string, edit: CustomerEdit) => void;
  removeCustomer: (customerId: string) => DeleteCustomerResult;
};

const CustomerStoreContext = createContext<CustomerStore | null>(null);

function CustomerStoreProvider({ children }: { children: ReactNode }) {
  const [edits, setEdits] = useState<Record<string, CustomerEdit>>({});

  const store = useMemo<CustomerStore>(() => {
    return {
      listSummaries: () =>
        listCustomerSummaries().map((summary) => {
          const edit = edits[summary.id];
          if (!edit) return summary;
          return {
            ...summary,
            companyName: edit.companyName,
            contactName: edit.contactName,
            status: edit.status,
          };
        }),
      getDetail: (customerId) => {
        const detail = getCustomerDetail(customerId);
        if (!detail) return undefined;
        const edit = edits[customerId];
        return edit ? { ...detail, ...edit } : detail;
      },
      saveCustomer: (customerId, edit) => {
        setEdits((current) => ({ ...current, [customerId]: edit }));
      },
      // 削除後は一覧・詳細の描画時に fixtures を読み直すので、ここでは結果だけ返す
      removeCustomer: (customerId) => deleteCustomer(customerId),
    };
  }, [edits]);

  return <CustomerStoreContext value={store}>{children}</CustomerStoreContext>;
}

function useCustomerStore(): CustomerStore {
  const store = useContext(CustomerStoreContext);
  if (!store) throw new Error("CustomerStoreProvider の内側で使用してください。");
  return store;
}

/* -------------------------------------------------------------------------------------------------
 * 共通レイアウト
 * -----------------------------------------------------------------------------------------------*/

function PageShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-6 py-10">{children}</main>
    </div>
  );
}

function StatusChip({ status }: { status: CustomerStatus }) {
  return (
    <Chip color={STATUS_CHIP_COLOR[status]} size="sm" variant="soft">
      <Chip.Label>{status}</Chip.Label>
    </Chip>
  );
}

/* -------------------------------------------------------------------------------------------------
 * 顧客一覧
 * -----------------------------------------------------------------------------------------------*/

type ListDemoState = "default" | "empty";

function CustomerListPage({ demoState }: { demoState: ListDemoState }) {
  const store = useCustomerStore();
  const location = useLocation();
  const deletedCompanyName = (location.state as { deletedCompanyName?: string } | null)?.deletedCompanyName;
  const customers = demoState === "empty" ? [] : store.listSummaries();

  return (
    <PageShell>
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">顧客一覧</h1>
        <p className="text-sm text-muted">担当している顧客の対応状況を確認できます。</p>
      </header>

      {deletedCompanyName ? (
        <Alert status="success">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>{`「${deletedCompanyName}」を削除しました。`}</Alert.Title>
            <Alert.Description>この顧客は一覧から取り除かれました。</Alert.Description>
          </Alert.Content>
        </Alert>
      ) : null}

      {customers.length === 0 ? (
        <EmptyState className="flex flex-col items-center gap-2 rounded-xl border border-border bg-surface px-6 py-16 text-center">
          <h2 className="text-base font-medium">顧客がまだありません</h2>
          <p className="text-sm text-muted">顧客を登録すると、ここに一覧で表示されます。</p>
        </EmptyState>
      ) : (
        <Table>
          <Table.Content aria-label="顧客一覧">
            <Table.Header>
              <Table.Column isRowHeader id="companyName">
                企業名
              </Table.Column>
              <Table.Column id="contactName">担当者</Table.Column>
              <Table.Column id="lastContactedAt">最終対応日</Table.Column>
              <Table.Column id="status">ステータス</Table.Column>
            </Table.Header>
            <Table.Body>
              {customers.map((customer) => (
                <Table.Row key={customer.id} id={customer.id}>
                  <Table.Cell>
                    <Link href={`/customers/${customer.id}`}>{customer.companyName}</Link>
                  </Table.Cell>
                  <Table.Cell>{customer.contactName}</Table.Cell>
                  <Table.Cell>{customer.lastContactedAt}</Table.Cell>
                  <Table.Cell>
                    <StatusChip status={customer.status} />
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Content>
        </Table>
      )}
    </PageShell>
  );
}

/* -------------------------------------------------------------------------------------------------
 * 顧客詳細
 * -----------------------------------------------------------------------------------------------*/

type DetailDemoState =
  | "default"
  | "drawer-open"
  | "invalid-email"
  | "loading"
  | "success"
  | "failure"
  | "delete-confirm";

type SaveStatus = "idle" | "saving" | "succeeded" | "failed";

type FieldErrors = { companyName?: string; email?: string };

function toEdit(customer: CustomerDetail): CustomerEdit {
  return {
    companyName: customer.companyName,
    contactName: customer.contactName,
    email: customer.email,
    status: customer.status,
  };
}

function validateEdit(edit: CustomerEdit): FieldErrors {
  const errors: FieldErrors = {};
  if (edit.companyName.trim() === "") errors.companyName = "会社名を入力してください。";
  if (!EMAIL_PATTERN.test(edit.email.trim())) {
    errors.email = "メールアドレスは「name@example.com」の形式で入力してください。";
  }
  return errors;
}

function CustomerDetailPage({ customerId, demoState }: { customerId: string; demoState: DetailDemoState }) {
  const store = useCustomerStore();
  const navigate = useNavigate();
  // 詳細では選択した顧客の完全な情報を一覧とは別に取得する
  const customer = store.getDetail(customerId);

  const [isEditOpen, setEditOpen] = useState(
    demoState === "drawer-open" ||
      demoState === "invalid-email" ||
      demoState === "loading" ||
      demoState === "failure",
  );
  const [isDeleteOpen, setDeleteOpen] = useState(demoState === "delete-confirm");
  const [saveStatus, setSaveStatus] = useState<SaveStatus>(() => {
    if (demoState === "loading") return "saving";
    if (demoState === "success") return "succeeded";
    if (demoState === "failure") return "failed";
    return "idle";
  });
  const [edit, setEdit] = useState<CustomerEdit>(() => {
    const base = customer ? toEdit(customer) : { companyName: "", contactName: "", email: "", status: "商談中" as const };
    return demoState === "invalid-email" ? { ...base, email: "aoi.sato@example" } : base;
  });
  const [isValidated, setValidated] = useState(demoState === "invalid-email");
  const [isDeleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timerRef.current), []);

  const isSaving = saveStatus === "saving";
  const errors = validateEdit(edit);
  const visibleErrors = isValidated ? errors : {};

  const openEditor = useCallback(() => {
    if (!customer) return;
    setEdit(toEdit(customer));
    setValidated(false);
    setSaveStatus("idle");
    setEditOpen(true);
  }, [customer]);

  const closeEditor = useCallback(() => {
    if (isSaving) return; // 保存中は閉じない
    setEditOpen(false);
  }, [isSaving]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSaving) return; // 二重送信を防ぐ
    setValidated(true);
    if (Object.keys(validateEdit(edit)).length > 0) return;

    setSaveStatus("saving");
    timerRef.current = setTimeout(() => {
      store.saveCustomer(customerId, { ...edit, companyName: edit.companyName.trim(), email: edit.email.trim() });
      setSaveStatus("succeeded");
      setEditOpen(false);
    }, SAVE_DURATION_MS);
  }

  function handleDelete() {
    if (isDeleting) return;
    setDeleting(true);
    setDeleteError(null);
    timerRef.current = setTimeout(() => {
      const result = store.removeCustomer(customerId);
      if (result.ok) {
        navigate("/customers", { replace: true, state: { deletedCompanyName: customer?.companyName } });
        return;
      }
      setDeleting(false);
      setDeleteError(result.reason);
    }, DELETE_DURATION_MS);
  }

  if (!customer) return <Navigate replace to="/customers" />;

  return (
    <PageShell>
      <div className="flex flex-col gap-6">
        <Link href="/customers">顧客一覧へ戻る</Link>

        <header className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{customer.companyName}</h1>
            <StatusChip status={customer.status} />
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onPress={openEditor}>
              編集
            </Button>
            <Button variant="danger-soft" onPress={() => setDeleteOpen(true)}>
              削除
            </Button>
          </div>
        </header>
      </div>

      {saveStatus === "succeeded" ? (
        <Alert status="success">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>顧客情報を保存しました。</Alert.Title>
            <Alert.Description>変更した内容をこの画面に反映しています。</Alert.Description>
          </Alert.Content>
        </Alert>
      ) : null}

      {saveStatus === "failed" ? (
        <Alert status="danger">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>顧客情報を保存できませんでした。</Alert.Title>
            <Alert.Description>入力内容はそのまま残しています。もう一度保存してください。</Alert.Description>
          </Alert.Content>
        </Alert>
      ) : null}

      {deleteError ? (
        <Alert status="danger">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>顧客を削除できませんでした。</Alert.Title>
            <Alert.Description>{deleteError}</Alert.Description>
          </Alert.Content>
        </Alert>
      ) : null}

      <section className="rounded-xl border border-border bg-surface p-6">
        <h2 className="text-base font-medium">基本情報</h2>
        <dl className="mt-4 grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2">
          <DetailField label="会社名" value={customer.companyName} />
          <DetailField label="担当者名" value={customer.contactName} />
          <DetailField label="メールアドレス" value={customer.email} />
          <DetailField label="電話番号" value={customer.phone} />
          <DetailField label="ステータス" value={<StatusChip status={customer.status} />} />
          <DetailField className="sm:col-span-2" label="対応メモ" value={customer.note} />
        </dl>
      </section>

      <Drawer isOpen={isEditOpen} onOpenChange={setEditOpen}>
        <Drawer.Backdrop isDismissable={!isSaving}>
          <Drawer.Content placement="right">
            <Drawer.Dialog>
              <Form className="flex h-full flex-col" onSubmit={handleSubmit}>
                <Drawer.Header>
                  <Drawer.Heading>顧客情報を編集</Drawer.Heading>
                  <p className="mt-1 text-sm text-muted">保存すると、変更した内容が詳細に反映されます。</p>
                </Drawer.Header>

                <Drawer.Body className="flex flex-col gap-5">
                  <TextField
                    isDisabled={isSaving}
                    isInvalid={Boolean(visibleErrors.companyName)}
                    isRequired
                    validationBehavior="aria"
                    value={edit.companyName}
                    onChange={(companyName) => setEdit((current) => ({ ...current, companyName }))}
                  >
                    <Label>会社名</Label>
                    <Input />
                    {visibleErrors.companyName ? <ErrorMessage>{visibleErrors.companyName}</ErrorMessage> : null}
                  </TextField>

                  <TextField
                    isDisabled={isSaving}
                    value={edit.contactName}
                    onChange={(contactName) => setEdit((current) => ({ ...current, contactName }))}
                  >
                    <Label>担当者名</Label>
                    <Input />
                  </TextField>

                  <TextField
                    isDisabled={isSaving}
                    isInvalid={Boolean(visibleErrors.email)}
                    type="email"
                    validationBehavior="aria"
                    value={edit.email}
                    onChange={(email) => setEdit((current) => ({ ...current, email }))}
                  >
                    <Label>メールアドレス</Label>
                    <Input />
                    {visibleErrors.email ? <ErrorMessage>{visibleErrors.email}</ErrorMessage> : null}
                  </TextField>

                  <Select
                    isDisabled={isSaving}
                    selectedKey={edit.status}
                    onSelectionChange={(key) => setEdit((current) => ({ ...current, status: key as CustomerStatus }))}
                  >
                    <Label>ステータス</Label>
                    <Select.Trigger>
                      <Select.Value />
                      <Select.Indicator />
                    </Select.Trigger>
                    <Select.Popover>
                      <ListBox>
                        {CUSTOMER_STATUSES.map((status) => (
                          <ListBox.Item key={status} id={status} textValue={status}>
                            {status}
                          </ListBox.Item>
                        ))}
                      </ListBox>
                    </Select.Popover>
                  </Select>
                </Drawer.Body>

                <Drawer.Footer className="flex justify-end gap-2">
                  <Button isDisabled={isSaving} variant="tertiary" onPress={closeEditor}>
                    キャンセル
                  </Button>
                  <Button isDisabled={isSaving} type="submit">
                    {isSaving ? (
                      <>
                        <Spinner aria-hidden size="sm" />
                        保存中…
                      </>
                    ) : (
                      "保存する"
                    )}
                  </Button>
                </Drawer.Footer>
              </Form>
            </Drawer.Dialog>
          </Drawer.Content>
        </Drawer.Backdrop>
      </Drawer>

      <AlertDialog isOpen={isDeleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialog.Backdrop>
          <AlertDialog.Container>
            <AlertDialog.Dialog>
              <AlertDialog.Header>
                <AlertDialog.Icon status="danger" />
                <AlertDialog.Heading>この顧客を削除しますか？</AlertDialog.Heading>
              </AlertDialog.Header>
              <AlertDialog.Body>
                <p>{`「${customer.companyName}」を削除します。`}</p>
                <p className="mt-2 text-sm text-muted">
                  顧客情報と対応メモはすべて失われ、削除を取り消すことはできません。
                </p>
              </AlertDialog.Body>
              <AlertDialog.Footer className="flex justify-end gap-2">
                <Button isDisabled={isDeleting} variant="tertiary" onPress={() => setDeleteOpen(false)}>
                  キャンセル
                </Button>
                <Button isDisabled={isDeleting} variant="danger" onPress={handleDelete}>
                  {isDeleting ? (
                    <>
                      <Spinner aria-hidden size="sm" />
                      削除中…
                    </>
                  ) : (
                    "削除する"
                  )}
                </Button>
              </AlertDialog.Footer>
            </AlertDialog.Dialog>
          </AlertDialog.Container>
        </AlertDialog.Backdrop>
      </AlertDialog>
    </PageShell>
  );
}

function DetailField({
  className,
  label,
  value,
}: {
  className?: string;
  label: string;
  value: ReactNode;
}) {
  return (
    <div className={className}>
      <dt className="text-xs font-medium text-muted">{label}</dt>
      <dd className="mt-1 text-sm break-words">{value}</dd>
    </div>
  );
}

/* -------------------------------------------------------------------------------------------------
 * ルーティング
 * 画面状態は URL の state query から復元し、状態切り替え用の UI は表示しない
 * -----------------------------------------------------------------------------------------------*/

const LIST_DEMO_STATES: readonly ListDemoState[] = ["default", "empty"];
const DETAIL_DEMO_STATES: readonly DetailDemoState[] = [
  "default",
  "drawer-open",
  "invalid-email",
  "loading",
  "success",
  "failure",
  "delete-confirm",
];

function useDemoState<T extends string>(allowed: readonly T[], fallback: T): T {
  const [searchParams] = useSearchParams();
  const value = searchParams.get("state");
  return allowed.includes(value as T) ? (value as T) : fallback;
}

function CustomerListRoute() {
  const demoState = useDemoState(LIST_DEMO_STATES, "default");
  return <CustomerListPage demoState={demoState} />;
}

function CustomerDetailRoute() {
  const { customerId = "" } = useParams();
  const demoState = useDemoState(DETAIL_DEMO_STATES, "default");
  // state が変わったら画面状態を作り直す
  return <CustomerDetailPage key={`${customerId}:${demoState}`} customerId={customerId} demoState={demoState} />;
}

function AppRoutes() {
  const navigate = useNavigate();

  return (
    <RouterProvider navigate={(path) => void navigate(path)} useHref={useHref}>
      <CustomerStoreProvider>
        <Routes>
          <Route path="/customers" element={<CustomerListRoute />} />
          <Route path="/customers/:customerId" element={<CustomerDetailRoute />} />
          <Route path="*" element={<Navigate replace to="/customers" />} />
        </Routes>
      </CustomerStoreProvider>
    </RouterProvider>
  );
}

export function App() {
  return (
    <HashRouter>
      <AppRoutes />
    </HashRouter>
  );
}
