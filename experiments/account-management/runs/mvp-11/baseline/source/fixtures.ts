export type CustomerStatus = "商談中" | "利用中" | "休眠";

type CustomerRecord = {
  id: string;
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  status: CustomerStatus;
  lastContactedAt: string;
  note: string;
};

export type CustomerSummary = Pick<
  CustomerRecord,
  "id" | "companyName" | "contactName" | "status" | "lastContactedAt"
>;

export type CustomerDetail = Omit<CustomerRecord, "lastContactedAt">;

const initialCustomerRecords: CustomerRecord[] = [
  {
    id: "customer_northstar",
    companyName: "株式会社ノーススター",
    contactName: "佐藤 葵",
    email: "aoi.sato@example.com",
    phone: "03-1234-5678",
    status: "利用中",
    lastContactedAt: "2026-08-28",
    note: "次回の定例は9月5日。新しい担当者を紹介予定。",
  },
  {
    id: "customer_hokuto",
    companyName: "北斗物流株式会社",
    contactName: "田中 司",
    email: "tsukasa.tanaka@example.com",
    phone: "06-2345-6789",
    status: "商談中",
    lastContactedAt: "2026-08-26",
    note: "運用開始時期を社内で確認中。",
  },
  {
    id: "customer_aoba",
    companyName: "青葉商事株式会社",
    contactName: "鈴木 凪",
    email: "nagi.suzuki@example.com",
    phone: "052-345-6789",
    status: "利用中",
    lastContactedAt: "2026-08-22",
    note: "利用状況に問題なし。次回は10月に連絡する。",
  },
  {
    id: "customer_nagumo",
    companyName: "南雲製作所",
    contactName: "伊藤 澪",
    email: "mio.ito@example.com",
    phone: "045-456-7890",
    status: "休眠",
    lastContactedAt: "2026-07-18",
    note: "担当者変更後、連絡時期を再調整する。",
  },
];

let customerRecords: CustomerRecord[] = initialCustomerRecords.map((record) => ({ ...record }));

export function listCustomerSummaries(): CustomerSummary[] {
  return customerRecords.map(({ id, companyName, contactName, status, lastContactedAt }) => ({
    id,
    companyName,
    contactName,
    status,
    lastContactedAt,
  }));
}

export function getCustomerDetail(customerId: string): CustomerDetail | undefined {
  const customer = customerRecords.find(({ id }) => id === customerId);
  if (!customer) return undefined;

  return {
    id: customer.id,
    companyName: customer.companyName,
    contactName: customer.contactName,
    email: customer.email,
    phone: customer.phone,
    status: customer.status,
    note: customer.note,
  };
}

export type UpdateCustomerInput = Pick<
  CustomerDetail,
  "companyName" | "contactName" | "email" | "status"
>;

export function updateCustomer(customerId: string, input: UpdateCustomerInput): CustomerDetail | undefined {
  const customer = customerRecords.find(({ id }) => id === customerId);
  if (!customer) return undefined;

  customer.companyName = input.companyName;
  customer.contactName = input.contactName;
  customer.email = input.email;
  customer.status = input.status;

  return getCustomerDetail(customerId);
}

export type DeleteCustomerResult = { ok: true } | { ok: false; reason: string };

export function deleteCustomer(
  customerId: string,
  options: { simulateFailure?: boolean } = {},
): DeleteCustomerResult {
  if (options.simulateFailure) {
    return { ok: false, reason: "削除に失敗しました。時間をおいて再試行してください。" };
  }
  const index = customerRecords.findIndex(({ id }) => id === customerId);
  if (index < 0) {
    return { ok: false, reason: "対象の顧客が見つかりません。" };
  }
  customerRecords.splice(index, 1);
  return { ok: true };
}

export function resetCustomerRecords(): void {
  customerRecords = initialCustomerRecords.map((record) => ({ ...record }));
}
