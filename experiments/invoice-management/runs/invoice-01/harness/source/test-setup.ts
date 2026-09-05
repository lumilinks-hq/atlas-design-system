import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// jsdom は matchMedia を実装しないため、HeroUI の useMediaQuery 用に最小限を補う
if (typeof window !== "undefined" && typeof window.matchMedia !== "function") {
  window.matchMedia = (query: string): MediaQueryList => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  });
}

// AlertDialog の高さ計測に ResizeObserver を使うため、jsdom 用に何もしない実装を入れる
if (typeof globalThis.ResizeObserver === "undefined") {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
}

// HeroUI のオーバーレイは portal 経由で body 直下に残ることがあるため、テスト間で DOM を空にする
afterEach(() => {
  cleanup();
  document.body.innerHTML = "";
});
