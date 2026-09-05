# パターン追加・請求書例・顧客追加の計画

作成: 2026-09-05（Fable が計画、Opus が実装）

## 依頼

1. デザインパターンに「視覚的グルーピング」を追加（参考: SmartHR Design System の visual-grouping）
2. デザインパターンに「モバイルレイアウト」を追加（参考: SmartHR の mobile-friendly-layout）
3. パターン追加後に、請求書の例（第 2 の実験）を追加
4. パターン追加後に、顧客管理に「顧客を追加」操作を足して再度 run を回す

参考ページは考え方の参照のみ。文章はコピーせず Atlas の語で書く。

## 調査で確定している制約

- `scripts/check-design-conformance.mjs` は mvp-11 harness-corrected の保存済み評価と**バイト一致**を要求する。example や rules の内容を変えると落ちる。パターン追加は評価器の出力に影響しないので通る。
- `scripts/validate-design.mjs` の**孤児チェック**: どの manifest からも参照されないパターンはエラー。新パターンは `experiments/account-management/manifest.json` の `designRefs.patterns` から参照する。
- 新パターンの `layout.classes` は `design/layout.css` に実在するセレクタでなければならない。メディアクエリは `breakpoint.narrow - 1`。
- 実験は `account-management` に**全面ハードコード**（11 スクリプト、`--experiment` 引数なし）。`scripts/workspace-paths.mjs:5` の定数が唯一の名前付き箇所。
- 単一 example 前提の `find(uri.includes("/examples/"))` が 3 箇所（`harness-context.mjs:38`（run 経路上）、`evaluate-experiment.mjs:18`、`measure-experiment.mjs:126`）。
- 顧客固有リテラル: `packages/eslint-plugin-atlas/src/options.mjs:22-23`（forbiddenText に「顧客を追加」）、`:73-78` と `rules/link-semantics.mjs:28-31`（`customer.companyName`、`顧客一覧へ戻る`）、`scripts/evaluate-experiment.mjs` 610/629-633/644/679-686/712/727/739/743/745、`design/rules.json` の business.customer-name / navigation.customer-routes / architecture.customer-read-models の文言。
- `brief.md:43` は「顧客の追加」を対象外と明記。example の composition 23 行目も追加操作を禁止。
- `scripts/validate-design.test.mjs:186-196` は example の componentUsage キーを完全一致で固定。
- サイトは `src/data/design.ts` が 2 パターン 1 example の固定シェイプ、`src/pages/DocsPages.tsx` はパターンごとに専用コンポーネント（1043、1129 行）。比較ページと Play は単一 pair 固定。
- run 費用: Opus 1 本 約 11 ドル。今回は請求書 2 本 + 顧客管理 2 本 = 約 44 ドル。harness-corrected を作るなら +11 ドル。

## フェーズ（各フェーズ: 失敗するテスト → 実装 → `pnpm demo:check` 緑 → コミット → push）

### Phase 1: パターン 2 件（他に依存しない。先にデプロイできる）

- `design/patterns/visual-grouping.json`（id `pattern.visual-grouping`、name「視覚的グルーピング」）
  - purpose: 関連する要素をまとまりとして見せ、読む前に情報の関係と操作の影響範囲を判断できるようにする
  - principles: 同じ階層は同じ手段で（余白 → 矩形 → 罫線の優先順）、階層を深くしない、まとまりの手段を混ぜない
  - anatomy: セクション見出し領域（見出し + 操作）、セクション本体、ブロック（ブロック見出し + 内容）
  - variants: `spacing-group`（余白だけで分ける。space トークン）、`surface-group`（Card / Surface の矩形で分ける。背景色は画面背景と異なる surface トークン、影は 1 段まで、モバイルでは多用しない）、`divider-group`（罫線。最終手段、操作要素との競合に注意）、`nested-sections`（セクション内ブロック。2 階層まで）
  - components: component.card、component.surface、component.toolbar（既存 ID のみ）。TabBar / SideNav は Atlas に無いので variant にしない
  - rules: `layout.grouping`、`color.semantic`、`a11y.control-name` など既存 ID のみ
