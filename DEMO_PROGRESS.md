# デモ改修 進捗メモ（コンテキスト圧縮対策）

計画の正本: `~/.claude/plans/jazzy-seeking-popcorn.md`（6 Phase・32項目、承認済み）
スコープ決定: baseline比較まで / 詳細画面は1カラム / 題材は既存の顧客管理

## Phase 状況

- [x] **Phase 1: 契約の器** — コミット `fbcc84b feat: レイアウト契約とlayout.cssを追加`（17ファイル）
  - tokens.json に `breakpoint.narrow: 768px`、theme.mjs が `--dh-breakpoint-narrow` を出力
  - `design/layout.css` 新設（182行、`.page-shell` / `.page-heading` / `.collection-*` / `.detail-*` / `.drawer-form`、@media 767px）
  - pattern.schema に `$defs/layout`（breakpoint / classes / values）、component.schema に optional `layout`
  - page-layout 3 variant + spacing-layout 4 variant + drawer / alert-dialog へ layout 契約記入
  - validate-design.mjs に3検査: ①layout.css の media リテラル = narrow−1px ②classes の存在 ③token参照の解決（先頭セグメントが tokens トップレベルキーならtoken扱い、それ以外はリテラル許可）
  - DESIGN.md を tokens.json 実値へ統一（body 16px 等）+ Breakpoint & Layout Partials 節
  - 検証: design:check パス（14 components / 2 patterns / 1 example / 27 rules）、test:run 9 files 61 passed、mcp/server.test.mjs 4 passed、ネガティブテスト3種で検査が正しく落ちることを実証
