import { Chip } from "@heroui/react";
import type { CustomerStatus } from "./fixtures";

const chipColorByStatus = {
  商談中: "accent",
  利用中: "success",
  休眠: "default",
} as const satisfies Record<CustomerStatus, "accent" | "success" | "default">;

export const CUSTOMER_STATUSES = Object.keys(chipColorByStatus) as CustomerStatus[];

export function CustomerStatusChip({ status }: { status: CustomerStatus }) {
  return (
    <Chip color={chipColorByStatus[status]} size="sm" variant="soft">
      <Chip.Label>{status}</Chip.Label>
    </Chip>
  );
}