- `design/patterns/mobile-layout.json`（id `pattern.mobile-layout`、name「モバイルレイアウト」）
  - purpose: `breakpoint.narrow` 未満で、情報と操作を保ったまま 1 カラムで読める形に組み替える
  - principles: レスポンシブ（同じ情報を積み替える）とアダプティブ（構造を変える）を使い分ける、1 画面 1 主要操作、タップ領域を確保する
  - anatomy: 固定ヘッダー、1 カラムのコンテンツ、画面下 or 見出し直下の主要操作、全高の Drawer
  - variants: `responsive-collection`（Table → collection-list へ切り替え）、`adaptive-detail`（詳細を 1 カラム、編集は全高 Drawer）、`compact-spacing`（外周を上下 space.6 左右 space.4 に縮め、内容間は維持）、`touch-targets`（操作は最小 44px、隣接操作の間隔は space.2 以上）
  - components: component.table、component.drawer、component.button、component.link、component.search-field
  - rules: `layout.narrow`、`layout.collection-toolbar`、`layout.back-navigation`、`a11y.control-name`
- `layout.classes` に使うクラスは既存を優先。足りないもの（例 `.section-block`、`.touch-target`）は `design/layout.css` に追加し、`scripts/design-contract.test.ts:130-157` のクラス一覧と 159-205 の variant 契約を更新
- `experiments/account-management/manifest.json` の `designRefs.patterns` に `pattern.visual-grouping#surface-group` と `pattern.mobile-layout#responsive-collection` を追加（孤児回避。評価器には影響しない）
- サイト: `src/data/design.ts` を id キーの patterns 配列/マップに。DocsPages の既存 2 ページがデータ束縛だけなら汎用 `/patterns/:id` へ寄せ、そうでなければ専用コンポーネント 2 件を追加。`src/App.tsx` ルート、`DocsShell` nav と titles、`src/App.test.tsx:135-153`、`scripts/docs-consistency.test.ts:28-47`、README/DESIGN.md のパターン一覧
- `scripts/mcp/server.test.mjs:27-28` の既存 2 ID 前提を確認
- 検証: `pnpm demo:check`、`pnpm test:e2e`。バイト一致が維持されることを確認

### Phase 2: 実験の汎用化（挙動を変えない。請求書と顧客追加の前提）

- `--experiment <name>`（既定 `account-management`）を 11 スクリプトに通す。`workspace-paths.mjs` の定数を関数化。実験 manifest の場所は `experiments/<name>/manifest.json`
- 単一 example 参照 3 箇所を `manifest.designRefs.examples` 経由に修正
- `forbiddenText`、linkSemantics の既定（objectNameExpression、backLinkPattern）を example / manifest のフィールドへ移し、`buildWorkspaceLintOptions` が渡す。`rules/link-semantics.mjs` の重複既定値も同期
- 評価器のドメインリテラルを example / manifest 由来に: 必須項目名（`business.customer-name` → example の `requiredFields`）、ルート（`navigation.customer-routes` → `manifest.screens[].route`）、read model 名（example の `readModels`）、ステータス文言、Toolbar の aria-label、検索 aria-label。stale な `.customer-collection` は削除。rules.json の id は 28 件のまま維持し、文言だけ汎用化（`rules-method` と `rules-lint-bijection` を壊さない）
- example.schema.json / experiment.schema.json に新フィールドを追加（additionalProperties false のため）
- 証明: バイト一致がそのまま通る（example の値は変えず、構造だけ足す）。`--dry-run` を baseline / harness で通し、workspace の `HARNESS_LINT.json` の内容が現行と同じであることを確認

### Phase 3: 請求書の例と実験

