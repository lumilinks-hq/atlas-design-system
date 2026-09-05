import { Alert, AlertDialog, Button, Spinner, Typography } from "@heroui/react";
import type { InvoiceDetail } from "../fixtures";
import { formatAmount, formatDate } from "../format";

type VoidInvoiceDialogProps = {
  invoice: InvoiceDetail;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  isVoiding: boolean;
  voidError: string | null;
  onConfirm: () => void;
};

export function VoidInvoiceDialog({
  invoice,
  isOpen,
  onOpenChange,
  isVoiding,
  voidError,
  onConfirm,
}: VoidInvoiceDialogProps) {
  return (
    <AlertDialog isOpen={isOpen} onOpenChange={onOpenChange}>
      <Button size="sm" variant="danger-soft">
        無効化
      </Button>
      <AlertDialog.Backdrop>
        <AlertDialog.Container size="sm">
          <AlertDialog.Dialog>
            <AlertDialog.Header>
              <AlertDialog.Icon status="danger" />
              <AlertDialog.Heading>{invoice.invoiceNumber}を無効化しますか</AlertDialog.Heading>
            </AlertDialog.Header>

            <AlertDialog.Body className="flex flex-col gap-4">
              <Typography.Paragraph size="sm">
                無効化すると、この請求書は一覧から削除され、元に戻せません。
              </Typography.Paragraph>

              <dl className="flex flex-col gap-2 rounded-lg bg-background-secondary p-3 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-muted">請求書番号</dt>
                  <dd className="font-medium">{invoice.invoiceNumber}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted">顧客名</dt>
                  <dd className="font-medium">{invoice.customerName}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted">支払期限</dt>
                  <dd className="font-medium">{formatDate(invoice.dueDate)}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted">金額</dt>
                  <dd className="font-medium tabular-nums">{formatAmount(invoice.amount)}</dd>
                </div>
              </dl>

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

            <AlertDialog.Footer className="flex justify-end gap-2">
              <Button
                isDisabled={isVoiding}
                onPress={() => onOpenChange(false)}
                variant="tertiary"
              >
                キャンセル
              </Button>
              <Button isDisabled={isVoiding} onPress={onConfirm} variant="danger">
                {isVoiding ? (
                  <>
                    <Spinner size="sm" />
                    無効化しています
                  </>
                ) : voidError ? (
                  "再試行"
                ) : (
                  "無効化する"
                )}
              </Button>
            </AlertDialog.Footer>
          </AlertDialog.Dialog>
        </AlertDialog.Container>
      </AlertDialog.Backdrop>
    </AlertDialog>
  );
}
