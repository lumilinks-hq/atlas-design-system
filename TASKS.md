# Atlas Design System 残作業

更新日: 2026-09-13

このファイルは公開済みサイトを「初回リリース」と呼べる状態へ持っていくための残作業を管理する。比較条件と受け入れ条件は[`MVP.md`](./MVP.md)、AIと人が参照する設計方針は[`DESIGN.md`](./DESIGN.md)、公開基準は[`docs/PUBLICATION_POLICY.md`](./docs/PUBLICATION_POLICY.md)を正本とする。

> 2026-09-03 に Presenter（`/demo/runs/account-management`）と Scene 再生を廃止し、Design Harness の説明（`/harness`）と生成結果の比較ページ（`/examples/*/results`）へ置き換えた。PdEConf 2026（2026-09-05）の登壇は終了済み。`MVP.md` に残る Presenter、Scene、1280×720 の記述は履歴として扱う。

## 目標と役割

Atlasを次の四つの用途で使える状態にする。

1. 人がデザインシステムの設計判断を読む。
2. 開発者がGitHubからcloneして比較実験を再現する。
3. AIエージェントがSkillまたはMCPを通して設計契約を参照する。
4. 生成・検査・修正・結果比較のサイクルを、保存済みRunだけで説明する。

公開サイト内では次の役割を混ぜない。

| 目的 | 遷移先 |
| --- | --- |
| Atlasを導入する | `/getting-started` |
| 仕組みを理解する | `/harness` |
| 生成結果を比較する | `/examples/account-management/results`、`/examples/invoice-management/results` |
| 生成結果を触る | `/play/account-management`、`/play/invoice-management` |
| 設計判断を読む | `/foundations`、`/components`、`/patterns/*`、`/rules` |

## 現在の状態

- 公開URL: https://demo-ds.design-harness.com/ （Cloudflare Workers、独自ドメイン、SPA fallback）
- リポジトリ: `github.com/lumilinks-hq/atlas-design-system`（public、default branch は `main`、LICENSE 未追加、branch保護なし、Releaseなし）
- CI: Pull Request と main への push で `pnpm demo:check` と `pnpm test:e2e` を実行し、main は本番へ自動デプロイ、PR は `pr-<番号>` のプレビューURLをコメントする
- 題材: 顧客管理（account-management）と請求書管理（invoice-management）の2つ
- 保存済みRun: account-management は `create-01`（比較ページの主軸、Claude Opus 5）、`fast-01`、`mvp-11`、`prelint-01`、`lint-01`。invoice-management は `invoice-01`。公開アセットに含まれるのは `create-01`、`fast-01`、`invoice-01` の3つ
- 設計契約: component 15件、pattern 2件、example 1件、rule 28件（`CHANGELOG.md` 1.0.0）。ESLint プラグイン `packages/eslint-plugin-atlas` で Lint 検査分を担う
- AI利用経路: Skill（`skills/atlas-design-system`）とローカル stdio MCP（`pnpm mcp:start`、契約テストあり）

## 完了した作業

詳細な子項目は git 履歴と各ドキュメントに残っているため、ここでは束ねて記録する。

- [x] 情報設計とCTA（旧DH-201〜205）: Overview、導入方法、Play、比較ページ、Docsの役割とルートを固定し、CTA名と遷移先を一致させ、遷移テストを追加した。外部リンクには `ExternalLink` アイコンを付けている
- [x] 導入方法ページ（旧DH-203）: GitHub、Skill、MCPの三つを目的別に説明し、コマンドをコピーできる
- [x] 生成画面のPlay（旧DH-204）: 両題材でBaselineとHarness修正版を同じURL構造で切り替え、状態をURLで再現できる
- [x] GitリポジトリとQuick start（旧DH-211、212）: `.gitignore`、公開データ監査、Node.js 24とpnpm 11.13.1の固定、README冒頭のQuick start、GitHub remote設定
- [x] Skill（旧DH-220〜222）: 責務定義、`SKILL.md`、manifest解決スクリプト、`pnpm skills:check`、Skillあり・なしの比較fixture
- [x] MCP（旧DH-230〜232）: read-only resource と tool、不正IDのエラー化、`scripts/mcp/server.test.mjs` の契約テスト、CodexとClaude Codeの接続例
- [x] Table契約の一貫性（旧DH-245）: 契約、表示、コード例、生成画面を同じJSONから生成し、`pnpm design:conformance` で検査する
- [x] 保存済みRunとの整合（旧DH-250）: metadataからの表示、欠損Artifactでのbuild失敗、比較条件一致の検査
- [x] 公開データ監査とライセンス確認（旧DH-260、261の一部）: `pnpm runs:sanitize`、`pnpm public:audit`、`THIRD_PARTY_NOTICES.md`
- [x] Web品質（旧DH-262の一部）: 3幅での横スクロール検査、キーボードとラベルの確認、内部リンク検査、bundle size検査、`scripts/verify-site.mjs` によるE2E
- [x] README と運用文書（旧DH-263の一部）: Quick start、正本、安全規則、`docs/EXPERIMENTS.md`、`docs/RELEASING.md`、`docs/PUBLICATION_POLICY.md`、`docs/PRESENTATION_CHECKLIST.md`
- [x] CI、Preview、Production（旧DH-270〜272）: `.github/workflows/ci.yml`、PRごとのプレビューURL、mainからの自動デプロイ、独自ドメイン
- [x] 請求書管理の題材追加と比較ページの題材切り替え（2026-09-05）
- [x] ESLint プラグインによる Lint 検査と同一モデル比較（prelint-01 / lint-01、2026-09-04）
- [x] 日本語可読性とタイポグラフィの改善、ページ遷移時の先頭スクロール（2026-09-10）

