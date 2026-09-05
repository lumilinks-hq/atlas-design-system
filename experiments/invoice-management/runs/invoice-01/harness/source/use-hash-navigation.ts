import { useCallback } from "react";
import { useNavigate } from "react-router-dom";

type PressLikeEvent = {
  metaKey: boolean;
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
};

/**
 * HashRouter 上でも遷移を即座に反映するためのハンドラ。
 * href は実アンカーとして残すので、修飾キー付きの操作は別タブを開くブラウザ既定へ委ねる。
 */
export function useHashNavigation(): (path: string, event: PressLikeEvent) => void {
  const navigate = useNavigate();
  return useCallback(
    (path, event) => {
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      navigate(path);
    },
    [navigate],
  );
}
