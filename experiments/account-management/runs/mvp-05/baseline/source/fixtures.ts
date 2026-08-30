export type UserRole = "manager" | "viewer";
export type PlanName = "Starter" | "Business" | "Enterprise";

export const companyFixture = {
  id: "company_northstar",
  name: "株式会社ノーススター",
  status: "契約中",
  plan: "Business" as PlanName,
  contractStart: "2026-04-01",
  contractEnd: "2027-03-31",
  seats: 50,
  usedSeats: 42,
  members: [
    { id: "member_1", name: "佐藤 葵", email: "aoi.sato@example.com", role: "管理者", status: "利用中" },
    { id: "member_2", name: "田中 司", email: "tsukasa.tanaka@example.com", role: "メンバー", status: "利用中" },
    { id: "member_3", name: "鈴木 凪", email: "nagi.suzuki@example.com", role: "閲覧者", status: "招待中" }
  ]
} as const;

export const currentUserFixture = {
  id: "user_1",
  name: "高橋 澪",
  role: "manager" as UserRole
};

export const availablePlans: PlanName[] = ["Starter", "Business", "Enterprise"];
