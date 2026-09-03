import { Chip } from "@heroui/react";
import type { CustomerStatus } from "./fixtures";

type ChipAppearance = {
  color: "default" | "warning";
  variant: "secondary" | "soft";
};

/**
 * 通常状態は意味色を使わず、確認が必要な「休眠」だけwarningで示す。
 * 状態名は必ず文字で表示し、色だけに意味を持たせない。
 */
const STATUS_APPEARANCE: Record<CustomerStatus, ChipAppearance> = {
  商談中: { color: "default", variant: "secondary" },
  利用中: { color: "default", variant: "soft" },
  休眠: { color: "warning", variant: "soft" },
};

export function CustomerStatusChip({ status }: { status: CustomerStatus }) {
  const appearance = STATUS_APPEARANCE[status];

  return (
    <Chip color={appearance.color} size="sm" variant={appearance.variant}>
      {status}
    </Chip>
  );
}
