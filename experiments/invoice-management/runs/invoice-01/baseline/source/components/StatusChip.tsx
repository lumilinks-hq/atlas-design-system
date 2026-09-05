import { Chip } from "@heroui/react";
import type { InvoiceStatus } from "../fixtures";
import { statusChipColor } from "../format";

/** 請求書のステータス表示。 */
export function StatusChip({ status }: { status: InvoiceStatus }) {
  return (
    <Chip color={statusChipColor(status)} size="sm" variant="soft">
      <Chip.Label>{status}</Chip.Label>
    </Chip>
  );
}
