import example from "../../design/examples/account-management.json";

export type AccountManagementTableColumnId =
  | "companyName"
  | "contactName"
  | "lastContactedAt"
  | "status";

export type AccountManagementTableColumn = {
  id: AccountManagementTableColumnId;
  label: string;
  width: `${number}%`;
  minWidth: number;
  align: "start" | "center" | "end";
  isRowHeader?: boolean;
  tabular?: boolean;
};

export type AccountManagementTableUsage = {
  variant: "primary";
  narrowVariant: "collection-list";
  columns: AccountManagementTableColumn[];
};

export const accountManagementTableUsage = example.componentUsage[
  "component.table"
] as AccountManagementTableUsage;

export function createAccountManagementTableCodeExample() {
  const columns = JSON.stringify(accountManagementTableUsage.columns, null, 2);

  return `import { Chip, Link, Table } from "@heroui/react";

const CUSTOMER_TABLE_COLUMNS = ${columns} as const;

const customers = [
  { id: "atlas", companyName: "アトラス株式会社", contactName: "佐藤 葵", lastContactedAt: "2026/08/28", status: "利用中", color: "success" },
  { id: "hokuto", companyName: "北斗物流株式会社", contactName: "田中 司", lastContactedAt: "2026/08/26", status: "商談中", color: "warning" },
  { id: "aoba", companyName: "青葉商事株式会社", contactName: "鈴木 凪", lastContactedAt: "2026/08/22", status: "利用中", color: "success" },
  { id: "nagumo", companyName: "南雲製作所", contactName: "伊藤 澪", lastContactedAt: "2026/07/18", status: "休眠", color: "default" },
] as const;

function renderCell(customer, columnId) {
  if (columnId === "companyName") {
    return <Link href={\`#/customers/\${customer.id}\`}>{customer.companyName}</Link>;
  }
  if (columnId === "status") {
    return <Chip color={customer.color} size="sm" variant="soft">{customer.status}</Chip>;
  }
  return customer[columnId];
}

export function CustomerTable() {
  return (
    <Table.Root aria-label="顧客一覧" variant="${accountManagementTableUsage.variant}">
      <Table.ScrollContainer>
        <Table.Content>
          <Table.Header columns={CUSTOMER_TABLE_COLUMNS}>
            {(column) => (
              <Table.Column
                id={column.id}
                isRowHeader={"isRowHeader" in column && column.isRowHeader}
                width={column.width}
                minWidth={column.minWidth}
                data-align={column.align}
              >
                {column.label}
              </Table.Column>
            )}
          </Table.Header>
          <Table.Body items={customers}>
            {(customer) => (
              <Table.Row id={customer.id} columns={CUSTOMER_TABLE_COLUMNS}>
                {(column) => (
                  <Table.Cell
                    className={"tabular" in column && column.tabular ? "tabular" : undefined}
                    data-align={column.align}
                  >
                    {renderCell(customer, column.id)}
                  </Table.Cell>
                )}
              </Table.Row>
            )}
          </Table.Body>
        </Table.Content>
      </Table.ScrollContainer>
    </Table.Root>
  );
}`;
}
