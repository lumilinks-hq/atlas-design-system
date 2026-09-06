import { useSearchParams } from "react-router-dom";

// URLの state query から必須状態を読む。状態切り替え専用のUIは画面に出さない
export const screenStates = [
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

export type ScreenState = (typeof screenStates)[number];

function isScreenState(value: string | null): value is ScreenState {
  return value !== null && (screenStates as readonly string[]).includes(value);
}

export function useScreenState(): ScreenState {
  const [searchParams] = useSearchParams();
  const value = searchParams.get("state");
  return isScreenState(value) ? value : "default";
}

// 保存や削除の処理中を実際に画面へ出すための最小待機
export function wait(milliseconds = 200): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}
