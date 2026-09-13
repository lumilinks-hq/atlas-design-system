# 設計契約の拡張手順

`design/` 配下の契約を増やす・変えるときの手順。各節の末尾に確認コマンドを置く。契約の版は [`CHANGELOG.md`](../CHANGELOG.md) の規則で上げる。

## 共通の前提

- 契約の正本は `design/` 配下の JSON。`src/generated/theme.css`、`design/theme.css`、`design/components-api.md` は生成物なので手で書かない
- schema は `design/schemas/*.schema.json`。`pnpm design:check`（`scripts/validate-design.mjs`）が schema と参照整合を検証する
- MCP のリソースは `scripts/design-catalog.mjs` が `design/components`、`design/patterns`、`design/examples` の JSON から自動生成する。サーバー側の追記は不要
- Skill（`skills/atlas-design-system/SKILL.md`）は契約をコピーしていない。契約を変えても Skill の更新は原則不要

## トークンを追加・変更する

1. `design/tokens.json` を編集する
   - `color`、`space`、`type` はキーを自由に増やせる
   - `radius`（base / pill / circle）、`shadow`（none / raised / dragging / overlay / floating）、`content`、`breakpoint` はキーが固定。増やすなら `design/schemas/tokens.schema.json` も直す
   - `breakpoint.narrow` を変えたら `design/layout.css` の `@media (max-width: ...)` を `narrow − 1px` に合わせる（`design:check` が照合する）
2. `pnpm theme:generate` で `src/generated/theme.css` と `design/theme.css` を再生成する
3. トークンに依存するルール（`token.*`）や部品の `visual.radiusToken` が新しいキーを指すなら合わせて直す
4. `CHANGELOG.md` に契約の版と変更点を書く

確認コマンド

```bash
pnpm design:check
pnpm theme:check
pnpm vitest run scripts
```

## コンポーネント契約を追加する

1. `design/components/<slug>.json` を作る。`design/schemas/component.schema.json` の必須項目は `version`、`id`（`component.` で始まる）、`name`、`implementation`、`import`（`@heroui/react` 固定）、`variants`、`sizes`、`defaults`、`visual`、`requirements`、`relatedRules`
   - `defaults.variant` と `defaults.size` はそれぞれ `variants`、`sizes` に含める
   - `visual.radiusToken` は `radius.<name>` 形式で、`tokens.json` に存在するキーを指す
   - `relatedRules` は `design/rules.json` にある id だけを書く
   - `anatomy` を書く場合は `@heroui/react` の export 名を並べる
2. どこかの Pattern の `components` か Example の `components` から参照する。参照されない契約は `design:check` が孤立として弾く
3. `node scripts/build-components-api.mjs` で `design/components-api.md` を再生成する
4. `src/data/design.ts` に import を足し、末尾の `components: [...]` 配列に加える
5. lint の許可 import 一覧は契約から自動で組み立てられる（`buildAtlasLintOptions`）。plugin 側への追記は不要
6. `CHANGELOG.md` に契約の版（部品追加は minor）と変更点を書く

確認コマンド

```bash
pnpm design:check
pnpm vitest run scripts
pnpm typecheck
```

## ルールを追加する

1. `design/rules.json` に追記する。項目は `id`、`title`、`category`、`severity`（error / warning / info）、`method`、`description`、`fix` のみ
2. `method` によって実装先が決まる

| method | 実装先 | 備考 |
| --- | --- | --- |
| `lint` | `packages/eslint-plugin-atlas/src/rules/<name>.mjs` | `src/index.mjs` の `rules` と `ruleIdByPluginRule` の両方に登録する。`fix` の文中に `atlas/<name>` を含める（`rules-lint-bijection.test.mjs` が照合する） |
| `automatic` | `scripts/evaluate-experiment.mjs` | 保存 Run の計測値や生成コードから機械判定する |
| `ai-review` | 追記不要 | `scripts/review-experiment.mjs` が `method === "ai-review"` を自動で拾う |
| `human` | 追記不要 | 評価では `review` 扱いになる |

3. 関連する部品契約の `relatedRules`、Pattern や Example の `rules` に id を足す
4. lint ルールなら `packages/eslint-plugin-atlas/test/` にテストを足す
5. `README.md` のルール数と `CHANGELOG.md` の契約の版を更新する

確認コマンド

```bash
pnpm design:check
pnpm vitest run scripts
pnpm vitest run packages
pnpm design:conformance
```

`pnpm vitest run scripts` の `rules-method.test.mjs` が、保存済み Run の評価結果と `method` の整合を照合する。`automatic` ルールを足したのに評価が `review` のままなら実装漏れ。`design:conformance` は保存済み Run を契約で再評価する。

## Example を追加する

Example は題材（実験）と 1 対 1 で増やす。既存の `example.invoice-management` を写すのが早い。

1. `design/examples/<slug>.json` を作る。必須項目は `version`、`id`（`example.` で始まる）、`name`、`purpose`、`pattern`（既存の `pattern.*`）、`variant`（その Pattern の variant）、`composition`、`componentUsage`（`component.table`、`component.toolbar`、`component.link`、`component.alert-dialog` が必須）、`states`、`components`、`lint`、`evaluation`、`rules`
   - `evaluation` は MCP リソースと Harness へ渡す契約からは取り除かれる
2. `experiments/<slug>/manifest.json` を作り、`designRefs.examples` にこの id を書く（孤立チェックの参照元になる）。Harness 条件の `agentSkills` は既存の manifest に合わせる
3. `src/data/design.ts` に import を足し、`examplesBySlug` に加える
4. 画面を配線する
   - `src/App.tsx` に `/examples/<slug>` と `/examples/<slug>/results` のルート
   - `src/components/DocsShell.tsx` のナビゲーション
   - `src/data/runs.ts` の `ExperimentId` と Run 一覧
   - 短い名前を決めてリポジトリ直下に `play-<name>-atlas.html` と `play-<name>-baseline.html` を作り、`vite.config.ts` の `input` と `src/pages/PlayPage.tsx` に登録する（既存は `play-invoice-atlas` など）
   - `scripts/verify-site.mjs` の巡回対象
5. [`docs/EXPERIMENTS.md`](./EXPERIMENTS.md) の手順で `--experiment <slug>` を付けて Run を取り、`pnpm runs:sanitize --experiment <slug>` で保存する
6. `CHANGELOG.md` に契約の版と変更点を書く

確認コマンド

```bash
pnpm design:check
pnpm vitest run scripts
pnpm runs:check
pnpm demo:check
```

`docs-consistency.test.ts` が Example の import とルート配線を照合する。`demo:check` はビルドと e2e まで通す。
