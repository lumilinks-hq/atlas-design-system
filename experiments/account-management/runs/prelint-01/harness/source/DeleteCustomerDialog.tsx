import { Alert, AlertDialog, Button, toast } from "@heroui/react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { removeCustomer } from "./customerStore";
import type { CustomerDetail } from "./fixtures";
import type { DetailScreenState } from "./screenState";

const OPEN_STATES: DetailScreenState[] = ["delete-confirm", "delete-failure"];

export function DeleteCustomerDialog({
  customer,
  screenState,
}: {
  customer: CustomerDetail;
  screenState: DetailScreenState;
}) {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(OPEN_STATES.includes(screenState));
  const [failureReason, setFailureReason] = useState<string | null>(null);
  /** `?state=delete-failure`のときだけ最初の1回を失敗させ、再試行で成功できるようにする。 */
  const [shouldFailOnce, setShouldFailOnce] = useState(screenState === "delete-failure");

  function handleOpenChange(open: boolean) {
    setIsOpen(open);
    if (open) setFailureReason(null);
  }

  function handleConfirm() {
    const result = removeCustomer(customer.id, { simulateFailure: shouldFailOnce });
    if (!result.ok) {
      setShouldFailOnce(false);
      setFailureReason(result.reason);
      return;
    }
    setIsOpen(false);
    toast.success("顧客を削除しました", {
      description: `${customer.companyName}を顧客一覧から削除しました。`,
    });
    navigate("/customers");
  }

  return (
    <AlertDialog isOpen={isOpen} onOpenChange={handleOpenChange}>
      <Button variant="danger-soft">顧客を削除</Button>
      <AlertDialog.Backdrop>
        <AlertDialog.Container>
          <AlertDialog.Dialog>
            <AlertDialog.Header>
              <AlertDialog.Icon status="danger" />
              <AlertDialog.Heading>顧客の削除</AlertDialog.Heading>
            </AlertDialog.Header>

            <AlertDialog.Body>
              <div className="confirm-content">
                <p>{customer.companyName}を削除します。</p>
                <p>削除した顧客情報は元に戻せません。</p>
                {failureReason ? (
                  <Alert status="danger">
                    <Alert.Indicator />
                    <Alert.Content>
                      <Alert.Title>削除できませんでした</Alert.Title>
                      <Alert.Description>{failureReason}</Alert.Description>
                    </Alert.Content>
                  </Alert>
                ) : null}
              </div>
            </AlertDialog.Body>

            <AlertDialog.Footer>
              <Button onPress={() => setIsOpen(false)} variant="tertiary">
                キャンセル
              </Button>
              <Button onPress={handleConfirm} variant="danger">
                削除する
              </Button>
            </AlertDialog.Footer>
          </AlertDialog.Dialog>
        </AlertDialog.Container>
      </AlertDialog.Backdrop>
    </AlertDialog>
  );
}
