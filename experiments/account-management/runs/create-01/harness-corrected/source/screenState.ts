import { useSearchParams } from "react-router-dom";

/** brief.md の必須状態。URL の `state` query から確認できるようにする */
export const SCREEN_STATES = [
  "default",
  "empty",
  "create-open",
  "drawer-open",
  "invalid-email",
  "loading",
  "success",
  "failure",
  "delete-confirm",
] as const;

export type ScreenState = (typeof SCREEN_STATES)[number];

export function useScreenState(): ScreenState {
  const [searchParams] = useSearchParams();
  const requested = searchParams.get("state") ?? "";
  return SCREEN_STATES.find((state) => state === requested) ?? "default";
}