## P0: 公開リポジトリの体裁

### DH-310 ライセンスと利用条件を決める

依存: なし

- [x] OSSライセンスを選び、`LICENSE` を追加する（MIT、著作権 Lumilinks inc.）
- [x] 生成物と保存済みRunの利用条件をREADMEへ記載する
- [x] Issue、Pull Request、外部Contributionを受け付ける範囲を決める（どちらも受け付けない。README に明記、Issues タブは無効化）
- [x] versioningとRelease方針を決める（契約versionは `CHANGELOG.md`、サイトversionは別管理）

完了条件: 公開先と利用条件をREADMEとLICENSEから読める。

### DH-311 GitHubの運用設定を整える

依存: DH-310

- [x] main branchの保護と必須Check（CI の `verify`）を設定する
- [x] Issueテンプレートを用意する（受け付けない方針のため不要と判断）
- [x] Contributionを受け付ける場合だけCONTRIBUTINGと行動規範を追加する（受け付けないため追加しない）

完了条件: 未確認のPRがmainへ直接入らない。

### DH-312 公開サイトの版を確認できるようにする

依存: なし

- [x] version、commit、更新日時をサイト上で確認できるようにする
- [x] 404と予期しないエラーの画面を作る（現在は不明なURLを `/` へredirectしており、ErrorBoundaryもない）
- [x] Previewへ検索エンジンのindex抑止を設定する
- [x] Analyticsと監視を使う場合は収集範囲を決める（Cloudflare Web Analytics。GitHub Actions の変数 `CF_BEACON_TOKEN` を設定するとビルド時に beacon を注入する。トークンは Cloudflare ダッシュボードで発行が必要で未設定）

## P1: デザインシステムを参照資料として完成させる

### DH-240 Foundationsを完成させる

現状: `/foundations` に色、余白、幅、角丸、影、文字を掲載済み。

- [x] Motionを掲載する（motion トークンは定義しない方針を明記）
- [x] token名、値、用途、避ける使い方を表示する
- [x] コントラストとフォーカス色の確認結果を掲載する
- [x] JSONと表示内容の一致を自動検査する（`scripts/docs-consistency.test.ts` の範囲を確認して広げる）

### DH-241 Component契約ページを完成させる

依存: DH-240

現状: `/components` に各契約の利用できるvariant、既定値、関連ruleを一覧で掲載済み。

- [x] 用途、使わない場面、size、stateを掲載する
- [x] アクセシビリティ要件、良い例、避ける例を掲載する
- [x] 関連token、pattern、ruleを相互リンクする（ruleは現在Chip表示のみ）
- [x] HeroUI公式ドキュメントへリンクする

### DH-242 Pattern、Example、Ruleページを完成させる

依存: DH-241

- [x] Page layout variantの選択基準を掲載する
- [x] 自動検証、AIレビュー、人の判断を区別する
- [x] Exampleに必要な画面状態を掲載する
- [x] 顧客管理と請求書管理の業務制約を掲載する
- [x] Ruleの修正方針を掲載する（重大度と検証方法は掲載済み）
- [x] 比較ページの検査結果から該当Ruleへ直接移動できるようにする（現在はページ単位のリンク）

### DH-243 検索と深いリンクを実装する

依存: DH-240、DH-241、DH-242

- [x] token、component、pattern、example、ruleを横断検索する
- [ ] Ruleを重大度と検証方法で絞り込む
- [x] 検索結果から該当見出しへ移動する
- [x] URLで検索条件と見出しを共有できるようにする
- [x] キーボードだけで検索できるようにする

### DH-244 公開向けの説明と表記を整える

依存: DH-242

