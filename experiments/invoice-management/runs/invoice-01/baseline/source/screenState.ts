import { useLocation } from "react-router-dom";

/** 請求書一覧画面で確認できる状態。 */
export const LIST_SCREEN_STATES = ["default", "empty"] as const;

/** 請求書詳細画面で確認できる状態。 */
export const DETAIL_SCREEN_STATES = [
  "default",
  "drawer-open",
  "invalid-due-date",
  "loading",
  "success",
  "failure",
  "void-confirm",
  "void-failure",
] as const;

export type ListScreenState = (typeof LIST_SCREEN_STATES)[number];
export type DetailScreenState = (typeof DETAIL_SCREEN_STATES)[number];

/**
 * `state` クエリを読む。
 * HashRouterの`#/invoices?state=empty`と、ホスト側の`?state=empty#/invoices`のどちらでも拾う。
 */
function readStateParam(routeSearch: string): string | null {
  const fromRoute = new URLSearchParams(routeSearch).get("state");
  if (fromRoute) return fromRoute;

  if (typeof window === "undefined") return null;

  return new URLSearchParams(window.location.search).get("state");
}

function resolveScreenState<T extends string>(
  routeSearch: string,
  allowed: readonly T[],
  fallback: T,
): T {
  const value = readStateParam(routeSearch);
  return allowed.includes(value as T) ? (value as T) : fallback;
}

export function useListScreenState(): ListScreenState {
  const { search } = useLocation();
  return resolveScreenState(search, LIST_SCREEN_STATES, "default");
}

export function useDetailScreenState(): DetailScreenState {
  const { search } = useLocation();
  return resolveScreenState(search, DETAIL_SCREEN_STATES, "default");
}
