import { Input, Label, TextField } from "@heroui/react";
import { Link, useSearchParams } from "react-router-dom";
import { searchDocs } from "../data/search";

export function SearchPage() {
  const [params, setParams] = useSearchParams();
  const query = params.get("q") ?? "";
  const hits = searchDocs(query);

  return (
    <article className="doc-page">
      <header className="page-header">
        <h1>検索</h1>
        <p className="page-description">ページ・トークン・コンポーネント・ルールを横断して検索します。スペース区切りで絞り込めます。</p>
      </header>
      <TextField
        name="q"
        value={query}
        onChange={(value) => setParams(value ? { q: value } : {}, { replace: true })}
      >
        <Label>検索語</Label>
        <Input placeholder="例: button" />
      </TextField>
      {query.trim() === "" ? null : hits.length === 0 ? (
        <p className="search-empty">一致する項目はありません。</p>
      ) : (
        <table className="search-table">
          <thead>
            <tr><th>種類</th><th>名前</th><th>説明</th></tr>
          </thead>
          <tbody>
            {hits.map((hit) => (
              <tr key={hit.href}>
                <td>{hit.kind}</td>
                <td><Link to={hit.href}>{hit.title}</Link></td>
                <td>{hit.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </article>
  );
}