- [ ] Atlasを「Design Harnessに基づくデモ用デザインシステム」と一貫して表記する
- [x] リポジトリ名の表記を統一する（`package.json` は `design-harness-demo`、`wrangler.jsonc` は `atlas-design-system`、`docs/MCP.md` と導入方法ページの例は `atlas-design-system-demo`）
- [ ] Design Harness、Atlas、HeroUIの責務を説明する
- [ ] 保存済みRunとライブAIの違いを明示する
- [ ] サンプルデータが架空であることを明示する
- [ ] 自動検証を完成承認と誤解させない
- [ ] 日本語と英語が不要に混ざる見出しを整理する
- [x] `MVP.md` の Presenter 前提の記述を現在の構成へ改訂するか、履歴として明示する

完了条件: 初見の閲覧者がDocs、導入、比較ページ、Playを区別できる。

## P1: 品質と文書

### DH-320 アクセシビリティを仕上げる

依存: DH-240

- [x] 色コントラストと200%拡大を確認する（200% は 720px 幅の横スクロール検査で代替）
- [x] 自動a11y検査（axe など）を `scripts/verify-site.mjs` へ追加する

### DH-321 拡張手順を文書化する

依存: なし

- [x] Pattern、Rule、Example、Experiment、Runの追加手順を文書化する（Runの更新手順は `docs/RELEASING.md` にある）
- [x] 別題材を追加するときの比較ページとPlayの登録手順を文書化する

## P1: clean環境の受け入れとリリース

### DH-280 clean環境の受け入れテストを行う

依存: DH-310

- [ ] GitHubからcloneしてQuick startを実行する
- [ ] Skill追加コマンドをclean環境で検証する
- [ ] MCPの接続例をclean環境で検証する
- [ ] APIキーなしで公開サイトを閲覧する
- [ ] Codex CLI認証ありで比較実験を再実行する

### DH-281 初回リリースを作る

依存: DH-280、DH-312

- [ ] versionを決める
- [ ] Release noteに利用方法、既知の制約、保存済みRunを記載する
- [ ] GitHub Releaseを作る
- [ ] 公開サイトとReleaseのversion一致を確認する

完了条件: GitHub、Skill、MCP、公開サイトが同じリリースを参照している。

## P2: 初回リリース後

### DH-301 Explore用LPを作る

- [ ] Design Harnessの短い説明とAtlasへの入口だけを置く
- [ ] デザインシステムサイトと内容を重複させない

### DH-302 シナリオを追加する

- [x] 一覧と空状態（顧客管理）
- [x] 請求書管理
- [ ] 設定変更と権限
- [ ] 破壊的操作と確認
- [ ] データ読み込みと失敗時の復旧

### DH-303 英語表示を追加する

- [ ] UI文字列と設計文書を翻訳可能な構造にする
- [ ] 片方の言語だけ古くならない検査を追加する

### DH-304 hosted MCPを検討する

- [ ] 認証、rate limit、versioning、監視、利用規約を決める
- [ ] ローカルstdio MCPとresource URIを互換にする

### DH-305 ライブAI実行を分離して検討する

- [ ] ブラウザへAPIキーを渡さない
- [ ] サーバー側で実行環境、入力、時間、利用量を制限する
- [ ] 失敗時は保存済みRunへ戻せるようにする

### DH-306 実験の妥当性を上げる

- [ ] 条件ごとに複数runを取り、1 run の偶然に依存しない比較にする
- [ ] Figma / Storybook 連携を扱うかを決める（`MVP.md` では非目標）

## 推奨実行順

```text
DH-310 ライセンス ─ DH-311 GitHub運用 ─┐
DH-312 版の表示・404                     ├─ DH-280 clean環境検証 ─ DH-281 初回リリース
DH-240〜244 Docs拡充 ─ DH-320 a11y ─────┘
DH-321 拡張手順
```

最初に着手するのは `DH-310`。LICENSE がないと clone して使う側の条件が決まらない。

## 初回リリースで作らないもの

- AIとのチャット画面
- 任意コードをブラウザで実行する機能
- ライブAIの公開実行
- hosted MCP
- 複数人での共同編集
- HeroUI全コンポーネントの複製ドキュメント
- Explore用LPの作り込み
- 英語対応
- Presenter / スライド再生（廃止済み）

## 初回リリースの完了条件

- [x] 公開サイトからDocs、導入方法、比較ページ、Playへ移動できる
- [x] BaselineとHarness修正版をブラウザで操作できる
- [x] Skillを通してAIがAtlasの設計契約を参照できる
- [x] MCPを通してAtlasの設計契約をread-onlyで取得できる
- [x] 設計ページと検証処理が同じ正本を参照している
- [x] 保存済みRunと公開画面の数値、画像、条件が一致している
- [x] 秘密情報、端末固有情報、権利不明な素材が含まれていない
- [x] CIが成功し、mainから本番へ自動反映される
- [ ] LICENSEと利用条件が公開されている
- [ ] GitHubからcloneしてAtlasを起動・検証できる（clean環境で確認済み）
- [ ] 公開URL、GitHub Release、Skill、MCPが同じversionを参照している
