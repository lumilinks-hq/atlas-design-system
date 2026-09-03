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
