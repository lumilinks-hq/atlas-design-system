# 公開とリリース

## 保存済みRunを更新する

新しい`PAIR_ID`でBaseline、Harness、Harness修正版を作成し、計測、評価、レビュー、比較、画像生成、サニタイズまで行う。コマンドと実行順の注意は[`EXPERIMENTS.md`](./EXPERIMENTS.md)に従い、生成コードを人が直接修正しない。

生成結果の比較（`src/data/runs.ts`）とPlayが参照するRunを更新し、数値、画像、環境情報が`run.json`と一致することを確認する。

## 公開候補を検証する

```bash
pnpm install --frozen-lockfile
pnpm demo:check
pnpm test:e2e
```

続いて[`PUBLICATION_POLICY.md`](./PUBLICATION_POLICY.md)と[`PRESENTATION_CHECKLIST.md`](./PRESENTATION_CHECKLIST.md)を確認する。GitHub Releaseを作る前に、プロジェクトのversion、commit、公開サイトが同じ成果物を参照していることを確認する。

## サイトを公開する

公開先はCloudflare Workers（<https://demo-ds.design-harness.com/>）。デプロイは`.github/workflows/ci.yml`の`deploy`ジョブが自動で行うため、手で叩く必要はない。

| きっかけ | 動作 |
| --- | --- |
| PRを開く、更新する | `wrangler versions upload --preview-alias pr-<番号>`でプレビュー版をアップロードし、`https://pr-<番号>-atlas-design-system.kuusai1998.workers.dev`をPRへコメントする。本番は変わらない |
| mainへpush（PRのマージ） | `wrangler deploy`で本番へ反映する |

`deploy`は`needs: verify`なので、`demo:check`と`test:e2e`が通らないとデプロイされない。GitHub Secretsの`CLOUDFLARE_API_TOKEN`と`CLOUDFLARE_ACCOUNT_ID`を使う。どちらかが未設定のとき、およびforkからのPRでは、デプロイ関連のステップをすべてskipする。リポジトリがpublicなのでaccount IDは`wrangler.jsonc`に書かない。

CIが使えないときのフォールバックとして手動デプロイを残してある。ローカルの`wrangler`ログインが必要。

```bash
pnpm run site:deploy   # build + wrangler deploy（本番へ即反映）
pnpm run site:preview  # wrangler devでローカル確認
```

配信設定は`wrangler.jsonc`にある。`not_found_handling: "single-page-application"`は`/harness`などのルートにindex.htmlを返すため、`html_handling: "none"`は`/play-atlas.html`が末尾スラッシュへリダイレクトされるのを防ぐため。どちらも外すとサイトが壊れる。

## GitHub Release を作る

### バージョン決定の方針

- `package.json` の `version` は SemVer に従う。初回のリリースは `1.0.0`
- 破壊的変更（公開 URL や保存 Run の形式が変わる）は major、機能追加は minor、修正だけなら patch
- `design/` 契約の version は [`CHANGELOG.md`](../CHANGELOG.md) の規則で別に上げる。アプリの version と一致させる必要はない

### Release note の書き方

冒頭にアプリの version と契約の version を併記する。その下は `--generate-notes` が作る PR 一覧をそのまま使う。

```markdown
- package.json version: 1.0.0
- design/ 契約 version: 1.0.0（CHANGELOG.md）
```

### 手順

1. PR で `package.json` の `version` を上げ、必要なら `CHANGELOG.md` も更新して main にマージする
2. main で tag を打ち、Release を作る

```bash
git switch main && git pull
gh release create vX.Y.Z --generate-notes --title "vX.Y.Z"
```

生成された note の先頭に上の version 併記を追記する。`gh release edit vX.Y.Z --notes-file <file>` で差し替えられる。

### main の保護

- main への直接 push は branch 保護で禁止する。変更はすべて PR 経由
- PR は CI の `verify` Check（`demo:check` と `test:e2e`）の通過が必須。GitHub の Branch protection で `verify` を required status check に設定する