- ドメイン（Opus に委ねない）:
  - experiment `invoice-management`、title「請求書管理」。ルート `/invoices`、`/invoices/:invoiceId`。HashRouter
  - 一覧の列: 請求書番号（isRowHeader、start）、顧客名（start）、発行日（end、tabular）、金額（end、tabular）、ステータス（start）。isRowHeader はちょうど 1 つ
  - ステータス: 下書き、送付済み、入金済み、期限超過（`color.semantic` で期限超過は danger、入金済みは success）
  - 詳細: 請求書番号、顧客名、発行日、支払期限、金額、ステータス、明細（品目・数量・単価）、メモ
  - 操作: 一覧から詳細へ、詳細から一覧へ戻る、編集 Drawer（顧客名、支払期限、メモ。支払期限は必須、日付形式）、「請求書を無効化」を AlertDialog で確認（取り消せない）。成功で Toast、一覧へ戻る
  - 必須状態: default、empty（一覧）、drawer-open、invalid-due-date、loading、success、failure、void-confirm（詳細）
  - fixtures: 4 件の架空請求書、`listInvoiceSummaries`、`getInvoiceDetail`、`voidInvoice`、`resetInvoiceRecords`
- `design/examples/invoice-management.json`、`experiments/invoice-management/{manifest.json, brief.md, prompt.md, starter/}`。starter は account-management の複製（`*.tsbuildinfo`、node_modules を除く）。manifest の designRefs に新パターン 2 件も参照
- `--dry-run` を両 mode で通し、harness workspace の `HARNESS_LINT.json` が請求書の options（approvedImports、forbiddenText）になっていることを確認してから、有料 run: `--runner claude --model claude-opus-5` で baseline と harness を 1 本ずつ（pair 名 `invoice-01`）。finalize / capture / measure / review を実行
- サイト: `src/data/runs.ts` を実験キーのレジストリに。比較ページに実験切り替え（顧客管理 / 請求書管理）。Play は `play-invoice-atlas.html` / `play-invoice-baseline.html` と vite entry を追加し、`bundle:check` の予算を確認。「サンプル」に「例：請求書管理」ページを追加。`audit-public-data` の requiredArtifacts はサイトが import する pair から導出する形に

### Phase 4: 顧客追加と再 run

- `brief.md`: 対象外から「顧客の追加」を削除し、操作に「一覧から顧客を追加できる。会社名は必須、メールは形式検証、保存成功で一覧へ反映して通知」を追加。必須状態に `create-open`（一覧画面で追加 Drawer が開いた状態）を追加。5 箇所同時更新: manifest requiredStates、brief、`PlayPage.tsx:32-41`、`capture-experiment.mjs:41-59`、`src/App.test.tsx:167-187`
- example: composition 23 行目を「ページ見出しの主要操作は『顧客を追加』1 つ、詳細の主要操作は『顧客を編集』1 つ」に書き換え。`componentUsage` に `component.button`（create）と `component.drawer` を追加。`validate-design.test.mjs:186-196` を更新。forbiddenText から「顧客を追加」を除去（Phase 2 で example 側へ移っている前提）
- starter `fixtures.ts` に `createCustomer`（`deleteCustomer` と同じ形、失敗を再現できる分岐つき）
- ここで mvp-11 バイト一致は**意図的に**壊れる。`check-design-conformance.mjs` の対象 run を設定可能にし、新 run（`create-01` harness）の保存済み評価へ、run が入るのと同じコミットで切り替える
- 有料 run: `create-01` の baseline と harness（claude-opus-5）。finalize / capture / measure / review
- サイト: 顧客管理の比較ページ、Play のソース、PlayPage の状態を `create-01` へ。`/harness` のサイクル図は mvp-11 の数字のまま（出典の一文で run を明示済み）。harness-corrected を回すかはユーザー判断（+11 ドル）

## 進め方

- Phase ごとに Opus サブエージェント 1 体（model opus）。続きは SendMessage で同じエージェントに渡す
- コミット前に lead が `pnpm demo:check` を実行し、diff に機密情報が無いことを確認する
- 進捗は `docs/lint-migration-progress.md` に節を追記する
