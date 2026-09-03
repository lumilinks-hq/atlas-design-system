import { Alert, AlertDialog, Button, Typography } from "@heroui/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { removeCustomer } from "./customerApi";
import type { CustomerDetail } from "./fixtures";

type DeleteCustomerDialogProps = {
  customer: CustomerDetail;
  isOpen: boolean;
  /** 削除失敗の状態をURLから確認するときだけtrueになる。 */
  seedFailure: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onDeleted: (customer: CustomerDetail) => void;
};

export function DeleteCustomerDialog({
  customer,
  isOpen,
  seedFailure,
  onOpenChange,
  onDeleted,
}: DeleteCustomerDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorReason, setErrorReason] = useState<string | null>(null);
  const hasSeededFailure = useRef(false);

  const runDelete = useCallback(
    async (options: { simulateFailure?: boolean } = {}) => {
      setIsDeleting(true);
      setErrorReason(null);

      const result = await removeCustomer(customer.id, options);
      setIsDeleting(false);

      if (!result.ok) {
        setErrorReason(result.reason);
        return;
      }
      onDeleted(customer);
    },
    [customer, onDeleted],
  );

  useEffect(() => {
    if (!seedFailure || hasSeededFailure.current) return;

    hasSeededFailure.current = true;
    void runDelete({ simulateFailure: true });
  }, [runDelete, seedFailure]);

  return (
    <AlertDialog isOpen={isOpen} onOpenChange={onOpenChange}>
      <AlertDialog.Backdrop>
        <AlertDialog.Container>
          <AlertDialog.Dialog>
            <AlertDialog.Header>
              <AlertDialog.Icon status="danger" />
              <AlertDialog.Heading>「{customer.companyName}」を削除しますか？</AlertDialog.Heading>
            </AlertDialog.Header>

            <AlertDialog.Body className="flex flex-col gap-3">
              <Typography.Paragraph>
                担当者や対応メモを含む顧客情報がすべて消え、元に戻せません。
              </Typography.Paragraph>

              {errorReason ? (
                <Alert role="alert" status="danger">
                  <Alert.Indicator />
                  <Alert.Content>
                    <Alert.Title>削除できませんでした</Alert.Title>
                    <Alert.Description>{errorReason}</Alert.Description>
                  </Alert.Content>
                </Alert>
              ) : null}
            </AlertDialog.Body>

            <AlertDialog.Footer>
              <Button isDisabled={isDeleting} variant="tertiary" onPress={() => onOpenChange(false)}>
                キャンセル
              </Button>
              <Button isDisabled={isDeleting} variant="danger" onPress={() => void runDelete()}>
                {isDeleting ? "削除中" : errorReason ? "再試行" : "削除する"}
              </Button>
            </AlertDialog.Footer>
          </AlertDialog.Dialog>
        </AlertDialog.Container>
      </AlertDialog.Backdrop>
    </AlertDialog>
  );
}
