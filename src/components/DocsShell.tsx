import { Button } from "@heroui/react";
import { ExternalLink, Menu, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { buildInfo } from "../data/buildInfo";
import { repositoryUrl } from "../data/repository";

/** alsoActiveOn: そのパスでも同じ項目を選択中として扱う。比較ページは題材を切り替えても1項目のまま */
type NavItem = { label: string; to: string; alsoActiveOn?: string[] };

const navigation: Array<{ label: string; items: NavItem[] }> = [
  {
    label: "はじめに",
    items: [
      { label: "概要", to: "/" },
      { label: "デザインハーネス", to: "/harness" },
      { label: "導入方法", to: "/getting-started" },
      { label: "技術仕様", to: "/technical-specifications" },
    ],
  },
  {
    label: "設計の基礎",
    items: [
      { label: "デザイントークン", to: "/foundations" },
      { label: "コンポーネント", to: "/components" },
      { label: "検証ルール", to: "/rules" },
      { label: "検索", to: "/search" },
    ],
  },
  {
    label: "デザインパターン",
    items: [
      { label: "ページレイアウト", to: "/patterns/page-layout" },
      { label: "余白の取り方", to: "/patterns/spacing-layout" },
      { label: "視覚的グルーピング", to: "/patterns/visual-grouping" },
      { label: "モバイルレイアウト", to: "/patterns/mobile-layout" },
    ],
  },
  {
    label: "サンプル",
    items: [
      { label: "例：顧客管理", to: "/examples/account-management" },
      { label: "例：請求書管理", to: "/examples/invoice-management" },
      {
        label: "生成結果の比較",
        to: "/examples/account-management/results",
        alsoActiveOn: ["/examples/invoice-management/results"],
      },
    ],
  },
];

export function DocsShell() {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const mainRef = useRef<HTMLElement>(null);
  const previousPathRef = useRef(location.pathname);

  useEffect(() => {
    if (!menuOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [menuOpen]);

  useEffect(() => {
    const titles: Record<string, string> = {
      "/": "Atlas Design System",
      "/harness": "デザインハーネス — Atlas Design System",
      "/getting-started": "導入方法 — Atlas Design System",
      "/technical-specifications": "技術仕様 — Atlas Design System",
      "/foundations": "デザイントークン — Atlas Design System",
      "/components": "コンポーネント — Atlas Design System",
      "/patterns/page-layout": "ページレイアウト — Atlas Design System",
      "/patterns/spacing-layout": "余白の取り方 — Atlas Design System",
      "/patterns/visual-grouping": "視覚的グルーピング — Atlas Design System",
      "/patterns/mobile-layout": "モバイルレイアウト — Atlas Design System",
      "/examples/account-management": "例：顧客管理 — Atlas Design System",
      "/examples/account-management/results": "生成結果の比較 — Atlas Design System",
      "/examples/invoice-management": "例：請求書管理 — Atlas Design System",
      "/examples/invoice-management/results": "生成結果の比較 — Atlas Design System",
      "/rules": "検証ルール — Atlas Design System",
      "/search": "検索 — Atlas Design System",
    };
    document.title = titles[location.pathname] ?? "Atlas Design System";
    let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.rel = "canonical";
      document.head.appendChild(canonical);
    }
    canonical.href = `https://demo-ds.design-harness.com${location.pathname === "/" ? "/" : location.pathname}`;
    if (previousPathRef.current !== location.pathname) {
      mainRef.current?.focus({ preventScroll: true });
      previousPathRef.current = location.pathname;
    }
  }, [location.pathname]);

  // BrowserRouter は遷移時にスクロール位置を変えないので、ハッシュ付きなら該当見出しへ、無ければ先頭へ寄せる
  useEffect(() => {
    const target = location.hash ? document.getElementById(location.hash.slice(1)) : null;
    if (target) {
      target.scrollIntoView({ block: "start" });
      return;
    }
    window.scrollTo(0, 0);
  }, [location.pathname, location.hash]);

  return (
    <div className="docs-layout">
      <a className="skip-link" href="#main-content">本文へ移動</a>
      <header className="mobile-header">
        <NavLink className="brand" end to="/">Atlas Design System</NavLink>
        <Button
          aria-label={menuOpen ? "メニューを閉じる" : "メニューを開く"}
          aria-controls="docs-sidebar"
          aria-expanded={menuOpen}
          isIconOnly
          size="sm"
          variant="ghost"
          onPress={() => setMenuOpen((open) => !open)}
        >
          {menuOpen ? <X size={18} /> : <Menu size={18} />}
        </Button>
      </header>

      <aside className={menuOpen ? "sidebar sidebar-open" : "sidebar"} aria-label="ドキュメントナビゲーション" id="docs-sidebar">
        <div className="sidebar-top">
          <NavLink className="brand sidebar-brand" end to="/" onClick={() => setMenuOpen(false)}>
            <span>Atlas Design System</span>
          </NavLink>
        </div>
        <nav className="sidebar-nav">
          {navigation.map((group) => (
            <div className="nav-group" key={group.label}>
              <p className="nav-label">{group.label}</p>
              {group.items.map((item) => (
                <NavLink
                  className={({ isActive }) =>
                    isActive || item.alsoActiveOn?.includes(location.pathname) ? "nav-item nav-item-active" : "nav-item"
                  }
                  end
                  key={item.to}
                  onClick={() => setMenuOpen(false)}
                  to={item.to}
                >
                  {item.label}
                </NavLink>
              ))}
            </div>
          ))}
          <div className="nav-group nav-group-external">
            <a className="nav-item nav-item-external" href={repositoryUrl} rel="noreferrer" target="_blank">
              GitHub
              <ExternalLink size={14} aria-hidden="true" />
            </a>
          </div>
        </nav>
      </aside>

      {menuOpen && (
        <Button
          aria-label="メニューを閉じる"
          className="sidebar-scrim"
          isIconOnly
          variant="ghost"
          onPress={() => setMenuOpen(false)}
        />
      )}

      <main className="docs-main" id="main-content" ref={mainRef} tabIndex={-1}>
        <Outlet />
        <footer className="docs-footer">
          <p>© 2026 Lumilinks inc.</p>
          <p className="docs-build">
            v{buildInfo.version} ·{" "}
            <a href={`${repositoryUrl}/commit/${buildInfo.commit}`} rel="noreferrer" target="_blank">{buildInfo.commit}</a>
            {" "}· {buildInfo.builtAt.slice(0, 10)}
          </p>
        </footer>
      </main>
    </div>
  );
}
