import "@testing-library/jest-dom/vitest";

if (typeof window !== "undefined") {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      addListener: () => undefined,
      removeListener: () => undefined,
      dispatchEvent: () => false,
    }),
  });

  // React Flow を jsdom で描画するためのモック（reactflow.dev/learn/advanced-use/testing）
  class ResizeObserverMock {
    private readonly callback: ResizeObserverCallback;

    constructor(callback: ResizeObserverCallback) {
      this.callback = callback;
    }

    observe(target: Element) {
      setTimeout(() => {
        const contentRect = target.getBoundingClientRect();
        this.callback([{ target, contentRect } as ResizeObserverEntry], this as unknown as ResizeObserver);
      }, 0);
    }

    unobserve() {}

    disconnect() {}
  }

  class DOMMatrixReadOnlyMock {
    m22: number;

    constructor(transform?: string) {
      const scale = transform?.match(/scale\(([1-9.]+)\)/)?.[1];
      this.m22 = scale !== undefined ? Number(scale) : 1;
    }
  }

  window.ResizeObserver = ResizeObserverMock as unknown as typeof ResizeObserver;
  window.DOMMatrixReadOnly = DOMMatrixReadOnlyMock as unknown as typeof DOMMatrixReadOnly;

  Object.defineProperties(window.HTMLElement.prototype, {
    offsetHeight: {
      get(this: HTMLElement) {
        return parseFloat(this.style.height) || 1;
      },
    },
    offsetWidth: {
      get(this: HTMLElement) {
        return parseFloat(this.style.width) || 1;
      },
    },
  });

  (window.SVGElement.prototype as SVGElement & { getBBox: () => DOMRect }).getBBox = () =>
    ({ x: 0, y: 0, width: 0, height: 0 }) as DOMRect;
}
