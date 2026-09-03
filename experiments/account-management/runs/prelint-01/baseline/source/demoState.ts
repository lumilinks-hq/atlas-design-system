/**
 * URLの`state` queryで画面状態を確認するための定義。
 * 画面には状態切り替え用のUIを置かず、このqueryだけで初期状態を決める。
 */

const LIST_DEMO_STATES = ["default", "empty"] as const;

const DETAIL_DEMO_STATES = [
  "default",
  "drawer-open",
  "invalid-email",
  "loading",
  "success",
  "failure",
  "delete-confirm",
  "delete-failure",
] as const;

export type ListDemoState = (typeof LIST_DEMO_STATES)[number];
export type DetailDemoState = (typeof DETAIL_DEMO_STATES)[number];

function readDemoState<T extends string>(searchParams: URLSearchParams, allowed: readonly T[], fallback: T): T {
  const value = searchParams.get("state") as T | null;
  return value && allowed.includes(value) ? value : fallback;
}

export function readListDemoState(searchParams: URLSearchParams): ListDemoState {
  return readDemoState(searchParams, LIST_DEMO_STATES, "default");
}

export function readDetailDemoState(searchParams: URLSearchParams): DetailDemoState {
  return readDemoState(searchParams, DETAIL_DEMO_STATES, "default");
}
