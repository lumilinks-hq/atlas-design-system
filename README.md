# Atlas Design System

[デザインハーネス](https://design-harness.com/)で設計・検証するデモ用デザインシステムです。同じB2B画面（顧客管理）を、設計契約なしのBaselineと、Atlasを参照する条件でAIに実装させ、その差と修正過程を比較します。UI基盤は[HeroUI](https://www.heroui.com/)です。

公開サイト: <https://atlas-design-system.kuusai1998.workers.dev>

保存済みの`lint-01`（Claude Opus 5）では、28ルールの検査でBaselineが`12 pass / 11 fail / 5 review`、Harnessが`23 pass / 0 fail / 5 review`でした。見せたいのは初回生成の勝敗ではなく、設計情報を機械判定と修正へ接続できるかどうかです。

## ローカルで見る

Node.js 24とpnpm 11.13.1を使います（`.node-version`、`packageManager`で固定）。

```bash
pnpm install
pnpm dev
```

| URL | 内容 |
| --- | --- |
| `/` | デザインシステム |
| `/getting-started` | 導入方法 |
| `/harness` | Design Harnessの仕組み |
| `/examples/account-management/results` | Baseline／Harnessの生成結果とルール別の検査結果 |
| `/play/account-management?mode=atlas` | 生成画面の操作 |

保存済みRunの生成ソースは別ポートでそのまま起動できます。状態はURLの`state` query（`default`、`empty`、`drawer-open`、`invalid-email`、`loading`、`success`、`failure`、`delete-confirm`）で再現します。

```bash
pnpm experiment:preview --pair lint-01 --mode harness --port 4182
pnpm experiment:preview --pair lint-01 --mode baseline --port 4181
```

## 正本

| パス | 内容 |
| --- | --- |
| [`DESIGN.md`](./DESIGN.md) | AIが最初に読む設計方針 |
| [`design/patterns/`](./design/patterns) | ページ構造、余白、視覚的グルーピング、モバイルの契約 |
| [`design/examples/account-management.json`](./design/examples/account-management.json) | 顧客管理の構成、状態、業務制約 |
| [`design/`](./design) | token、HeroUIコンポーネント契約、検証ルール、JSON Schema |
| [`experiments/account-management/`](./experiments/account-management) | Brief、共通スターター、保存済みRun |
| [`MVP.md`](./MVP.md) / [`TASKS.md`](./TASKS.md) | デモの仕様と受け入れ条件、実装タスク |

## AIから使う

| 手段 | 場所 | 役割 |
| --- | --- | --- |
| Atlas Skill | [`skills/atlas-design-system/`](./skills/atlas-design-system/) | IssueからAtlasに従う画面を実装し、検証結果を修正へ戻す。設計データは複製せずmanifestから解決 |
| HeroUI Skill | [`skills/heroui-react/`](./skills/heroui-react/) | HeroUI v3公式のAgent Skill。取得元とcommitは`skills/skills.lock.json`で固定 |
| UI Writing Skill | [`skills/ui-writing/`](./skills/ui-writing/) | 日本語UIテキストの確認基準 |
| Atlas MCP | [`docs/MCP.md`](./docs/MCP.md) | `pnpm mcp:start`で起動するstdioサーバー。CodexとClaude Codeの接続手順 |

```bash
node scripts/resolve-design-contract.mjs experiments/account-management/manifest.json
pnpm skills:check
```

## 比較を再実行する

認証済みのAIエージェントCLI（既定`codex`、`--runner claude`で切り替え）が必要です。手順と実行順の注意は[`docs/EXPERIMENTS.md`](./docs/EXPERIMENTS.md)にまとめています。生成コードは人が直接直さず、`harness-corrected`として別Runに保存します。

## 検証

```bash
pnpm demo:check   # 設計データ、テーマ、保存Run、公開データ、型、Lint、テスト、Buildを一括検証
pnpm test:e2e     # 実ブラウザで主要ルートと1440px/390pxの表示を確認
```

`review`とされた項目は自動合否にせず、画面を見て人が判断します。

## 公開時の注意

保存Runにはプロンプト、イベントログ、生成ソース、検証ログが含まれます。保存時にローカルパスやユーザー名、秘密情報らしい文字列をマスクし、`pnpm public:audit`で再検査します。基準と手順は[`docs/PUBLICATION_POLICY.md`](./docs/PUBLICATION_POLICY.md)、[`docs/RELEASING.md`](./docs/RELEASING.md)、[`docs/PRESENTATION_CHECKLIST.md`](./docs/PRESENTATION_CHECKLIST.md)を参照してください。第三者ライセンスは[`THIRD_PARTY_NOTICES.md`](./THIRD_PARTY_NOTICES.md)にあります。
