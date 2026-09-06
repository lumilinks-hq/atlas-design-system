/**
 * URL の `state` クエリで確認できる画面状態。
 * 状態を切り替える専用の UI は画面に置かず、URL からのみ指定する。
 */

export const listScreenStates = ["default", "empty", "create-open"] as const;

export const detailScreenStates = [
  "drawer-open",
  "invalid-email",
  "loading",
  "success",
  "failure",
  "delete-confirm",
] as const;

export type ListScreenState = (typeof listScreenStates)[number];
export type DetailScreenState = (typeof detailScreenStates)[number];

export function readListScreenState(value: string | null): ListScreenState | null {
  return listScreenStates.find((state) => state === value) ?? null;
}

export function readDetailScreenState(value: string | null): DetailScreenState | null {
  return detailScreenStates.find((state) => state === value) ?? null;
}
