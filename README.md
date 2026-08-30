# Atlas Design System Demo

Atlasは、Design Harnessを用いて設計・検証するデモ用デザインシステムです。同じB2B画面を、設計契約なしのBaselineと、Atlasを参照する条件でAIに実装させ、その差と修正過程を確認できます。UI基盤には[HeroUI](https://www.heroui.com/)、公開サイトの書体には[Gen Interface JP](https://gen.typesetting.jp/)を使っています。

公開サイトはデザインシステムの参照資料、Presenter modeはカンファレンスやウェビナーで使う保存済みRunの再生画面です。閲覧時にAIやAPIキーは使いません。

## 現在のシナリオ

「顧客企業の契約・利用状況管理」を実装します。Brief、スターター、モデル、HeroUIのバージョンを揃え、プロジェクト固有の設計契約を渡すかどうかだけを変えています。ページ構造は再利用可能な`Page layout`パターン、機能固有の構成と状態は実装例として分離しています。

保存済みの`mvp-05`では、BaselineとHarnessの初回実装はいずれも自動設計検査が`9 pass / 4 fail / 3 review`でした。Harness側へ検査結果を返して修正すると、`13 pass / 0 fail / 3 review`になりました。このデモが見せるのは初回生成の勝敗ではなく、設計情報を機械判定と修正へ接続できるかどうかです。

## ローカルで見る

Node.js 24とpnpm 11を使います。

```bash
pnpm install
pnpm dev
```

- デザインシステム: `http://localhost:4173/`
- 導入方法: `http://localhost:4173/getting-started`
- 生成画面の操作: `http://localhost:4173/play/account-management?mode=atlas`
- Presenter mode: `http://localhost:4173/demo/runs/account-management`

Presenter modeは、Issue、設計の適用、生成と検査、結果比較の4場面です。画面下の操作か左右キーで進め、`R`で初期状態へ戻せます。結果画面から、BaselineとAtlas適用後の生成画面を開けます。

## 生成された実装を別ポートで試す

保存済みRunは、公開リポジトリの生成ソースからそのまま起動できます。

```bash
# Atlas適用・補正後
pnpm experiment:preview --pair mvp-05 --mode harness-corrected --port 4182

# Issueだけを渡したBaseline
pnpm experiment:preview --pair mvp-05 --mode baseline --port 4181
```

- Atlas適用・補正後: `http://localhost:4182/`
- Baseline: `http://localhost:4181/`

画面上部の状態名から、Drawer、入力エラー、権限不足、保存中、成功、失敗を切り替えられます。

## UIテキストを確認する

日本語のUIテキスト、CTA、説明文、エラーメッセージは、[`skills/smarthr-ui-writing/`](./skills/smarthr-ui-writing/)の手順で確認します。このSkillはSmartHR Design Systemの公開ガイドを参考にしていますが、SmartHR固有の用語はAtlasへ持ち込みません。

## Atlas Skillを使う

[`skills/atlas-design-system/`](./skills/atlas-design-system/)は、IssueからAtlasに従うReact・HeroUI画面を実装し、検証結果を次の修正へ戻すためのSkillです。設計データはSkill内へ複製せず、manifestから必要なファイルを解決します。

```bash
node scripts/resolve-design-contract.mjs experiments/account-management/manifest.json
pnpm skills:check
```

## Atlas MCPを使う

MCPはローカルstdioサーバーとして起動します。`atlas://design/`以下の固定resourceと、Pattern・Example IDを必要最小限のresourceへ解決する`resolve_design_contract`を提供します。任意ファイルの読み込み、書き込み、コマンド実行は行いません。

```bash
pnpm mcp:start
```

MCPクライアントの設定では、コマンドを`pnpm`、引数を`mcp:start`、作業ディレクトリをこのリポジトリのルートに指定します。

## 正本

- [`DESIGN.md`](./DESIGN.md): AIが最初に読む設計方針
- [`design/patterns/page-layout.json`](./design/patterns/page-layout.json): 画面名に依存しないページ構造
- [`design/examples/account-management.json`](./design/examples/account-management.json): 顧客企業管理で使う構成、状態、業務制約
- [`design/`](./design): token、HeroUIコンポーネント契約、検証ルール、JSON Schema
- [`experiments/account-management/`](./experiments/account-management): Brief、共通スターター、保存済みRun
- [`MVP.md`](./MVP.md): デモの仕様と受け入れ条件
- [`TASKS.md`](./TASKS.md): 公開までを含む実装タスク

## 比較を再実行する

再実行には認証済みのCodex CLIが必要です。`PAIR_ID`は新しい値へ変えてください。生成先の`.runs/`は隔離された作業ディレクトリで、公開対象には含まれません。

Harness実行ではmanifestから`HARNESS.json`を生成します。AIは`DESIGN.md`を入口に、`pattern.page-layout#single-one-column`、`example.account-management`、関連するHeroUIコンポーネントと検証ルールをIDで解決します。Baselineにはこの参照情報を渡しません。

```bash
pnpm experiment:run --pair "$PAIR_ID" --mode baseline
pnpm experiment:run --pair "$PAIR_ID" --mode harness

pnpm experiment:evaluate --pair "$PAIR_ID" --mode baseline
pnpm experiment:evaluate --pair "$PAIR_ID" --mode harness

pnpm experiment:run --pair "$PAIR_ID" --mode harness-corrected
pnpm experiment:evaluate --pair "$PAIR_ID" --mode harness-corrected

pnpm experiment:compare --pair "$PAIR_ID"
pnpm experiment:capture --pair "$PAIR_ID"
```

生成コードを人が直接直すと比較条件が崩れます。修正は`VALIDATION.md`を入力にした`harness-corrected`として別Runへ保存します。

公開前の確認で新しい設計違反が見つかった場合は、設計契約と検査を更新してから`pnpm experiment:refine --pair "$PAIR_ID"`を実行します。これも人が生成コードを直接編集せず、追加の修正イベントとして保存します。

## 検証

```bash
pnpm demo:check
```

このコマンドで、設計データ、保存Run、TypeScript、Lint、テスト、Buildをまとめて検証します。`review`とされた項目は自動合否にせず、画面を見て人が判断します。

## 公開時の注意

保存Runにはプロンプト、イベントログ、差分、生成ソース、検証ログが含まれます。Run保存時にローカルパス、秘密情報らしい文字列、端末内のエージェント指示をマスクしますが、公開前の確認は別途必要です。既存Runには`pnpm runs:sanitize --pair <PAIR_ID>`を適用できます。リポジトリのライセンスは公開前に明示的に選択します。
