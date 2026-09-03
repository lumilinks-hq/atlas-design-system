/**
 * URLの`state` queryから読み取る画面状態。
 * 状態切り替え専用のUIは画面に出さず、URLだけで再現できるようにする。
 */
export type ListScreenState = "default" | "empty";

export type DetailScreenState =
  | "default"
  | "drawer-open"
  | "invalid-email"
  | "loading"
  | "success"
  | "failure"
  | "delete-confirm"
  | "delete-failure";

const LIST_SCREEN_STATES: ListScreenState[] = ["default", "empty"];

const DETAIL_SCREEN_STATES: DetailScreenState[] = [
  "default",
  "drawer-open",
  "invalid-email",
  "loading",
  "success",
  "failure",
  "delete-confirm",
  "delete-failure",
];

export function parseListScreenState(value: string | null): ListScreenState {
  const state = LIST_SCREEN_STATES.find((candidate) => candidate === value);
  return state ?? "default";
}

export function parseDetailScreenState(value: string | null): DetailScreenState {
  const state = DETAIL_SCREEN_STATES.find((candidate) => candidate === value);
  return state ?? "default";
}
