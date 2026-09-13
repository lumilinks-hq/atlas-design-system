# Atlas Design System

本プロジェクト（Atlas）は、[デザインハーネス](https://design-harness.com/)（Design Harness）に基づいて設計・検証を行うためのデモ用デザインシステムです。同一のB2B業務画面（顧客管理）を対象に、「設計契約なし（Baseline）」と「Atlasの設計契約を参照（Harness）」の2つの条件でAIに画面を実装させ、その品質の差やフィードバックループによる修正過程を比較・検証します。UIコンポーネント基盤には [HeroUI](https://www.heroui.com/) を採用しています。

公開サイト: <https://demo-ds.design-harness.com/>

| 名前 | 責務 |
| --- | --- |
| Design Harness | 設計データを機械可読にして、AI の生成、自動検証、人のレビューを同じ基準でつなぐ仕組み |
| Atlas | Design Harness に基づいて作ったデモ用デザインシステム。トークン、コンポーネントの採用範囲、パターン、検証ルールを定める |
| HeroUI | Atlas が採用する UI コンポーネントライブラリ。部品の実装を持ち、Atlas はどの部品をどう使うかを決める |

公開サイトの比較ページは保存済みの Run を表示するもので、閲覧時に AI が画面を再生成することはありません。画面や実験に登場する会社名、担当者、請求データはすべて架空です。自動検証と AI レビューの通過は、書かれたルールに反していないことを示すだけで、画面の完成を承認するものではありません。

リポジトリに保存済みの実験データ `create-01`（Claude Opus 5）では、全28ルールの検証において、Baselineが `12 pass / 11 fail / 5 review` であったのに対し、Atlasを参照したHarness初回生成では `21 pass / 2 fail / 5 review` となりました。さらに、Harness側へ機械判定の検査結果をフィードバックして修正させたところ、`23 pass / 0 fail / 5 review` まで改善しました（修正プロンプトには、機械判定によるエラー2件に加え、現時点でルール化されていない「閉じるボタンの英語読み上げ名（aria-label）」に関する人間からの指摘1件を含めています）。
本プロジェクトが提示したい本質は、初回生成の一発勝負における勝敗ではなく、「設計契約の情報を機械的な判定と自動修正ループへ確実に接続できるかどうか」です。

## ローカルでの起動・確認

実行環境には Node.js 24 と pnpm 11.13.1 を使用します（`.node-version` および `packageManager` でバージョンを固定しています）。

```bash
pnpm install --frozen-lockfile
pnpm dev
```

| URL | 内容 |
| --- | --- |
| `/` | デザインシステムの概要と設計指針 |
| `/getting-started` | プロジェクトへの導入手順（GitHub / Skill / MCP） |
| `/harness` | Design Harnessの仕組み・設計思想 |
| `/examples/account-management/results` | Baseline と Harness の生成結果・ルール別検証結果の比較 |
| `/play/account-management?mode=atlas` | 生成された顧客管理画面のインタラクティブな動作確認 |

保存済みRunの生成コードは、独立したポートでそのまま起動して確認できます。各画面の状態は、URLの `state` クエリパラメータ（`default`, `empty`, `create-open`, `drawer-open`, `invalid-email`, `loading`, `success`, `failure`, `delete-confirm`）によって再現可能です。

```bash
pnpm experiment:preview --pair create-01 --mode harness-corrected --port 4183
pnpm experiment:preview --pair create-01 --mode harness --port 4182
pnpm experiment:preview --pair create-01 --mode baseline --port 4181
```

## 正本（Source of Truth）

| パス | 内容 |
| --- | --- |
| [`DESIGN.md`](./DESIGN.md) | AIエージェントが最初に読み込む全体的な設計方針 |
| [`design/patterns/`](./design/patterns) | ページ構造・余白・視覚的グルーピング・レスポンシブ（モバイル）に関する設計契約 |
| [`design/examples/account-management.json`](./design/examples/account-management.json) | 顧客管理画面のコンポーネント構成、状態遷移、業務制約の定義 |
| [`design/`](./design) | デザイントークン、HeroUIコンポーネント契約、検証ルール、JSON Schema定義 |
| [`experiments/account-management/`](./experiments/account-management) | 実験の前提指示（Brief）、共通スターターコード、保存済みRunデータ |
| [`MVP.md`](./MVP.md) / [`TASKS.md`](./TASKS.md) | デモの仕様と受け入れ条件、実装タスク一覧 |
| [`docs/EXTENDING.md`](./docs/EXTENDING.md) | トークン・コンポーネント契約・ルール・Example を追加する手順 |

## AIエージェントからの利用

| 手段 | 場所 | 役割 |
| --- | --- | --- |
| Atlas Skill | [`skills/atlas-design-system/`](./skills/atlas-design-system/) | Issueを起点にAtlasの設計契約に従って画面を実装し、検証結果をフィードバックして修正するSkill。設計データは複製せずmanifestから動的に解決します。 |
| HeroUI Skill | [`skills/heroui-react/`](./skills/heroui-react/) | HeroUI v3 公式のAgent Skill。取得元とコミットハッシュは `skills/skills.lock.json` で固定管理されています。 |
| UI Writing Skill | [`skills/ui-writing/`](./skills/ui-writing/) | 日本語UIテキストの品質基準・表記ゆれチェックルール |
| Atlas MCP | [`docs/MCP.md`](./docs/MCP.md) | `pnpm mcp:start` で起動するstdioサーバー。CodexやClaude Codeから設計情報へアクセスするための接続手順を提供します。 |

```bash
node scripts/resolve-design-contract.mjs experiments/account-management/manifest.json
pnpm skills:check
```

## 比較実験の再実行

実験の比較を再実行するには、認証済みのAIエージェントCLI（既定は `codex`、`--runner claude` でClaude Codeに切り替え可能）が必要です。詳しい実行手順や実行順に関する留意点は [`docs/EXPERIMENTS.md`](./docs/EXPERIMENTS.md) にまとめています。
なお、AIが生成したコードに対して人間が直接手動で修正を加えることはせず、検査フィードバックを与えてAI自身に修正させた結果を `harness-corrected` として別Runに保存・記録します。

## 検証

```bash
pnpm demo:check   # 設計データ、テーマ、保存Run、公開データ、型、Lint、テスト、Buildを一括検証
pnpm test:e2e     # 実ブラウザで主要ルートと1440px/390pxの表示を確認
```

※ 自動検査で `review` と判定された項目は、自動で合否を決定せず、実際の画面レンダリング結果を確認して人間が判断します。

## 公開時の注意

保存された実験Runには、プロンプト、イベントログ、生成ソースコード、検証ログが含まれます。機密保護のため、保存時にローカルパスやユーザー名、秘密情報とみなされる文字列を自動マスクし、さらに `pnpm public:audit` で安全性を再検査しています。
公開に関する基準や詳細な手順については、[`docs/PUBLICATION_POLICY.md`](./docs/PUBLICATION_POLICY.md)、[`docs/RELEASING.md`](./docs/RELEASING.md)、[`docs/PRESENTATION_CHECKLIST.md`](./docs/PRESENTATION_CHECKLIST.md) をご参照ください。サードパーティライセンス表示は [`THIRD_PARTY_NOTICES.md`](./THIRD_PARTY_NOTICES.md) に記載されています。

## ライセンスと利用条件

コードと `design/` 配下の設計契約は MIT License（[`LICENSE`](./LICENSE)）です。

`experiments/` と `public/` 配下の保存済み Run（プロンプト、イベントログ、生成ソースコード、検証ログ、スクリーンショット）は AI エージェントの生成物で、比較実験の参考資料として公開しています。品質や権利関係を保証するものではないので、再利用するときは内容を確認したうえで自己責任で扱ってください。公開の範囲と基準は [`docs/PUBLICATION_POLICY.md`](./docs/PUBLICATION_POLICY.md) にあります。

## コントリビューション

外部からの Issue と Pull Request はどちらも受け付けていません。不具合報告や質問の窓口も設けていません。

## バージョンとリリース

| 対象 | 管理場所 | 規則 |
| --- | --- | --- |
| アプリケーション | `package.json` の `version` | SemVer |
| 設計契約（`design/`） | [`CHANGELOG.md`](./CHANGELOG.md) | 契約独自の version を別管理 |

GitHub Release の手順は [`docs/RELEASING.md`](./docs/RELEASING.md) を参照してください。
