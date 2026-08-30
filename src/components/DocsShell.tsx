import { Button, Separator } from "@heroui/react";
import { Menu, Play, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";

const navigation = [
  {
    label: "はじめに",
    items: [
      { label: "概要", to: "/" },
      { label: "導入方法", to: "/getting-started" },
      { label: "技術仕様", to: "/technical-specifications" },
    ],
  },
  {
    label: "設計の基礎",
    items: [
      { label: "基礎", to: "/foundations" },
      { label: "コンポーネント", to: "/components" },
      { label: "検証ルール", to: "/rules" },
    ],
  },
  {
    label: "デザインパターン",
    items: [
      { label: "ページレイアウト", to: "/patterns/page-layout" },
      { label: "余白の取り方", to: "/patterns/spacing-layout" },
    ],
  },
  {
    label: "利用例",
    items: [{ label: "顧客企業管理", to: "/examples/account-management" }],
  },
];

export function DocsShell() {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const mainRef = useRef<HTMLElement>(null);
  const previousPathRef = useRef(location.pathname);
  const navigate = useNavigate();

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
      "/getting-started": "導入方法 — Atlas Design System",
      "/technical-specifications": "技術仕様 — Atlas Design System",
      "/foundations": "基礎 — Atlas Design System",
      "/components": "コンポーネント — Atlas Design System",
      "/patterns/page-layout": "ページレイアウト — Atlas Design System",
      "/patterns/spacing-layout": "余白の取り方 — Atlas Design System",
      "/examples/account-management": "顧客企業の契約・利用状況管理 — Atlas Design System",
      "/rules": "検証ルール — Atlas Design System",
    };
    document.title = titles[location.pathname] ?? "Atlas Design System";
    if (previousPathRef.current !== location.pathname) {
      mainRef.current?.focus({ preventScroll: true });
      previousPathRef.current = location.pathname;
    }
  }, [location.pathname]);

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
        <div className="sidebar-footer">
          <Separator />
          <Button fullWidth size="sm" variant="secondary" onPress={() => navigate("/demo/runs/account-management")}>
            <Play size={15} /> 登壇デモを見る
          </Button>
        </div>
      </aside>

      {menuOpen && <button className="sidebar-scrim" aria-label="メニューを閉じる" onClick={() => setMenuOpen(false)} />}

      <main className="docs-main" id="main-content" ref={mainRef} tabIndex={-1}>
        <Outlet />
      </main>
    </div>
  );
}
