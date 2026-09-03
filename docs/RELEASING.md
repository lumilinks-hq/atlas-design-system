# 公開とリリース

## 保存済みRunを更新する

新しい`PAIR_ID`でBaseline、Harness、Harness修正版を作成し、評価、比較、画像生成まで行う。比較条件は`MVP.md`に従い、生成コードを人が直接修正しない。

```bash
pnpm experiment:run --pair "$PAIR_ID" --mode baseline
pnpm experiment:run --pair "$PAIR_ID" --mode harness
pnpm experiment:evaluate --pair "$PAIR_ID" --mode baseline
pnpm experiment:evaluate --pair "$PAIR_ID" --mode harness
pnpm experiment:run --pair "$PAIR_ID" --mode harness-corrected
pnpm experiment:evaluate --pair "$PAIR_ID" --mode harness-corrected
pnpm experiment:compare --pair "$PAIR_ID"
pnpm experiment:capture --pair "$PAIR_ID"
pnpm runs:sanitize --pair "$PAIR_ID"
```

生成結果の比較（`src/data/runs.ts`）とPlayが参照するRunを更新し、数値、画像、環境情報が`run.json`と一致することを確認する。

## 公開候補を検証する

```bash
pnpm install --frozen-lockfile
pnpm demo:check
pnpm test:e2e
```

続いて[`PUBLICATION_POLICY.md`](./PUBLICATION_POLICY.md)と[`PRESENTATION_CHECKLIST.md`](./PRESENTATION_CHECKLIST.md)を確認する。GitHub Releaseを作る前に、プロジェクトのversion、commit、公開サイトが同じ成果物を参照していることを確認する。

## サイトを公開する

公開先はCloudflare Workers（<https://atlas-design-system.kuusai1998.workers.dev>）。デプロイは`.github/workflows/ci.yml`の`deploy`ジョブが自動で行うため、手で叩く必要はない。

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