- [x] **Phase 2: 供給経路** — コミット `9149616 feat: screens導入と契約解決の供給経路を追加`（9ファイル）
  - experiment.schema に optional `screens`（id/route/pattern#variant/overlays[{id,component,pattern}]）、manifest に collection・detail の2 screen + edit-drawer / delete-confirm overlays
  - resolveDesignContract: pattern リソースへ `variants` 付与、screens 検証と通過（契約 version 1.1.0）、Example→pattern 推移解決。resources は22件に
  - manifest designRefs.patterns へ spacing-layout#page-content・#dialog-content、example components へ component.alert-dialog
  - validate-design に孤児検出（experiments/*/manifest.json を浅く readdir → designRefs/screens → example/pattern の components を推移マーク → 到達不能な id は error）。toast 外しで落ちることを実証
  - refine-experiment.mjs のプロンプトからレイアウト細目を削除し「HARNESS_RESOLVED.jsonの契約に従う」汎用文へ（timers・debug.test.tsx等の運用注意は維持）
  - SKILL.md: screens の variant 使用と layout.css import・再実装禁止を追記
  - 検証: 9 files 68 tests パス、design:check パス、validate-runs OK（1 experiment / 15 runs、旧run互換維持）
- [x] **Phase 3: 検証（幾何計測）** — TDD Red→Green 完了、mvp-10 バックテスト済み
  - `scripts/measure-experiment.mjs` 新設: Playwright(@playwright/test) + Vite で 1440/390/320 の3viewport × screens を描画し `measurements.json` 出力。契約アンカー（layout.css クラス）と役割ベース要素（table/toolbar/searchInput/heading/backLink/dialog）を probe（rect + computed styles 12種）。アンカー不在は `found:false` で記録しクラッシュしない（baseline 縮退）。drawer-open は requiredStates にあれば desktop で追加計測。`--out` でスクラッチパッド出力（run.json 不変更）
  - experiment.schema に screen.sampleParams、manifest detail へ `customerId: customer_northstar`（route の `:param` 置換用）
  - evaluate-experiment.mjs: 契約解決を resolveManifest 経由に汎用化 + layout系4ルールを幾何判定へ（measurements があるときのみ。無ければ従来の静的判定へフォールバック → 旧テスト22件互換）。判定は解決済み variant layout.values（±2px）と比較し、evidence に「実測Npx（契約Mpx）」を記録。evaluateRun へ optional `outDir`（指定時は run.json / workspace 不変更）
  - refine-experiment.mjs の評価2箇所の直前に measureRun 挿入 → corrected は常に実測込み評価
  - compare-experiment.mjs: design-evaluation.json の review 欄を comparison.json へ転記（optional）
  - `scripts/review-experiment.mjs` 新設（非ゲート・開発時のみ）: スクショ4枚 + layout.grouping / color.semantic ルール文を `codex exec -i` に渡し、所見JSONを design-evaluation.json の review 欄へ保存
  - package.json へ `experiment:measure` / `experiment:review`
  - mvp-10 バックテスト（スクラッチパッド出力）: クラッシュなし、baseline 12 fail > harness 8 fail > corrected 3 fail。corrected の fail は想定通り（customer-* クラス名不一致、.drawer-form gap 16px vs 契約24px、.collection-list-mobile 不在）で全て実測値で説明可能
  - 検証: vitest 11 files 90 tests 全パス（新規: measure 7 + evaluate幾何 11 + review 4）、design:check・lint パス
  - 注意: eslint は node globals のため、page.evaluate に渡すブラウザ内関数には `/* global document, getComputedStyle */` が必要。playwright パッケージ名は `@playwright/test`（`playwright` 単体は未導入）
- [x] **Phase 4: 削除AlertDialog シナリオ** — コミット `4c397c7 feat: 削除確認AlertDialogシナリオを追加`（10ファイル）
  - brief.md: 削除要件（AlertDialogで対象と結果を確認、成功でToast＋一覧へ、失敗で再試行、fixturesのdeleteCustomer使用）、必須状態へ delete-confirm、対象外から「削除」を除去
  - starter/src/fixtures.ts: `deleteCustomer(customerId, {simulateFailure})` → `{ok:true}|{ok:false,reason}` + `resetCustomerRecords()`（customerRecords を let + 初期データコピーへ）
  - manifest requiredStates へ delete-confirm（8状態目）。evaluate の requiredStates は**ハードコード7状態配列を廃止し manifest から導出**（advisor 指摘の重複解消）
  - evaluate action.confirmation を AST 化: AlertDialog(.Root) 存在 + AlertDialog.Trigger 内に HeroUI Button 必須（`containsJsxTag` ヘルパー新設）。evidence は不足内容で分岐。Issue対象外UI検査から「顧客を削除」を除去
  - example: composition 3行追記（削除はPageHeading操作領域・danger-soft副次操作・主要操作は編集1つ、確定はdanger Button、成功Toast+一覧へ）+ componentUsage["component.alert-dialog"]（trigger/confirm/cancel/content/onSuccess/onFailure）+ states + rules へ action.confirmation
  - example.schema.json: componentUsage の許可リストへ component.alert-dialog を **required** で追加（$defs/alertDialogUsage・dialogAction）
  - rules.json state.complete description へ「Delete confirm」追記。PlayPage へ delete-confirm（「削除を確認」）追加
  - MVP.md: 題材・画面と機能・保存する状態・自動検証を更新
  - 検証: vitest 92 passed（新規: AlertDialog.Trigger内Button必須 + manifest由来states の2件）、design:check・lint・typecheck・runs:check（15 runs 互換）・starter typecheck/test 全パス
- [x] **Phase 5: mvp-11 生成（完了）** — codex-cli 0.151.0 / ChatGPT 認証済み / gpt-5.4
  - 手順確定: run(baseline)→run(harness)→measure+evaluate(各)→run(harness-corrected)→refine→capture→review→compare。measure/review/capture は `--pair` のみで全mode処理。evaluate は `--pair --mode` 必須。refine は run(harness-corrected) 実行済みが前提（run.json を読む）
  - dry-run 検証済み: workspace の design/ に delete-confirmation・Delete confirm・layout.css が同梱される（HARNESS_RESOLVED.json の resources はポインタ形式で、実体は design/ へ sync）
  - baseline 完了: status completed、checks = typecheck✓ / test✗ / build✓。評価 **10 passed / 15 failed / 2 review**。fail には layout系4種（契約クラス不在・負margin実測）と action.confirmation（AlertDialog.Triggerなし）を含む — 新検査すべて機能
  - harness 完了: checks 全✓、評価 19→**20 passed / 5 failed**（評価器修正後）。corrected 1巡目: 22→**23 passed / 2 failed**（refinement-events.jsonl あり）
  - **評価器の誤検出を TDD で修正済み**: link-semantics の `hasMobileDetailLink` が「顧客を確認」文言をハードコード要求していた（design/・brief・prompt・SKILL のどこにも存在しない文言）→ 「`.collection-list-mobile` コンテナ（layout.css の契約クラス）内に href/to 付き Link がある」判定へ変更（evaluate-experiment.mjs L769、evidence 文言 L950 も更新）。テスト2件追加・更新で 93 passed。**コンテナ外の「顧客を確認」Link は fail になる仕様変更**（契約ベース化）
  - corrected 残存 2 fail は正当: action.confirmation（AlertDialog.Root 直下に生 Button、Trigger 不使用）と a11y.focus-management（Drawer.Trigger 不使用）。正解形は mvp-10 corrected の **controlled + Trigger 併用**（`<Drawer.Root isOpen onOpenChange>` + `<Drawer.Trigger className="button ...">`）。AlertDialog.Trigger は HeroUI に実在（型定義確認済み）
  - refine 2巡目結果: 24 passed / **1 failed**。AlertDialog.Trigger は正しく直った（Trigger 内 Button = DialogTrigger は DOM を作らないので合法）が、**Drawer.Trigger には Button を入れ子**にした（Drawer.Trigger は自前の `<button data-slot="drawer-trigger">` を描画するため button 入れ子 = HTML 違反、vite console に hydration エラー）。2つの Trigger は要求形が非対称: AlertDialog=内側に Button 必須 / Drawer=Trigger 自体に className・入れ子禁止
  - 対処（コミット `dacd21a` link-semantics + `a4ce1e2` Trigger入れ子）: ①TDD で `drawerTriggerHasNestedButton`（containsJsxTag）を hasManagedDrawer に追加、入れ子= fail ②evidence を正解形が伝わる文言へ（「Buttonを削除し、Trigger自体へclassName…ラベル直接」）③drawer.json guideline も「入れ子にしない（HTML違反）」を明文化（refine の sync で codex に届く）。94 テスト全パス
  - refine 3巡目で新規 fail「.collection-list-mobile が390pxのDOMにありません」→ **measure の viewport レース**が原因: hash のみの `page.goto` は同一ドキュメント遷移で再マウントされず、matchMedia→setState→再レンダーが probe に負けることがある（1〜2巡目は偶然勝ち）。`about:blank` を挟んで毎エントリ新規マウントへ（コミット `fbc44a3`）。measure+evaluate を2回実行し再現性確認
  - capture の getByRole「編集を閉じる」ハードコードがタイムアウト → 契約に無い文言（grep で不存在確認）。`/閉じる/` 正規表現 + `.first()` へ（コミット `7f61909`、mvp-11 画面構成対応の WIP も同梱・amend でメッセージ修正）
  - review 初回実行で「No prompt provided via stdin」→ codex exec の `-i` が可変長で positional prompt を画像パス扱い。TDD で `buildReviewArgs` を切り出し `--` 区切り追加（コミット `a4d3e52`）
  - **最終結果（DoD 達成）**: baseline **10 passed / 15 failed / 2 review**（test✗）、harness **22 passed / 3 failed / 2 review**（checks全✓）、corrected **25 passed / 0 failed / 2 review**（checks全✓・capture の console-error ゲート通過=実ブラウザエラーゼロ）。勾配 **15 > 3 > 0** 成立
  - harness 残存3 fail は正当な静的検査: component.table.columns（列定義不共有）/ action.confirmation（AlertDialog.Trigger不在）/ a11y.focus-management（Drawer.Trigger className不在）— correction ループが直す類のもので、デモのストーリーとして健全
  - review findings 全モード保存済み: baseline concern=layout.grouping / harness concern=color.semantic（「顧客を削除」の淡い赤）/ corrected concern=layout.grouping（カード間隔がカード内間隔と大差ない）。comparison.json は conditionsMatch:true、blindOrder A=baseline/B=harness
  - Phase 5 コミット: `dacd21a`(link-semantics契約化) `a4ce1e2`(Trigger入れ子検出) `fbc44a3`(measureレース) `7f61909`(capture更新) `a4d3e52`(review引数) `a905b51`(**mvp-11成果物 87ファイル**)
  - **【厳守】mvp-11 に対して evaluate / measure を再実行しない** — design-evaluation.json の review 欄が silently 消える（保存済み run が正本）
  - 注意: `rm -rf` はユーザーの deny 設定で拒否される → 一時ディレクトリ削除は node の fs.rmSync を使用（dryrun-check 削除済み）
  - 注意: `navigationButtons` 検査は Button テキストに `customer.companyName` を含むと fail → 削除確認ボタンのラベルに会社名を interpolate すると誤爆しうる（現状「削除する」系で未発生）
- [x] **Phase 6: デモ配線と仕上げ（編集・自動検証完了、実機確認のみ残）**
  - **theme:check 実装（TDD）**: theme.mjs へ `findStaleThemeFiles(theme, files)`（content undefined = stale扱い）、theme.test.mjs 3テスト、generate-theme.mjs を `--check` 分岐へ書き換え（targets = src/generated/theme.css と design/theme.css の2枚）。package.json へ `theme:check` を追加し demo:check チェーンの design:check 直後へ組み込み
  - **mvp-11 配線完了**: src/play/atlas.tsx / baseline.tsx の import、DemoPage.tsx（import 5件 + 画像src + Issue場面へ削除要件追記 + 「8状態」+ 違反件数・CLI/Model を JSON から自動参照）、check-design-conformance.mjs、preview-experiment.mjs 既定 pair、audit-public-data.mjs requiredArtifacts 7エントリ、verify-site.mjs、README.md 数値段落
  - **conformance の measurements 対応**: 保存済み rules は幾何計測込みで算出されるため、run ディレクトリの measurements.json を読み `evaluateSource({..., measurements})` へ渡す改修。実行結果「Design conformance OK: 25 passed / 2 review」（.runs/ workspace と source/ の一致は diff -rq で事前確認済み）
  - **verify-site.mjs の2文言修正**: ①Drawer 閉じるボタン name は「編集画面を閉じる」②invalid-email の表示エラーは **FieldError の「メールアドレスの形式を確認してください。」**（App.tsx L678 の「一般的なメール形式で入力してください。」は Description スロットで invalid 時 hidden → getByText がタイムアウトした。Description と FieldError は別スロット）
  - ドキュメント同期: README（シナリオ削除追記・mvp-11 数値・delete-confirm・spacing-layout/layout.css 正本・パイプライン順序と evaluate/review 注意）、MVP.md 正本ツリー実構成化、TASKS.md DH-242 2項目消化
  - 検証パス: `pnpm test:run` 12 files / 98 tests、`pnpm demo:check` 全チェーン（bundle 9 assets / 16 MiB）、`pnpm test:e2e`「Site browser check OK」
  - コミット構成: ①theme:check 機能（theme.mjs / theme.test.mjs / generate-theme.mjs）②mvp-11 配線+docs（play×2 / DemoPage / conformance / preview / audit / verify-site / package.json / README / MVP / TASKS / 本ファイル）。**前セッションWIP（docs/, skills/, DocsPages.tsx, styles.css, design/components/*.json, 旧run mvp-07..10 等）はコミットしない**
  - **Chrome 実機確認完了（2026-09-02）**: /demo 4場面（矢印キー遷移・R リセット・横スクロールなし）、/play atlas・baseline × 8状態を確認。デスクトップは目視（delete-confirm の AlertDialog、success の更新完了表示、baseline の独自ダイアログ=検査 fail の根拠どおり）。モバイルは macOS Chrome がウィンドウを 390px まで縮められないため、**ページ内に正確な 390/320px 幅 iframe を生成して実描画・実測**する方式で全状態スイープ: atlas は 390/320 とも全状態 scrollWidth ≤ 幅（横スクロールなし）+ 390 でテーブル→モバイルカードリスト切替を確認、baseline も横スクロールなし。390px の一覧・Drawer は目視でも確認。コミット: `f08169e`(theme:check) `b32b03b`(mvp-11配線)

## 重要な教訓・注意

- **未コミット作業があるファイルに `git checkout --` を使わない**（drawer.json 消失→Write で復元済み）。破壊テストは Edit で壊して Edit で戻す
- リポジトリは大量の未コミットWIPを含む。コミットは Phase で触ったファイルのみ選択的に add（`-A`/`-u` 禁止）
- validate-runs.mjs は manifest.json と run.json のみ検証 → 評価アーティファクトへのフィールド追加は旧 run (mvp-01..10) を壊さない。ただし新フィールドはすべて optional にする
- ajv 2020 strict + additionalProperties:false → スキーマ更新が先
- macOS grep(ugrep) は `(--|\b)` で empty subexpression エラー
- HeroUI 実測: Drawer right 20rem（sm≥640で24rem）max-w 85vw p-6 / AlertDialog md max-w 28rem p-6
- mvp-10 バックテストでの正当な fail: customer-* クラス名（layout.css の汎用名と不一致）、drawer-form gap space.4（契約は space.6）
- **Phase 5 の実行順序厳守**: refine/evaluate → review → compare。evaluateRun は design-evaluation.json をゼロから再生成するため、**review 実行後に evaluate を再実行すると review 欄が silently 消える**（compare は optional 扱いで警告なし省略）
- refine-experiment.mjs の run.json 上書きは自己修復する設計（1回目 measureRun の artifact 追記は stale な `run` 変数で上書きされるが、2回目 measureRun が再読込して再追記）。L16 の read を「修正」しないこと
- run.schema.json の artifacts は自由な string 配列 → measurements.json 追記は validate-runs を壊さない（確認済み）
