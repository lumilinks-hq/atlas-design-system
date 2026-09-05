import {
  Alert,
  Button,
  Description,
  Drawer,
  FieldError,
  Form,
  Input,
  Label,
  Spinner,
  TextArea,
  TextField,
} from "@heroui/react";
import type { FormEvent } from "react";
import type { InvoiceEditDraft } from "../invoiceApi";

type InvoiceEditDrawerProps = {
  invoiceNumber: string;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  draft: InvoiceEditDraft;
  onDraftChange: (draft: InvoiceEditDraft) => void;
  dueDateError: string | null;
  isSaving: boolean;
  saveError: string | null;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export function InvoiceEditDrawer({
  invoiceNumber,
  isOpen,
  onOpenChange,
  draft,
  onDraftChange,
  dueDateError,
  isSaving,
  saveError,
  onSubmit,
}: InvoiceEditDrawerProps) {
  return (
    <Drawer isOpen={isOpen} onOpenChange={onOpenChange}>
      <Button size="sm" variant="secondary">
        編集
      </Button>
      <Drawer.Backdrop isDismissable={!isSaving}>
        <Drawer.Content placement="right">
          <Drawer.Dialog>
            <Form onSubmit={onSubmit} validationBehavior="aria">
              <Drawer.Header>
                <Drawer.Heading>請求書を編集</Drawer.Heading>
                <Description>{invoiceNumber}の顧客名、支払期限、メモを変更します。</Description>
              </Drawer.Header>

              <Drawer.Body className="flex flex-col gap-5">
                {saveError ? (
                  <Alert status="danger">
                    <Alert.Indicator />
                    <Alert.Content>
                      <Alert.Title>保存できませんでした</Alert.Title>
                      <Alert.Description>{saveError}</Alert.Description>
                    </Alert.Content>
                  </Alert>
                ) : null}

                <TextField
                  isDisabled={isSaving}
                  onChange={(customerName) => onDraftChange({ ...draft, customerName })}
                  value={draft.customerName}
                  validationBehavior="aria"
                >
                  <Label>顧客名</Label>
                  <Input placeholder="有限会社みなも" />
                </TextField>

                <TextField
                  isDisabled={isSaving}
                  isInvalid={dueDateError !== null}
                  isRequired
                  onChange={(dueDate) => onDraftChange({ ...draft, dueDate })}
                  value={draft.dueDate}
                  validationBehavior="aria"
                >
                  <Label>支払期限</Label>
                  <Input inputMode="numeric" placeholder="2026-09-30" />
                  <Description>2026-09-30のように年月日を入力します。</Description>
                  {dueDateError ? <FieldError>{dueDateError}</FieldError> : null}
                </TextField>

                <TextField
                  isDisabled={isSaving}
                  onChange={(note) => onDraftChange({ ...draft, note })}
                  value={draft.note}
                  validationBehavior="aria"
                >
                  <Label>メモ</Label>
                  <TextArea placeholder="社内向けの補足を入力します。" rows={4} />
                </TextField>
              </Drawer.Body>

              <Drawer.Footer className="flex justify-end gap-2">
                <Button
                  isDisabled={isSaving}
                  onPress={() => onOpenChange(false)}
                  type="button"
                  variant="tertiary"
                >
                  キャンセル
                </Button>
                <Button isDisabled={isSaving} type="submit" variant="primary">
                  {isSaving ? (
                    <>
                      <Spinner size="sm" />
                      保存しています
                    </>
                  ) : (
                    "保存"
                  )}
                </Button>
              </Drawer.Footer>
            </Form>
          </Drawer.Dialog>
        </Drawer.Content>
      </Drawer.Backdrop>
    </Drawer>
  );
}
