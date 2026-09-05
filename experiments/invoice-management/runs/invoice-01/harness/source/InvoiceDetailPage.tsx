import {
  Alert,
  AlertDialog,
  Button,
  Card,
  Description,
  Drawer,
  FieldError,
  Form,
  Input,
  Label,
  Link,
  TextField,
  toast,
} from "@heroui/react";
import type { ReactNode } from "react";
import { useState } from "react";
import { Navigate, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { StatusChip } from "./StatusChip";
import type { InvoiceDetail } from "./fixtures";
import { getInvoiceDetail, voidInvoice } from "./fixtures";
import type { DraftErrors, InvoiceDraft } from "./invoice-presentation";
import {
  formatAmount,
  formatDate,
  formatLineItem,
  hasDraftErrors,
  hashHref,
  invoiceListPath,
  isDrawerState,
  readScreenState,
  validateDraft,
} from "./invoice-presentation";
import { useHashNavigation } from "./use-hash-navigation";

const saveDelayMs = 150;
const saveFailureReason = "通信が中断したため保存できませんでした。入力はそのまま残っています。";

type SaveStatus = "idle" | "saving" | "saved" | "failed";

type SaveResult = { ok: true } | { ok: false; reason: string };

/** 保存はデモ用の読み書きモデル。voidInvoice と同じ結果形で扱えるようにする */
function saveInvoiceChanges(): Promise<SaveResult> {
  return new Promise((resolve) => {
    window.setTimeout(() => resolve({ ok: true }), saveDelayMs);
  });
}

function DetailField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="detail-field">
      <span className="detail-field__label">{label}</span>
      <span className="detail-field__value">{children}</span>
    </div>
  );
}

/**
 * 請求書詳細。pattern.page-layout#single-one-column と
 * pattern.visual-grouping#surface-group に従い、一覧とは独立した画面として組む。
 */
export function InvoiceDetailPage() {
  const { invoiceId } = useParams();
  const invoice = invoiceId ? getInvoiceDetail(invoiceId) : undefined;
  if (!invoice) return <Navigate replace to={invoiceListPath} />;
  return <InvoiceDetailView invoice={invoice} key={invoice.id} />;
}

