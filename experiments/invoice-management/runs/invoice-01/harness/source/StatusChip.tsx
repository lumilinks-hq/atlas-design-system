import { Chip } from "@heroui/react";
import type { InvoiceStatus } from "./fixtures";

/**
 * 入金状況を表すChip。色だけに頼らず状態名を必ず文字で出す。
 * component.chip の variant は静的な選択肢だけを使う。
 */
export function StatusChip({ status }: { status: InvoiceStatus }) {
  switch (status) {
    case "入金済み":
      return (
        <Chip color="success" variant="soft">
          {status}
        </Chip>
      );
    case "期限超過":
      return (
        <Chip color="danger" variant="soft">
          {status}
        </Chip>
      );
    case "送付済み":
      return (
        <Chip color="accent" variant="soft">
          {status}
        </Chip>
      );
    default:
      return (
        <Chip color="default" variant="soft">
          {status}
        </Chip>
      );
  }
}
