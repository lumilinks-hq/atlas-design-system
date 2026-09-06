import { Chip } from "@heroui/react";
import type { CustomerStatus } from "../fixtures";

const statusColors: Record<CustomerStatus, "accent" | "success" | "default"> = {
  商談中: "accent",
  利用中: "success",
  休眠: "default",
};

export function StatusChip({ status }: { status: CustomerStatus }) {
  return (
    <Chip color={statusColors[status]} size="sm" variant="soft">
      <Chip.Label>{status}</Chip.Label>
    </Chip>
  );
}