function InvoiceDetailView({ invoice }: { invoice: InvoiceDetail }) {
  const [searchParams] = useSearchParams();
  const screenState = readScreenState(searchParams.get("state"));
  const navigate = useNavigate();
  const goTo = useHashNavigation();

  const [saved, setSaved] = useState<InvoiceDraft | null>(null);
  const current: InvoiceDraft = saved ?? {
    customerName: invoice.customerName,
    dueDate: invoice.dueDate,
    note: invoice.note,
  };

  const [isDrawerOpen, setDrawerOpen] = useState(() => isDrawerState(screenState));
  const [draft, setDraft] = useState<InvoiceDraft>(() => ({
    customerName: invoice.customerName,
    dueDate: screenState === "invalid-due-date" ? "" : invoice.dueDate,
    note: invoice.note,
  }));
  const [errors, setErrors] = useState<DraftErrors>(() =>
    screenState === "invalid-due-date" ? { dueDate: "支払期限を入力してください。" } : {},
  );
  const [saveStatus, setSaveStatus] = useState<SaveStatus>(() => {
    if (screenState === "loading") return "saving";
    if (screenState === "success") return "saved";
    if (screenState === "failure") return "failed";
    return "idle";
  });
  const [saveError, setSaveError] = useState(() => (screenState === "failure" ? saveFailureReason : ""));

  const [isVoidOpen, setVoidOpen] = useState(
    () => screenState === "void-confirm" || screenState === "void-failure",
  );
  // 失敗理由は fixtures の戻り値をそのまま使う(状態を再現するだけで記録は変更しない)
  const [voidError, setVoidError] = useState(() => {
    if (screenState !== "void-failure") return "";
    const result = voidInvoice(invoice.id, { simulateFailure: true });
    return result.ok ? "" : result.reason;
  });

  const isSaving = saveStatus === "saving";

  const handleDrawerOpenChange = (open: boolean) => {
    if (!open && isSaving) return;
    if (open) {
      setDraft({ ...current });
      setErrors({});
      setSaveStatus("idle");
      setSaveError("");
    }
    setDrawerOpen(open);
  };

  const submitDraft = () => {
    if (isSaving) return;
    const nextErrors = validateDraft(draft);
    setErrors(nextErrors);
    if (hasDraftErrors(nextErrors)) return;

    setSaveStatus("saving");
    setSaveError("");
    void saveInvoiceChanges().then((result) => {
      if (!result.ok) {
        setSaveStatus("failed");
        setSaveError(result.reason);
        return;
      }
      setSaved({
        customerName: draft.customerName.trim(),
        dueDate: draft.dueDate.trim(),
        note: draft.note,
      });
      setSaveStatus("saved");
      setDrawerOpen(false);
    });
  };

  const confirmVoid = () => {
    const result = voidInvoice(invoice.id);
    if (!result.ok) {
      setVoidError(result.reason);
      return;
    }
    setVoidOpen(false);
    toast.success("請求書を無効化しました", {
      description: `${invoice.invoiceNumber}は一覧に表示されなくなります。`,
    });
    navigate(invoiceListPath);
  };

  return (
    <main className="page-shell page-shell--stack">
      <div className="detail-page__heading">
        <div className="detail-back">
          <Link href={hashHref(invoiceListPath)} onPress={(event) => goTo(invoiceListPath, event)}>
            請求書一覧へ戻る
          </Link>
        </div>

        <header className="page-heading">
          <div className="page-heading__copy">
            <h1>{invoice.invoiceNumber}</h1>
            <p>{current.customerName}宛の請求書です。請求内容と入金状況を確認できます。</p>
            <div className="page-heading__status">
              <StatusChip status={invoice.status} />
            </div>
          </div>

          <div className="page-heading__action detail-actions">
            <Drawer.Root isOpen={isDrawerOpen} onOpenChange={handleDrawerOpenChange}>
              <Drawer.Trigger className="button button--primary">請求書を編集</Drawer.Trigger>
              <Drawer.Backdrop variant="opaque">
                <Drawer.Content placement="right">
                  <Drawer.Dialog>
                    <Drawer.CloseTrigger aria-label="編集を閉じる" />
                    <Drawer.Header>
                      <Drawer.Heading>請求書を編集</Drawer.Heading>
                    </Drawer.Header>
                    <Drawer.Body>
                      <Form className="drawer-form" onSubmit={(event) => { event.preventDefault(); submitDraft(); }} validationBehavior="aria">
                        {saveStatus === "failed" ? (
                          <Alert status="danger">
                            <Alert.Indicator />
                            <Alert.Content>
                              <Alert.Title>保存できませんでした</Alert.Title>
                              <Alert.Description>{saveError}</Alert.Description>
                            </Alert.Content>
                          </Alert>
                        ) : null}

                        <TextField
                          isInvalid={Boolean(errors.customerName)}
                          isRequired
                          onChange={(value) => setDraft((prev) => ({ ...prev, customerName: value }))}
                          value={draft.customerName}
                        >
                          <Label>顧客名</Label>
                          <Input />
                          <Description>請求書に印字される宛名です。</Description>
                          <FieldError>{errors.customerName}</FieldError>
                        </TextField>

                        <TextField
                          isInvalid={Boolean(errors.dueDate)}
                          isRequired
                          onChange={(value) => setDraft((prev) => ({ ...prev, dueDate: value }))}
                          value={draft.dueDate}
                        >
                          <Label>支払期限</Label>
                          <Input type="date" />
                          <Description>入金の締め切り日を日付で指定します。</Description>
                          <FieldError>{errors.dueDate}</FieldError>
                        </TextField>

                        <TextField
                          onChange={(value) => setDraft((prev) => ({ ...prev, note: value }))}
                          value={draft.note}
                        >
                          <Label>メモ</Label>
                          <Input />
                          <Description>社内で共有する補足を残せます。</Description>
                        </TextField>
                      </Form>
                    </Drawer.Body>
                    <Drawer.Footer className="drawer-actions">
                      <Button isDisabled={isSaving} onPress={() => handleDrawerOpenChange(false)} variant="tertiary">
                        キャンセル
                      </Button>
                      <Button isDisabled={isSaving} isPending={isSaving} onPress={submitDraft} variant="primary">
                        変更を保存
                      </Button>
                    </Drawer.Footer>
                  </Drawer.Dialog>
                </Drawer.Content>
              </Drawer.Backdrop>
            </Drawer.Root>

            <AlertDialog.Root isOpen={isVoidOpen} onOpenChange={setVoidOpen}>
              <AlertDialog.Trigger>
                <Button variant="danger-soft">請求書を無効化</Button>
              </AlertDialog.Trigger>
              <AlertDialog.Backdrop variant="opaque">
                <AlertDialog.Container>
                  <AlertDialog.Dialog>
                    <AlertDialog.Icon status="danger" />
                    <AlertDialog.Header>
                      <AlertDialog.Heading>請求書を無効化</AlertDialog.Heading>
                    </AlertDialog.Header>
                    <AlertDialog.Body className="dialog-body">
                      <p>
                        {invoice.invoiceNumber}（{current.customerName}／{formatAmount(invoice.amount)}）を無効化します。
                      </p>
                      <p>無効化した請求書は元に戻せません。一覧にも表示されなくなります。</p>
                      {voidError ? (
                        <Alert status="danger">
                          <Alert.Indicator />
                          <Alert.Content>
                            <Alert.Title>無効化できませんでした</Alert.Title>
                            <Alert.Description>{voidError}</Alert.Description>
                          </Alert.Content>
                        </Alert>
                      ) : null}
                    </AlertDialog.Body>
                    <AlertDialog.Footer>
                      <Button onPress={() => setVoidOpen(false)} variant="tertiary">
                        キャンセル
                      </Button>
                      <Button onPress={confirmVoid} variant="danger">
                        無効化する
                      </Button>
                    </AlertDialog.Footer>
                  </AlertDialog.Dialog>
                </AlertDialog.Container>
              </AlertDialog.Backdrop>
            </AlertDialog.Root>
          </div>
        </header>
      </div>

      <div className="detail-grid">
        {saveStatus === "saved" ? (
          <Alert status="success">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Title>請求書の変更を保存しました</Alert.Title>
              <Alert.Description>最新の内容を下に表示しています。</Alert.Description>
            </Alert.Content>
          </Alert>
        ) : null}

        <Card>
          <Card.Header>
            <Card.Title>請求内容</Card.Title>
          </Card.Header>
          <Card.Content>
            <div className="detail-content">
              <DetailField label="請求書番号">{invoice.invoiceNumber}</DetailField>
              <DetailField label="顧客名">{current.customerName}</DetailField>
              <DetailField label="発行日">
                <span className="numeric-text">{formatDate(invoice.issuedOn)}</span>
              </DetailField>
              <DetailField label="支払期限">
                <span className="numeric-text">{formatDate(current.dueDate)}</span>
              </DetailField>
              <DetailField label="金額">
                <span className="numeric-text">{formatAmount(invoice.amount)}</span>
              </DetailField>
              <DetailField label="ステータス">
                <StatusChip status={invoice.status} />
              </DetailField>
            </div>
          </Card.Content>
        </Card>

        <Card>
          <Card.Header>
            <Card.Title>明細</Card.Title>
          </Card.Header>
          <Card.Content>
            <ul className="detail-content plain-list">
              {invoice.lineItems.map((item) => (
                <li className="line-item" key={item.name}>
                  <span className="line-item__name">{item.name}</span>
                  <span className="line-item__meta numeric-text">{formatLineItem(item)}</span>
                </li>
              ))}
            </ul>
          </Card.Content>
        </Card>

        <Card>
          <Card.Header>
            <Card.Title>メモ</Card.Title>
          </Card.Header>
          <Card.Content>
            <div className="detail-content">
              <p className="detail-field__value">{current.note || "メモはありません。"}</p>
            </div>
          </Card.Content>
        </Card>
      </div>
    </main>
  );
}
