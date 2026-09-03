/**
 * jsdomにはmatchMediaが無く、HeroUIの狭幅判定が動かないため最小限を補う。
 * テスト環境だけの補完で、アプリの実装には影響しない。
 */
if (!window.matchMedia) {
  window.matchMedia = (query: string): MediaQueryList =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList;
}

/** ResizeObserverもjsdomに無いため、計測しない最小実装を用意する。 */
if (!globalThis.ResizeObserver) {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
}
