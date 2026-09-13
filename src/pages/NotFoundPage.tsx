import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";

const links = [
  { label: "トップへ戻る", to: "/" },
  { label: "はじめに", to: "/getting-started" },
  { label: "コンポーネント", to: "/components" },
  { label: "デザインルール", to: "/rules" },
  { label: "検索", to: "/search" },
];

export function NotFoundPage() {
  const { pathname } = useLocation();

  useEffect(() => {
    const meta = document.createElement("meta");
    meta.name = "robots";
    meta.content = "noindex";
    document.head.appendChild(meta);
    return () => {
      meta.remove();
    };
  }, []);

  return (
    <article className="doc-page">
      <header className="page-header">
        <h1>ページが見つかりません</h1>
        <p className="page-description">次のパスに対応するページはありません。</p>
      </header>
      <p><code>{pathname}</code></p>
      <ul className="not-found-links">
        {links.map((link) => (
          <li key={link.to}><Link to={link.to}>{link.label}</Link></li>
        ))}
      </ul>
    </article>
  );
}
