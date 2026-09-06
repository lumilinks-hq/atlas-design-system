import { useState } from "react";
import { Alert, AlertDialog, Button, Spinner } from "@heroui/react";
import type { CustomerDetail } from "../fixtures";
import { submitCustomerDelete } from "../customerService";

type CustomerDeleteDialogProps = {
  customer: CustomerDetail;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onDeleted: (customer: CustomerDetail) => void;
};

/** 削除は取り消せないため、対象の会社名と結果を確認してから実行する */
export function CustomerDeleteDialog({
  customer,
  isOpen,
  onOpenChange,
  onDeleted,
}: CustomerDeleteDialogProps) {
  const [failureReason, setFailureReason] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (isDeleting) return;

    setFailureReason(null);
    setIsDeleting(true);
    const result = await submitCustomerDelete(customer.id);
    setIsDeleting(false);

    // 失敗しても確認画面は開いたままにして、理由を伝えて再試行できるようにする
    if (!result.ok) {
      setFailureReason(result.reason);
      return;
    }

    onDeleted(customer);
  };

  const handleCancel = () => {
    if (isDeleting) return;
    setFailureReason(null);
    onOpenChange(false);
  };

  return (
    <AlertDialog isOpen={isOpen} onOpenChange={onOpenChange}>
      <AlertDialog.Backdrop>
        <AlertDialog.Container size="md">
          <AlertDialog.Dialog>
            <AlertDialog.Header>
              <AlertDialog.Icon status="danger" />
              <AlertDialog.Heading>顧客を削除</AlertDialog.Heading>
            </AlertDialog.Header>
            <AlertDialog.Body className="flex flex-col gap-4">
              {failureReason ? (
                <Alert status="danger">
                  <Alert.Indicator />
                  <Alert.Content>
                    <Alert.Title>顧客を削除できませんでした</Alert.Title>
                    <Alert.Description>{failureReason}</Alert.Description>
                  </Alert.Content>
                </Alert>
              ) : null}
              <p>
                「{customer.companyName}」を削除します。基本情報と対応メモは元に戻せません。
              </p>
            </AlertDialog.Body>
            <AlertDialog.Footer>
              <Button isDisabled={isDeleting} variant="tertiary" onPress={handleCancel}>
                キャンセル
              </Button>
              <Button isDisabled={isDeleting} variant="danger" onPress={handleDelete}>
                {isDeleting ? <Spinner size="sm" /> : null}
                {isDeleting ? "削除中" : "削除する"}
              </Button>
            </AlertDialog.Footer>
          </AlertDialog.Dialog>
        </AlertDialog.Container>
      </AlertDialog.Backdrop>
    </AlertDialog>
  );
}
