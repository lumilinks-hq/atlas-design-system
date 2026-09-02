# Atlas Design System Demo

Atlasは、Design Harnessを用いて設計・検証するデモ用デザインシステムです。同じB2B画面を、設計契約なしのBaselineと、Atlasを参照する条件でAIに実装させ、その差と修正過程を確認できます。UI基盤には[HeroUI](https://www.heroui.com/)、公開サイトの書体には[Gen Interface JP](https://gen.typesetting.jp/)を使っています。

公開サイトはデザインシステムの参照資料、Presenter modeはカンファレンスやウェビナーで使う保存済みRunの再生画面です。閲覧時にAIやAPIキーは使いません。

## 現在のシナリオ

「顧客管理」を実装します。`/customers`の一覧から会社を選び、`/customers/:customerId`の詳細で基本情報と対応状況を確認・更新し、取引が終了した顧客を確認画面付きで削除できる業務機能です。一覧は`CustomerSummary`、詳細は`CustomerDetail`を使用します。Brief、スターター、モデル、HeroUIのバージョンを揃え、プロジェクト固有の設計契約を渡すかどうかだけを変えています。

保存済みの`mvp-11`では、28ルールの検査でBaselineが`7 pass / 16 fail / 5 review`、Harness初回が`19 pass / 4 fail / 5 review`でした。Harness側へ検査結果を返して修正すると、`23 pass / 0 fail / 5 review`になりました。検査には320px幅の横スクロールや余白の実測など、実ブラウザでの幾何計測を含みます。このデモが見せるのは初回生成の勝敗ではなく、設計情報を機械判定と修正へ接続できるかどうかです。

## ローカルで見る

Node.js 24とpnpm 11.13.1を使います。要求バージョンは`.node-version`、`package.json`、`packageManager`で固定しています。

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
pnpm experiment:preview --pair mvp-11 --mode harness-corrected --port 4182

# Issueだけを渡したBaseline
pnpm experiment:preview --pair mvp-11 --mode baseline --port 4181
```

- Atlas適用・補正後: `http://localhost:4182/`
- Baseline: `http://localhost:4181/`

必須状態はURLの`state` queryで再現できます。`default`、`empty`、`drawer-open`、`invalid-email`、`loading`、`success`、`failure`、`delete-confirm`を指定できます。通常画面にはデモ専用の状態切り替えUIを表示しません。

## UIテキストを確認する

日本語のUIテキスト、CTA、説明文、エラーメッセージは、[`skills/ui-writing/`](./skills/ui-writing/)の手順で確認します。特定製品の用語やブランド規則には依存せず、Atlasで合意した判断基準を適用します。

## HeroUI Skillを使う

[`skills/heroui-react/`](./skills/heroui-react/)には、HeroUI公式のAgent Skillを配置しています。HeroUI v3のコンポーネントAPI、compound component、標準スタイル、テーマ変数を確認するために使います。取得元、commit、ライセンスは[`skills/skills.lock.json`](./skills/skills.lock.json)で固定しています。

## Atlas Skillを使う

[`skills/atlas-design-system/`](./skills/atlas-design-system/)は、IssueからAtlasに従うReact・HeroUI画面を実装し、検証結果を次の修正へ戻すためのSkillです。HeroUIとして正しい実装は`heroui-react`、Atlasで許可する選択肢は設計契約、日本語UI文言は`ui-writing`が担当します。設計データはSkill内へ複製せず、manifestから必要なファイルを解決します。

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

CodexとClaude Codeでは、cloneしたディレクトリの絶対パスを指定して接続できます。

```bash
# Codex
codex mcp add atlas-design-system -- pnpm --dir /absolute/path/to/atlas-design-system-demo mcp:start
codex mcp get atlas-design-system

# Claude Code（プロジェクト単位）
claude mcp add --scope project atlas-design-system -- pnpm --dir /absolute/path/to/atlas-design-system-demo mcp:start
claude mcp get atlas-design-system
```

更新時はリポジトリで`git pull --ff-only`と`pnpm install --frozen-lockfile`を実行し、`pnpm exec vitest run scripts/mcp/server.test.mjs`で疎通を確認します。削除は`codex mcp remove atlas-design-system`または`claude mcp remove --scope project atlas-design-system`です。

## 正本

- [`DESIGN.md`](./DESIGN.md): AIが最初に読む設計方針
- [`design/patterns/page-layout.json`](./design/patterns/page-layout.json): 画面名に依存しないページ構造
- [`design/patterns/spacing-layout.json`](./design/patterns/spacing-layout.json): 余白とレイアウトの数値契約
- [`design/layout.css`](./design/layout.css): レイアウト実装部品の正本CSS
- [`design/examples/account-management.json`](./design/examples/account-management.json): 顧客管理で使う構成、状態、業務制約
- [`design/`](./design): token、HeroUIコンポーネント契約、検証ルール、JSON Schema
- [`experiments/account-management/`](./experiments/account-management): Brief、共通スターター、保存済みRun
- [`MVP.md`](./MVP.md): デモの仕様と受け入れ条件
- [`TASKS.md`](./TASKS.md): 公開までを含む実装タスク

## 比較を再実行する

再実行には認証済みのCodex CLIが必要です。`PAIR_ID`は新しい値へ変えてください。生成先の`.runs/`は隔離された作業ディレクトリで、公開対象には含まれません。

Harness実行ではmanifestから`HARNESS.json`と`HARNESS_RESOLVED.json`を生成し、指定したAgent Skillsを隔離workspaceの`.agents/skills/`へ配置します。AIは`DESIGN.md`を入口に、一覧用の`pattern.page-layout#collection-table`、詳細用の`pattern.page-layout#single-one-column`、`example.account-management`、関連するHeroUIコンポーネントと検証ルールをIDで解決します。Baselineには設計契約もAgent Skillsも渡しません。

```bash
pnpm experiment:run --pair "$PAIR_ID" --mode baseline
pnpm experiment:run --pair "$PAIR_ID" --mode harness

# 幾何計測（measurements.json）を先に取り、評価が実測値を参照できるようにする
pnpm experiment:measure --pair "$PAIR_ID"
pnpm experiment:evaluate --pair "$PAIR_ID" --mode baseline
pnpm experiment:evaluate --pair "$PAIR_ID" --mode harness

pnpm experiment:run --pair "$PAIR_ID" --mode harness-corrected
pnpm experiment:refine --pair "$PAIR_ID"

pnpm experiment:capture --pair "$PAIR_ID"
pnpm experiment:review --pair "$PAIR_ID"
pnpm experiment:compare --pair "$PAIR_ID"
```

`experiment:refine`は検査結果を入力に修正を依頼し、実測込みの再評価まで行います。`experiment:review`はスクリーンショットをAIレビューへ渡し、所見を`design-evaluation.json`の`review`欄へ保存します。`experiment:evaluate`は`review`欄を含めて評価ファイルを作り直すため、必ずreviewより前に実行し、review後に再実行しないでください。`experiment:compare`は最後に実行し、所見を`comparison.json`へ転記します。

生成コードを人が直接直すと比較条件が崩れます。修正は`VALIDATION.md`を入力にした`harness-corrected`として別Runへ保存します。公開前の確認で新しい設計違反が見つかった場合も、人が生成コードを編集せず`pnpm experiment:refine --pair "$PAIR_ID"`で追加の修正イベントとして保存します。

## 検証

```bash
pnpm demo:check
```

このコマンドで、設計データ、生成テーマとtokenの一致、保存Run、公開データ、TypeScript、Lint、テスト、Buildをまとめて検証します。`review`とされた項目は自動合否にせず、画面を見て人が判断します。

`pnpm design:conformance`は、Harness修正版のソースと保存済み評価結果が現在の設計契約（幾何計測の実測値を含む）とずれていないかを短時間で確認します。`pnpm theme:check`は`design/tokens.json`から生成されるテーマCSSが手編集などで乖離していないかを確認します。

実ブラウザで主要ルート、1280×720のPresenter、比較条件と状態のURL同期、Drawerの表示を確認する場合は`pnpm test:e2e`を実行します。Production build後のCSS・JavaScriptとオフライン用フォントの上限は`pnpm bundle:check`で確認できます。

## 公開時の注意

保存Runにはプロンプト、イベントログ、差分、生成ソース、検証ログが含まれます。Run保存時にローカルパス、秘密情報らしい文字列、端末内のエージェント指示をマスクし、`pnpm public:audit`で公開対象を再検査します。既存Runには`pnpm runs:sanitize --pair <PAIR_ID>`を適用できます。公開する成果物の基準は[`docs/PUBLICATION_POLICY.md`](./docs/PUBLICATION_POLICY.md)、登壇前の確認は[`docs/PRESENTATION_CHECKLIST.md`](./docs/PRESENTATION_CHECKLIST.md)、Run更新とリリース手順は[`docs/RELEASING.md`](./docs/RELEASING.md)にまとめています。第三者ライセンスは[`THIRD_PARTY_NOTICES.md`](./THIRD_PARTY_NOTICES.md)を参照してください。プロジェクト本体のライセンスは公開前に明示的に選択します。
