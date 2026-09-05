import { Alert, Button, Card, Link, Separator, Table, Typography } from "@heroui/react";
import type { FormEvent } from "react";
import { useMemo, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { PageShell } from "../components/PageShell";
import { StatusChip } from "../components/StatusChip";
import type { InvoiceDetail } from "../fixtures";
import { getInvoiceDetail } from "../fixtures";
import { formatAmount, formatDate, validateDueDate } from "../format";
import type { InvoiceEditDraft } from "../invoiceApi";
import {
  SAVE_FAILURE_REASON,
  applySavedEdits,
  requestVoidInvoice,
  saveInvoiceEdits,
  toEditDraft,
} from "../invoiceApi";
import type { DetailScreenState } from "../screenState";
import { useDetailScreenState } from "../screenState";
import { InvoiceEditDrawer } from "./InvoiceEditDrawer";
import { VoidInvoiceDialog } from "./VoidInvoiceDialog";

const VOID_FAILURE_REASON = "無効化に失敗しました。時間をおいて再試行してください。";

const EDIT_OPEN_STATES: readonly DetailScreenState[] = [
  "drawer-open",
  "invalid-due-date",
  "loading",
  "failure",
];
const VOID_OPEN_STATES: readonly DetailScreenState[] = ["void-confirm", "void-failure"];

type SaveStatus = "idle" | "saving" | "saved" | "error";
type VoidStatus = "idle" | "voiding" | "error";

export function InvoiceDetailPage() {
  const { invoiceId = "" } = useParams();
  // 詳細では選択した請求書の完全な情報を別途取得する。
  const detail = useMemo(() => getInvoiceDetail(invoiceId), [invoiceId]);

  if (!detail) return <Navigate replace to="/invoices" />;

  return <InvoiceDetailScreen detail={detail} key={invoiceId} />;
}

function InvoiceDetailScreen({ detail }: { detail: InvoiceDetail }) {
  const screenState = useDetailScreenState();
  const navigate = useNavigate();

  const [invoice, setInvoice] = useState(() => applySavedEdits(detail));
  const [isEditOpen, setEditOpen] = useState(() => EDIT_OPEN_STATES.includes(screenState));
  const [draft, setDraft] = useState<InvoiceEditDraft>(() => {
    const initial = toEditDraft(applySavedEdits(detail));
    return screenState === "invalid-due-date" ? { ...initial, dueDate: "" } : initial;
  });
  const [isDueDateChecked, setDueDateChecked] = useState(
    () => screenState === "invalid-due-date",
  );
  const [saveStatus, setSaveStatus] = useState<SaveStatus>(() => {
    if (screenState === "loading") return "saving";
    if (screenState === "success") return "saved";
    if (screenState === "failure") return "error";
    return "idle";
  });
  const [saveError, setSaveError] = useState<string | null>(() =>
    screenState === "failure" ? SAVE_FAILURE_REASON : null,
  );

  const [isVoidOpen, setVoidOpen] = useState(() => VOID_OPEN_STATES.includes(screenState));
  const [voidStatus, setVoidStatus] = useState<VoidStatus>(() =>
    screenState === "void-failure" ? "error" : "idle",
  );
  const [voidError, setVoidError] = useState<string | null>(() =>
    screenState === "void-failure" ? VOID_FAILURE_REASON : null,
  );

  const isSaving = saveStatus === "saving";
  const isVoiding = voidStatus === "voiding";
  const dueDateError = isDueDateChecked ? validateDueDate(draft.dueDate) : null;

  function handleEditOpenChange(nextOpen: boolean) {
    // 保存中は閉じられないようにして、二重送信と入力の消失を防ぐ。
    if (isSaving) return;

    if (nextOpen) {
      setDraft(toEditDraft(invoice));
      setDueDateChecked(false);
      setSaveError(null);
      setSaveStatus("idle");
    }
    setEditOpen(nextOpen);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSaving) return;

    setDueDateChecked(true);
    if (validateDueDate(draft.dueDate)) return;

    setSaveError(null);
    setSaveStatus("saving");

    const result = await saveInvoiceEdits(invoice, draft);
    if (!result.ok) {
      // 入力内容はdraftに残したまま、再試行できるようにする。
      setSaveStatus("error");
      setSaveError(result.reason);
      return;
    }

    setInvoice(result.invoice);
    setDraft(toEditDraft(result.invoice));
    setSaveStatus("saved");
    setEditOpen(false);
  }

  function handleVoidOpenChange(nextOpen: boolean) {
    if (isVoiding) return;

    if (nextOpen) {
      setVoidStatus("idle");
      setVoidError(null);
    }
    setVoidOpen(nextOpen);
  }

  async function handleVoidConfirm() {
    if (isVoiding) return;

    setVoidStatus("voiding");
    setVoidError(null);

    const result = await requestVoidInvoice(invoice.id);
    if (!result.ok) {
      setVoidStatus("error");
      setVoidError(result.reason);
      return;
    }

    navigate("/invoices", {
      replace: true,
      state: { voidedInvoiceNumber: invoice.invoiceNumber },
    });
  }

  const lineItemsTotal = invoice.lineItems.reduce(
    (total, item) => total + item.quantity * item.unitPrice,
    0,
  );

  return (
    <PageShell>
      <Link className="self-start" href="/invoices">
        請求書一覧へ戻る
      </Link>

      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-2">
          <Typography.Heading className="text-2xl" level={1}>
            {invoice.invoiceNumber}
          </Typography.Heading>
          <div className="flex items-center gap-2">
            <StatusChip status={invoice.status} />
            <Typography.Paragraph className="text-muted" size="sm">
              {invoice.customerName}
            </Typography.Paragraph>
          </div>
        </div>

        <div className="flex shrink-0 gap-2">
          <InvoiceEditDrawer
            draft={draft}
            dueDateError={dueDateError}
            invoiceNumber={invoice.invoiceNumber}
            isOpen={isEditOpen}
            isSaving={isSaving}
            onDraftChange={setDraft}
            onOpenChange={handleEditOpenChange}
            onSubmit={handleSubmit}
            saveError={saveError}
          />
          <VoidInvoiceDialog
            invoice={invoice}
            isOpen={isVoidOpen}
            isVoiding={isVoiding}
            onConfirm={handleVoidConfirm}
            onOpenChange={handleVoidOpenChange}
            voidError={voidError}
          />
        </div>
      </header>

      {saveStatus === "saved" ? (
        <Alert status="success">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>変更を保存しました</Alert.Title>
            <Alert.Description>最新の内容を表示しています。</Alert.Description>
          </Alert.Content>
          <Button
            aria-label="通知を閉じる"
            onPress={() => setSaveStatus("idle")}
            size="sm"
            variant="ghost"
          >
            閉じる
          </Button>
        </Alert>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <Card.Header>
            <Card.Title>請求内容</Card.Title>
          </Card.Header>
          <Card.Content className="flex flex-col gap-5">
            <dl className="grid gap-4 sm:grid-cols-2">
              <DetailField label="請求書番号" value={invoice.invoiceNumber} />
              <DetailField label="顧客名" value={invoice.customerName} />
              <DetailField label="発行日" value={formatDate(invoice.issuedOn)} />
            </dl>

            <Separator />

            <section className="flex flex-col gap-3">
              <Typography.Heading className="text-base" level={2}>
                明細
              </Typography.Heading>
              <Table>
                <Table.ScrollContainer>
                  <Table.Content aria-label="請求明細">
                    <Table.Header>
                      <Table.Column id="name" isRowHeader>
                        品目
                      </Table.Column>
                      <Table.Column className="text-right" id="quantity">
                        数量
                      </Table.Column>
                      <Table.Column className="text-right" id="unitPrice">
                        単価
                      </Table.Column>
                      <Table.Column className="text-right" id="subtotal">
                        小計
                      </Table.Column>
                    </Table.Header>
                    <Table.Body items={invoice.lineItems.map((item, index) => ({ ...item, id: index }))}>
                      {(item) => (
                        <Table.Row id={item.id}>
                          <Table.Cell>{item.name}</Table.Cell>
                          <Table.Cell className="text-right tabular-nums">
                            {item.quantity}
                          </Table.Cell>
                          <Table.Cell className="text-right tabular-nums">
                            {formatAmount(item.unitPrice)}
                          </Table.Cell>
                          <Table.Cell className="text-right tabular-nums">
                            {formatAmount(item.quantity * item.unitPrice)}
                          </Table.Cell>
                        </Table.Row>
                      )}
                    </Table.Body>
                  </Table.Content>
                </Table.ScrollContainer>
              </Table>
              <div className="flex justify-end gap-6 text-sm">
                <span className="text-muted">明細合計</span>
                <span className="font-semibold tabular-nums">{formatAmount(lineItemsTotal)}</span>
              </div>
            </section>
          </Card.Content>
        </Card>

        <div className="flex flex-col gap-6">
          <Card>
            <Card.Header>
              <Card.Title>入金状況</Card.Title>
            </Card.Header>
            <Card.Content>
              <dl className="flex flex-col gap-4">
                <div className="flex flex-col gap-1">
                  <dt className="text-sm text-muted">ステータス</dt>
                  <dd>
                    <StatusChip status={invoice.status} />
                  </dd>
                </div>
                <DetailField label="支払期限" value={formatDate(invoice.dueDate)} />
                <DetailField label="請求金額" value={formatAmount(invoice.amount)} />
              </dl>
            </Card.Content>
          </Card>

          <Card>
            <Card.Header>
              <Card.Title>メモ</Card.Title>
            </Card.Header>
            <Card.Content>
              <Typography.Paragraph className="whitespace-pre-wrap" size="sm">
                {invoice.note || "メモはありません。"}
              </Typography.Paragraph>
            </Card.Content>
          </Card>
        </div>
      </div>
    </PageShell>
  );
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="text-sm font-medium">{value}</dd>
    </div>
  );
}
