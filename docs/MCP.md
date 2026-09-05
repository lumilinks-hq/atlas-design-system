# Atlas MCPの接続

ローカルstdioサーバーとして起動します。`atlas://design/`以下の固定resourceと、Pattern・Example IDを必要最小限のresourceへ解決する`resolve_design_contract`を提供します。任意ファイルの読み書きやコマンド実行は行いません。

```bash
pnpm mcp:start
```

クライアント設定では、コマンド`pnpm`、引数`mcp:start`、作業ディレクトリをこのリポジトリのルートに指定します。

## Codex / Claude Code

cloneしたディレクトリの絶対パスを指定します。

```bash
# Codex
codex mcp add atlas-design-system -- pnpm --dir /absolute/path/to/atlas-design-system-demo mcp:start
codex mcp get atlas-design-system

# Claude Code（プロジェクト単位）
claude mcp add --scope project atlas-design-system -- pnpm --dir /absolute/path/to/atlas-design-system-demo mcp:start
claude mcp get atlas-design-system
```

## 更新と削除

```bash
git pull --ff-only
pnpm install --frozen-lockfile
pnpm exec vitest run scripts/mcp/server.test.mjs   # 疎通確認

codex mcp remove atlas-design-system
claude mcp remove --scope project atlas-design-system
```
