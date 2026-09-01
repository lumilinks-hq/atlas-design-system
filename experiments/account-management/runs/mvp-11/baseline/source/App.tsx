import {
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Input,
  Spinner,
} from "@heroui/react";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import {
  HashRouter,
  Link,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import {
  CustomerDetail,
  CustomerStatus,
  CustomerSummary,
  deleteCustomer,
  getCustomerDetail,
  listCustomerSummaries,
  updateCustomer,
} from "./fixtures";

type DetailState = "default" | "drawer-open" | "invalid-email" | "loading" | "success" | "failure" | "delete-confirm";
type ListState = "default" | "empty";
type FormValues = {
  companyName: string;
  contactName: string;
  email: string;
  status: CustomerStatus;
};
type FormErrors = Partial<Record<keyof FormValues, string>>;
type Notice = { tone: "success" | "danger"; message: string } | null;

const STATUS_OPTIONS: CustomerStatus[] = ["商談中", "利用中", "休眠"];
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function readListState(value: string | null): ListState {
  return value === "empty" ? "empty" : "default";
}

function readDetailState(value: string | null): DetailState {
  switch (value) {
    case "drawer-open":
    case "invalid-email":
    case "loading":
    case "success":
    case "failure":
    case "delete-confirm":
      return value;
    default:
      return "default";
  }
}

function fetchCustomerSummaries(mode: ListState): Promise<CustomerSummary[]> {
  return new Promise((resolve) => {
    window.setTimeout(() => {
      resolve(mode === "empty" ? [] : listCustomerSummaries());
    }, 120);
  });
}

function fetchCustomerDetail(customerId: string): Promise<CustomerDetail | undefined> {
  return new Promise((resolve) => {
    window.setTimeout(() => resolve(getCustomerDetail(customerId)), 120);
  });
}

function saveCustomer(
  customerId: string,
  values: FormValues,
  shouldFail: boolean,
): Promise<{ ok: true; customer: CustomerDetail } | { ok: false; reason: string }> {
  return new Promise((resolve) => {
    window.setTimeout(() => {
      if (shouldFail) {
        resolve({ ok: false, reason: "保存に失敗しました。内容を確認して再試行してください。" });
        return;
      }

      const customer = updateCustomer(customerId, values);
      if (!customer) {
        resolve({ ok: false, reason: "対象の顧客が見つかりません。" });
        return;
      }
      resolve({ ok: true, customer });
    }, 320);
  });
}

function removeCustomer(customerId: string, shouldFail: boolean) {
  return new Promise<{ ok: true } | { ok: false; reason: string }>((resolve) => {
    window.setTimeout(() => resolve(deleteCustomer(customerId, { simulateFailure: shouldFail })), 320);
  });
}

function createFormValues(customer: CustomerDetail): FormValues {
  return {
    companyName: customer.companyName,
    contactName: customer.contactName,
    email: customer.email,
    status: customer.status,
  };
}

function validateForm(values: FormValues): FormErrors {
  const errors: FormErrors = {};

  if (!values.companyName.trim()) {
    errors.companyName = "会社名を入力してください。";
  }
  if (!EMAIL_PATTERN.test(values.email)) {
    errors.email = "一般的なメール形式で入力してください。";
  }

  return errors;
}

function StatusChip({ status }: { status: CustomerStatus }) {
  const color = status === "利用中" ? "success" : status === "商談中" ? "accent" : "default";

  return (
    <Chip color={color} size="sm" variant="soft">
      {status}
    </Chip>
  );
}

function NoticeBanner({ notice }: { notice: Notice }) {
  if (!notice) return null;

  return (
    <div className={`notice notice-${notice.tone}`} role="status">
      {notice.message}
    </div>
  );
}

function CustomerListPage() {
  const [searchParams] = useSearchParams();
  const listState = readListState(searchParams.get("state"));
  const flash = searchParams.get("flash");
  const [customers, setCustomers] = useState<CustomerSummary[] | null>(null);
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);

  useEffect(() => {
    let active = true;
    setCustomers(null);

    fetchCustomerSummaries(listState).then((nextCustomers) => {
      if (active) {
        setCustomers(nextCustomers);
      }
    });

    return () => {
      active = false;
    };
  }, [listState]);

  const filteredCustomers = useMemo(() => {
    if (!customers) return [];
    const normalizedQuery = deferredQuery.trim();
    if (!normalizedQuery) return customers;

    return customers.filter((customer) =>
      [customer.companyName, customer.contactName, customer.status].some((value) => value.includes(normalizedQuery)),
    );
  }, [customers, deferredQuery]);

  return (
    <main className="page-shell">
      <section className="page-panel">
        <div className="page-header">
          <div>
            <p className="eyebrow">Account Management</p>
            <h1>顧客一覧</h1>
            <p className="page-copy">企業名、担当者、最終対応日、ステータスを見ながら顧客を探せます。</p>
          </div>
          <div className="summary-pill">{customers?.length ?? 0}件</div>
        </div>

        {flash === "deleted" ? (
          <NoticeBanner notice={{ tone: "success", message: "顧客を削除しました。顧客一覧へ戻りました。" }} />
        ) : null}

        <div className="toolbar">
          <Input
            aria-label="顧客を検索"
            className="search-input"
            placeholder="会社名や担当者で検索"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>

        {customers === null ? (
          <div className="loading-state" role="status">
            <Spinner size="sm" />
            <span>顧客一覧を読み込んでいます。</span>
          </div>
        ) : filteredCustomers.length === 0 ? (
          <section className="empty-state">
            <h2>表示できる顧客がありません</h2>
            <p>顧客が0件の場合はここに空状態を表示します。</p>
          </section>
        ) : (
          <div className="customer-grid">
            {filteredCustomers.map((customer) => (
              <Link
                aria-label={customer.companyName}
                className="customer-link"
                key={customer.id}
                to={`/customers/${customer.id}`}
              >
                <Card className="customer-card">
                  <CardHeader className="customer-card-header">
                    <div>
                      <h2>{customer.companyName}</h2>
                      <p>{customer.contactName}</p>
                    </div>
                    <StatusChip status={customer.status} />
                  </CardHeader>
                  <CardContent>
                    <dl className="meta-grid">
                      <div>
                        <dt>担当者</dt>
                        <dd>{customer.contactName}</dd>
                      </div>
                      <div>
                        <dt>最終対応日</dt>
                        <dd>{customer.lastContactedAt}</dd>
                      </div>
                    </dl>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

function CustomerDetailPage() {
  const { customerId = "" } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const detailState = readDetailState(searchParams.get("state"));
  const [customer, setCustomer] = useState<CustomerDetail | undefined | null>(null);
  const [formValues, setFormValues] = useState<FormValues | null>(null);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [saveFailureConsumed, setSaveFailureConsumed] = useState(false);
  const [deleteFailureConsumed, setDeleteFailureConsumed] = useState(false);

  useEffect(() => {
    let active = true;
    setCustomer(null);

    fetchCustomerDetail(customerId).then((nextCustomer) => {
      if (!active) return;
      setCustomer(nextCustomer);
      if (nextCustomer) {
        setFormValues(createFormValues(nextCustomer));
      }
    });

    return () => {
      active = false;
    };
  }, [customerId]);

  useEffect(() => {
    setNotice(
      detailState === "success"
        ? { tone: "success", message: "顧客情報を更新しました。" }
        : detailState === "failure"
          ? { tone: "danger", message: "保存に失敗しました。内容を保持したまま再試行できます。" }
          : null,
    );
    setIsDrawerOpen(["drawer-open", "invalid-email", "loading", "failure"].includes(detailState));
    setIsDeleteConfirmOpen(detailState === "delete-confirm");
    setDeleteError(null);
    setSaveFailureConsumed(detailState !== "failure");
    setDeleteFailureConsumed(detailState !== "failure");
    setIsSaving(detailState === "loading");
  }, [detailState, location.key]);

  useEffect(() => {
    if (!customer) return;

    if (detailState === "invalid-email") {
      setFormValues({ ...createFormValues(customer), email: "invalid-email" });
      setFormErrors({ email: "一般的なメール形式で入力してください。" });
      setIsDrawerOpen(true);
      return;
    }

    if (detailState === "success") {
      setFormValues(createFormValues(customer));
      setFormErrors({});
    }
  }, [customer, detailState]);

  if (customer === null || formValues === null) {
    return (
      <main className="page-shell">
        <section className="page-panel detail-panel detail-loading">
          <div className="back-row">
            <Link className="back-link" to="/customers">
              顧客一覧へ戻る
            </Link>
          </div>
          <div className="loading-state" role="status">
            <Spinner size="sm" />
            <span>顧客詳細を読み込んでいます。</span>
          </div>
        </section>
      </main>
    );
  }

  if (!customer) {
    return <Navigate replace to="/customers" />;
  }

  const handleFieldChange = (field: keyof FormValues, value: string) => {
    setFormValues((currentValues) => {
      if (!currentValues) return currentValues;
      return {
        ...currentValues,
        [field]: field === "status" ? (value as CustomerStatus) : value,
      };
    });
    setFormErrors((currentErrors) => ({ ...currentErrors, [field]: undefined }));
  };

  const handleSave = async () => {
    const nextErrors = validateForm(formValues);
    setFormErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setIsSaving(true);
    setNotice(null);

    const shouldFail = detailState === "failure" && !saveFailureConsumed;
    const result = await saveCustomer(customer.id, formValues, shouldFail);
    setIsSaving(false);

    if (!result.ok) {
      setNotice({ tone: "danger", message: result.reason });
      setSaveFailureConsumed(true);
      setIsDrawerOpen(true);
      return;
    }

    setCustomer(result.customer);
    setFormValues(createFormValues(result.customer));
    setFormErrors({});
    setNotice({ tone: "success", message: "顧客情報を更新しました。" });
    setIsDrawerOpen(false);
    navigate(`/customers/${customer.id}?state=success`, { replace: true });
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    setDeleteError(null);

    const shouldFail = detailState === "failure" && !deleteFailureConsumed;
    const result = await removeCustomer(customer.id, shouldFail);
    setIsDeleting(false);

    if (!result.ok) {
      setDeleteError(result.reason);
      setDeleteFailureConsumed(true);
      return;
    }

    navigate("/customers?flash=deleted", { replace: true });
  };

  return (
    <main className="page-shell">
      <section className="page-panel detail-panel">
        <div className="back-row">
          <Link className="back-link" to="/customers">
            顧客一覧へ戻る
          </Link>
        </div>

        <div className="page-header detail-header">
          <div>
            <p className="eyebrow">Customer Detail</p>
            <h1>{customer.companyName}</h1>
            <p className="page-copy">基本情報と対応状況を確認し、そのまま編集や削除まで進められます。</p>
          </div>
          <div className="detail-actions">
            <Button size="sm" variant="primary" onPress={() => setIsDrawerOpen(true)}>
              顧客情報を編集
            </Button>
            <Button size="sm" variant="danger-soft" onPress={() => setIsDeleteConfirmOpen(true)}>
              顧客を削除
            </Button>
          </div>
        </div>

        <NoticeBanner notice={notice} />

        <div className="detail-grid">
          <Card>
            <CardHeader>
              <h2>基本情報</h2>
            </CardHeader>
            <CardContent>
              <dl className="info-list">
                <div>
                  <dt>会社名</dt>
                  <dd>{customer.companyName}</dd>
                </div>
                <div>
                  <dt>担当者名</dt>
                  <dd>{customer.contactName}</dd>
                </div>
                <div>
                  <dt>メールアドレス</dt>
                  <dd>{customer.email}</dd>
                </div>
                <div>
                  <dt>電話番号</dt>
                  <dd>{customer.phone}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="status-card-header">
              <h2>対応状況</h2>
              <StatusChip status={customer.status} />
            </CardHeader>
            <CardContent>
              <dl className="info-list">
                <div>
                  <dt>ステータス</dt>
                  <dd>{customer.status}</dd>
                </div>
                <div>
                  <dt>対応メモ</dt>
                  <dd>{customer.note}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        </div>
      </section>

      {isDrawerOpen ? (
        <div className="overlay" role="presentation">
          <section aria-label="顧客情報の編集" className="drawer">
            <div className="drawer-header">
              <div>
                <p className="eyebrow">Edit Customer</p>
                <h2>顧客情報を編集</h2>
              </div>
              <button
                aria-label="編集画面を閉じる"
                className="icon-button"
                onClick={() => {
                  if (isSaving) return;
                  setIsDrawerOpen(false);
                }}
                type="button"
              >
                閉じる
              </button>
            </div>

            {notice?.tone === "danger" ? <NoticeBanner notice={notice} /> : null}

            <div className="drawer-body">
              <Input
                aria-label="会社名"
                className={formErrors.companyName ? "field-invalid" : undefined}
                disabled={isSaving}
                value={formValues.companyName}
                onChange={(event) => handleFieldChange("companyName", event.target.value)}
              />
              {formErrors.companyName ? <p className="field-error">{formErrors.companyName}</p> : null}
              <Input
                aria-label="担当者名"
                disabled={isSaving}
                value={formValues.contactName}
                onChange={(event) => handleFieldChange("contactName", event.target.value)}
              />
              <Input
                aria-label="メールアドレス"
                className={formErrors.email ? "field-invalid" : undefined}
                disabled={isSaving}
                value={formValues.email}
                onChange={(event) => handleFieldChange("email", event.target.value)}
              />
              {formErrors.email ? <p className="field-error">{formErrors.email}</p> : null}

              <label className="select-field">
                <span>ステータス</span>
                <select
                  disabled={isSaving}
                  value={formValues.status}
                  onChange={(event) => handleFieldChange("status", event.target.value)}
                >
                  {STATUS_OPTIONS.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="drawer-footer">
              {isSaving ? (
                <div className="pending-message" role="status">
                  <Spinner size="sm" />
                  <span>保存しています。送信は1回だけ実行されます。</span>
                </div>
              ) : null}

              <div className="drawer-actions">
                <Button size="sm" variant="ghost" onPress={() => setIsDrawerOpen(false)}>
                  キャンセル
                </Button>
                <Button isDisabled={isSaving} size="sm" variant="primary" onPress={handleSave}>
                  保存する
                </Button>
              </div>
            </div>
          </section>
        </div>
      ) : null}

      {isDeleteConfirmOpen ? (
        <div className="overlay" role="presentation">
          <section aria-label="顧客削除の確認" className="confirm-dialog">
            <div className="drawer-header">
              <div>
                <p className="eyebrow">Delete Customer</p>
                <h2>削除の確認</h2>
              </div>
            </div>

            <div className="confirm-copy">
              <p>
                <strong>{customer.companyName}</strong> を削除します。
              </p>
              <p>削除すると詳細情報と対応状況は元に戻せません。削除後は顧客一覧へ戻ります。</p>
            </div>

            {deleteError ? (
              <div className="notice notice-danger" role="alert">
                {deleteError}
              </div>
            ) : null}

            <div className="drawer-footer">
              {isDeleting ? (
                <div className="pending-message" role="status">
                  <Spinner size="sm" />
                  <span>削除しています。</span>
                </div>
              ) : null}

              <div className="drawer-actions">
                <Button size="sm" variant="ghost" onPress={() => setIsDeleteConfirmOpen(false)}>
                  戻る
                </Button>
                <Button isDisabled={isDeleting} size="sm" variant="danger" onPress={handleDelete}>
                  削除を実行
                </Button>
              </div>
            </div>
          </section>
        </div>
      ) : null}
    </main>
  );
}

export function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/customers" element={<CustomerListPage />} />
        <Route path="/customers/:customerId" element={<CustomerDetailPage />} />
        <Route path="*" element={<Navigate replace to="/customers" />} />
      </Routes>
    </HashRouter>
  );
}
