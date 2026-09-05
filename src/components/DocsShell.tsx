import { Button } from "@heroui/react";
import { Menu, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";

const navigation = [
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
      { label: "生成結果の比較", to: "/examples/account-management/results" },
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
      "/rules": "検証ルール — Atlas Design System",
    };
    document.title = titles[location.pathname] ?? "Atlas Design System";
    if (previousPathRef.current !== location.pathname) {
      mainRef.current?.focus({ preventScroll: true });
      previousPathRef.current = location.pathname;
    }
  }, [location.pathname]);

  // BrowserRouter はハッシュ付きリンクで自動スクロールしないので、遷移後に該当見出しへ寄せる
  useEffect(() => {
    const target = location.hash ? document.getElementById(location.hash.slice(1)) : null;
    target?.scrollIntoView({ block: "start" });
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
                  className={({ isActive }) => (isActive ? "nav-item nav-item-active" : "nav-item")}
                  end={item.to === "/"}
                  key={item.to}
                  onClick={() => setMenuOpen(false)}
                  to={item.to}
                >
                  {item.label}
                </NavLink>
              ))}
            </div>
          ))}
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
      </main>
    </div>
  );
}
