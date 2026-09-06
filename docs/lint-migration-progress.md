# 機械検査ルールの ESLint 化 進捗メモ

計画: `~/.claude/plans/lint-lint-lint-ci-ai-humming-bubble.md`。ブランチ `feat/atlas-eslint-plugin`。

## 決定事項
- `@eslint/css` は 1.4.0 を使う。2.0.0 は 2026-09-02 公開で minimumReleaseAge に引っかかる。
- `Linter#verify` は `language: "css/css"` と TSX(typescript-eslint parser)の両方を同期で処理できることを確認済み。
- mvp-11 の styles.css は `@import` のみで Tailwind 固有構文なし。customSyntax は不要。
- 存在判定型のルール(component-usage、form-label、contact-email、link-semantics、action-confirmation、focus-management、table-variant、component-theme-import)は workspace の eslint.config.js で `src/App.tsx` / `src/styles.css` に限定する。評価器が App.tsx だけを見る現行と同じ意味になる。
- component-variants の動的 variant は lint では error として報告し、評価器では messageId が dynamic だけなら `review` にマップする(現行契約を維持)。
- 移行後の内訳: lint 12 / automatic 11 / ai-review 5。

## 進捗(2026-09-03 時点で Phase 1 完了)
- [x] ブランチ作成、`packages/eslint-plugin-atlas` scaffold、`pnpm-workspace.yaml` に `packages/*`
- [x] プラグインの 12 ルール(RuleTester、mvp-11 fixture)
- [x] rules.json method=lint と bijection テスト
- [x] 評価器を Linter 経由に差し替え(design:conformance バイト一致: 23 passed / 5 review)
- [x] starter eslint.config.js / lint script / run-experiment checkCommands / SKILL.md / prompt.md
- [x] syncHarnessContext の絞り込み(resolved resources のみ、design/ 144K → 108K)と rules フィルタ(28 → 16 件)、MCP `atlas://design/rules` も同じフィルタ
- [x] DESIGN.md、UI(`lint: "Lint"`、lintCount)、テストのカウント更新
- [x] `pnpm demo:check` 全緑(215 tests)、手動確認: workspace で mvp-11 baseline → atlas 違反 55 行、harness-corrected → 0

## 手動確認の手順
starter を `.runs/lint-check-*` にコピーし node_modules を symlink、`syncHarnessContext` を実行してから `src/` に保存ソースを置いて `pnpm lint`。

## Phase 2 候補(未着手)
JSX 内 raw color、jsx-a11y、manifest 駆動ルール(customer-routes / customer-name / state.complete)、forbiddenText の manifest 移管、layout.* の lint 化、`hashHarnessContext` の resolved 限定、mvp-11 再生成、autofix。

## lint-01 の結果(2026-09-03、claude-opus-5)
- baseline: 12 pass / 11 fail / 5 review。harness 初回: 23 pass / 0 fail / 5 review、Atlas lint 0 違反。harness-corrected は失敗なしのため未実施。
- 問題: mvp-11 は gpt-5.4 なので lint 化の効果と model の差が分離できない。baseline の lint は Atlas 層が無いのに passed と記録される。

## 進行中(2026-09-03)
- [x] 比較ページで baseline の lint を「Atlas ルール非適用」と表示(`ChecksList` の `condition` prop、`check-skip`)
- [x] 対照 run `prelint-01`(main = lint 化前、claude-opus-5、worktree `../atlas-prelint`)。harness は API 500 で 1 回、採点器読み取りで 1 回止め、3 回目で完了。workspace をこのブランチにコピーし本ブランチの評価器で再評価(main の評価器と結果一致)。
- [x] sanitize / audit がユーザー名の `-` 区切り形(Claude Code の projects ディレクトリ名)を見逃していたので `usernamePattern` を追加。lint-01 も再 sanitize。

## prelint-01 の結果と注意点(2026-09-04)
- App.tsx のみの評価: baseline 6 pass / 17 fail、harness 12 pass / 11 fail。
- ただし両 run とも画面を複数ファイルに分割(CustomerListPage.tsx など)。評価器と lint の存在判定は App.tsx だけを見るため、多くの fail は「別ファイルにある」誤検知。全 tsx を連結した参考値では baseline 11 fail、harness 4 fail(component.approved の Spinner/cn import、Link の欠落、link-semantics、action.confirmation)。
- mvp-11、lint-01 は全て単一 App.tsx だった。分割は同じプロンプト・同じモデルでも起きるので run のばらつき。評価器の単一ファイル前提は直すべき(entryFile を固定せず src/**/*.tsx を対象にする)。
- lint-01 harness(lint 化後)0 fail と比べると lint 化の効果はありそうだが、n=1 かつ上記の誤検知があり、断定はできない。
- 隔離の問題: workspace の node_modules symlink から親リポジトリの絶対パスが見え、prelint-01 harness の 2 回目はエージェントが `scripts/evaluate-experiment.mjs` を全文読んだ(止めた)。lint-01 harness も `ls ..` で親を 1 回覗いている。3 回目は親リポジトリへのアクセスなし。対策は未実施。
- 費用: 失敗 2 回で約 17 ドル、完走 1 回で約 11 ドル。
- [ ] 修正ループのデモは 1・3 の後に検討(ユーザー判断待ち)。
- 注意: gh の active account を kgsi に切り替えた(戻すなら `gh auth switch --user kogiso-findy`)。

## 2026-09-04 公開ページの参照 run の判断

- mvp-11 を公開ページの主軸として残す。理由: 公開ページは baseline / harness / harness-corrected の 3 条件の物語で、play ページの source import、invalid-email スクリーンショット、design:conformance のバイト一致、audit の requiredArtifacts がすべて mvp-11 に結びついている。lint-01 には harness-corrected がなく、harness が違反 0 件なので修正ループを語れない。
- 代わりに結果ページ末尾に「同じモデルでの比較」節を追加。prelint-01 と lint-01 の 4 条件の合格/違反/要確認を表で載せ、各条件 1 run と App.tsx 単一前提の注記を本文に書いた。数字は保存済み design-evaluation.json のみ（`src/data/runs.ts` の `sameModelRuns`）。
- lint-01 の harness-corrected run は実施しない（違反 0 件で直すものがなく、約 11 ドルかけて示せることがない）。

## 2026-09-04 評価器と lint の単一 App.tsx 前提を撤廃

- `packages/eslint-plugin-atlas/src/screen-sources.mjs` の `collectScreenSourcesSync(srcDir)` が App.tsx の相対 import を辿り、画面を構成する .tsx / .ts / .css を集める(テストと main.tsx は含めない)。`scripts/screen-sources.mjs` はその薄い wrapper。
- `evaluateRun` は 3 ファイル固定読みをやめ、この collector の連結文字列を `evaluateSource` に渡す。単一 App.tsx の run では文字列が元ファイルと一致するので、mvp-11 / lint-01 の保存済み評価は合否・evidence とも変わらず、`pnpm design:conformance` のバイト一致も維持。
- `lintAtlasSources` は `tsxFiles` を受け取ると、存在判定系 7 ルールは連結全体で 1 回、ファイル内ルールは各ファイルを実名で検査する。evidence には App.tsx 以外の由来ファイル名を付ける。
- workspace の `pnpm lint` 用に ESLint processor `atlas/screen` を追加。`atlasConfigs({ screen: true })` で App.tsx を lint するとき import で辿れる画面全体を仮想ブロック `App.tsx/1_screen.tsx` として存在判定にかける。`harness-context.mjs` の生成設定はこれを使う。ESLint は仮想ブロックの本文が元と同一だと設定を再解決しないので、末尾に `// atlas:screen` を足している。
- prelint-01 を再評価: baseline 6→12 pass / 17→11 fail、harness 12→18 pass / 11→4 fail。harness の残り 4 件(Spinner・cn・buttonVariants の import、HeroUI Link の欠落、link-semantics、AlertDialog.Trigger の欠落)は実物の違反。prelint-01 harness のコピーで新旧設定の eslint を比べると 18→7 problems で、残りは評価器の fail と同じ内容。
- 未対応: workspace 脱出(`.runs` がリポジトリ内、`node_modules` が親への symlink)。直すには `.runs` をリポジトリ外へ出して workspace ごとに依存を実インストールする必要があり、run の再取得も伴うので今回は見送り。
- 未対応: processor `atlas/screen` の `postprocess` は仮想ブロックの ruleId なしメッセージ(構文エラー)を捨てる。連結ソースが parse に失敗すると存在判定 7 ルールが何も報告せず黙って通る。評価器側は構文エラーとして扱うので不一致。直すなら fatal メッセージがあるとき 1:1 に error を 1 件出す。

## 2026-09-04 workspace をリポジトリ外へ隔離

### 変えたこと
- workspace の場所を `<repo>/.runs/account-management/<pair>/<mode>` から `~/.cache/design-harness/runs/account-management/<pair>/<mode>` へ移した。`scripts/workspace-paths.mjs` の `runsRootDir` / `pairWorkspaceDir` / `workspaceDir` が正本で、`DESIGN_HARNESS_RUNS_DIR` で上書きできる。リポジトリ内を指すと throw する。
- 親の `node_modules` への symlink を廃止。workspace ごとに `pnpm install --prefer-offline --ignore-workspace` を実行する。失敗すれば run を止める。
- starter に eslint 系 devDeps(eslint 10.9.1 / @eslint/js 10.0.1 / globals 17.11.0 / typescript-eslint 8.68.0)と `.gitignore`(node_modules, dist, .harness)を追加。starter のコピー時に `node_modules` を除外する。
- harness / harness-corrected では `packages/eslint-plugin-atlas` を `pnpm pack` して `<workspace>/.harness/` に置き、`file:./.harness/eslint-plugin-atlas-0.1.0.tgz` を devDependency として入れる(`scripts/workspace-deps.mjs`)。baseline には入れない。
- プラグインに `files: ["src"]` を追加して tarball から `test/` を外した。`test/mvp-11.test.mjs` には保存 run の期待合否が書いてあり、workspace の node_modules に置くと採点の手がかりになる。
- プラグインの `peerDependencies` に `typescript-eslint >=8` を追加。`src/index.mjs` が import しているが未宣言で、symlink 構成では root から解決できていた。tarball 構成では解決できない。
- `scripts/workspace-isolation.mjs` の `scanIsolation` が sanitize 前の `events.jsonl` を走査し、リポジトリ絶対パスと `evaluate-experiment` の出現回数を `run.isolation` に記録する。`run.schema.json` に optional で追加した。
- `sanitizeText` が workspace の絶対パスを `<workspace>` へ畳む(`<home>` より先)。
- リポジトリ内に残っていた旧 workspace(`.runs/`、14 pair 分、114MB)は同日削除した。旧 pair の再計測が必要なら新しい場所で workspace を作り直す。

### 検証方法(お金をかけない)
- `pnpm exec vitest run scripts packages` → 27 files / 236 tests 緑。
- `pnpm experiment:run -- --mode <baseline|harness|harness-corrected> --pair iso-check --dry-run` の 3 条件。各 workspace で `node_modules` が実ディレクトリであること、`node_modules/react` の realpath が workspace 内であること、`grep -rl <repo の絶対パス>` が 0 件であることを確認。
- baseline: lint / test:run / build 緑、`eslint-plugin-atlas` は入っていない。harness: typecheck / test:run / build 緑、lint は Atlas ルールで 13 件報告(starter 素の状態なので期待どおり。プラグインと typescript-eslint が tarball 経由で解決できている証拠)。
- workspace で `git add -n .` して `node_modules` / `.harness` / `dist` が入らないことを確認(57 ファイル)。

### 残る限界
- 壁ではなくポインタの除去。`--dangerously-skip-permissions` のエージェントが絶対パスを推測して読みに行くのは防げない。防ぐには sandbox かコンテナが要る。
- workspace の `node_modules/.modules.yaml` に pnpm store の絶対パス(`~/Library/pnpm/store`)が残る。ホームは見えるがリポジトリは見えない。
- `run.isolation` は run-experiment だけが記録する。`refine-experiment.mjs` もエージェントを走らせるが今回は対象外。
- 保存済み run(mvp-11 / lint-01 / prelint-01)は隔離前のもので、`isolation` を持たない。比較数字の再取得は 1 本約 11 ドルなので別途判断。
- 再現性が下がった。以前は全 run が root の `pnpm-lock.yaml` で固定された同じ `node_modules` を共有していた。今は workspace ごとに lockfile を作るので、直接依存は starter の固定バージョンどおりでも、推移的依存は install した日で変わり得る。同じ pair の baseline と harness は数分差なので対の比較には影響しないが、pair をまたぐ比較や日を置いた再現では前提が弱い。root の pnpm 設定(`minimumReleaseAge` など)も workspace には効かない。直すなら starter に `pnpm-lock.yaml` を置く。

## 2026-09-05 パターン 2 件を追加（Phase 1）

- `design/patterns/visual-grouping.json`（余白 / 矩形 / 罫線 / 入れ子セクション）と `mobile-layout.json`（一覧の切り替え / 詳細の 1 カラム / 余白の縮小 / タップ領域）を追加。`layout.css` に `.section-block` 系 3 クラスと `.touch-target` を追加
- account-management の manifest から両パターンを参照（孤児チェック回避）。評価器は `#collection-table` / `#single-one-column` だけ layout を解決するので mvp-11 とのバイト一致は維持
- サイトは汎用の `PatternDocPage` で 2 ルートを追加。既存 2 ページは専用プレビューを持つため汎用化していない
- 未解消: 狭い画面の左右余白が `layout.css` は 12px、`spacing-layout.json` と `mobile-layout.json` は 16px と食い違う
- 次: Phase 2（`--experiment` 汎用化）→ Phase 3（請求書）→ Phase 4（顧客追加 + 再 run）。計画は `docs/plans/patterns-invoice-create-plan.md`

## 2026-09-05 実験スクリプトの題材非依存化（Phase 2）

挙動を変えずに account-management 以外の実験を回せるようにした。振る舞いの変更は入れていない。

### `--experiment` を通した
- `scripts/workspace-paths.mjs` の定数 `experimentDir` を関数へ。`experimentPaths(name)` が manifest / starter / brief / prompt / workspace / 保存Run のパスを返し、`resolveExperimentName(args)` が名前の形（`^[a-z0-9][a-z0-9-]*$`）と manifest の存在を検査する。既定は `account-management`
- CLI 12 本（run / evaluate / capture / measure / finalize / compare / refine / review / preview / runs:sanitize / public:audit / design:conformance）が `--experiment` を受ける。workspace は `DESIGN_HARNESS_RUNS_DIR/<name>/<pair>/<mode>/` へ 1 階層深くなった
- `scripts/experiment-arg.test.mjs` が「12 本すべてが `resolveExperimentName` を使い、`defaultExperimentName` を直接参照しない」を固定する

### 画面と状態を manifest から引く
- `scripts/capture-targets.mjs` を新設。`buildCaptureTargets(contract, { requiredStates })` が manifest の `screens[].route` / `sampleParams` / `overlays` と `requiredStates` からスクリーンショットの対象とファイル名を組み立てる。capture（書く側）と review（読む側）が同じ関数を使うのでファイル名が食い違わない
- `invalid-` で始まる状態名を入力検証の状態として扱う規約を `design/schemas/experiment.schema.json` の description に書いた
- example が 1 本だけという前提（`uri.includes("/examples/")` での探索）を `manifest.designRefs.examples` 経由の解決へ置き換えた（harness-context / evaluate / measure の 3 箇所）

### 題材語彙を契約側へ移した
- `packages/eslint-plugin-atlas/src/options.mjs` の `defaultForbiddenText` と linkSemantics の既定値を削除し、example の新設 `lint` から読む
- `scripts/evaluate-experiment.mjs` の題材リテラル（必須項目名、ステータス文言、ルート、戻る導線の文言、読み取りモデル名、検索の aria-label と placeholder、Toolbar の aria-label）を example / manifest 由来にした。採点側だけが見る値は example の `evaluation` に置く。`evaluation` は公開本文から落ちる唯一のキーなので harness だけが答えを見る状態にはならない
- `design/rules.json` の 4 件（`component.table.variant` / `business.customer-name` / `navigation.customer-routes` / `architecture.customer-read-models`）から顧客語彙を抜いた。id と件数（28）は変えていない
- 判定の入力だけでなく、`design-evaluation.json` に残る証跡の文言も契約から組むようにした。ルートは `context.routes`、読み取りモデル名は `evaluation.readModels`、必須入力の呼び名は example へ新設した `evaluation.requiredFieldLabel`（値は「顧客名」）から取る。account-management では以前と同じ文字列を生成するので保存済み評価とのバイト一致は崩れない。別題材の実験でも証跡が嘘にならない
- `scripts/rules-domain-neutral.test.mjs` が rules.json と `scripts/evaluate-experiment.mjs` の本文に顧客語彙が戻らないことを固定する。あわせて読み取りモデル名が example の公開本文（`composition`）に残っていることも固定した。ここが harness へ渡る唯一の経路なので、消すとテストが落ちる

### 検証
- `pnpm exec vitest run scripts packages` → 30 files / 299 tests 緑
- `pnpm design:conformance` → `23 passed / 5 review`。mvp-11 とのバイト一致は維持
- `pnpm experiment:run -- --pair phase2-verify --mode <harness|baseline> --dry-run` を隔離先で実行し、harness workspace の `HARNESS_LINT.json` / `HARNESS.json` / `HARNESS_RESOLVED.json` / `eslint.config.js` が変更前と完全一致することを `cmp` で確認
- `pnpm demo:check` 緑

### 残る限界
- `design/rules.json` の本文はデモサイトにそのまま出る公開コピーなので、文言の一般化はサイト表示にも出る
- rules.json と example は `hashHarnessContext` の対象。次の Run から `designContractSha256` が変わる。保存済み Run の値とは揃わない
- `evaluation.requiredFieldLabel` は「顧客名」で、Table の列ラベル「企業名」とは別の語を持つ。証跡の文言を保存済み評価と一致させるために分けている
- `--dry-run` でも `experiments/<name>/runs/<pair>/<mode>/run.json` は書かれる（Phase 2 以前からの挙動）。検証で作った pair は消すこと
- Table の列ラベルは「企業名」、brief と rules は「会社名」で以前から食い違っている。今回は触っていない
- 保存済み Run（mvp-11 / lint-01 / prelint-01）は experiment 階層が無い頃のもので、workspace の形が今と違う

## 2026-09-05 請求書管理の実験と公開（Phase 3）

2 題材目として `invoice-management` を追加し、保存済み Run と公開ページまで通した。設計データと評価器は Phase 2 で題材非依存にしてあるので、コードの分岐は増やさず契約とサイトの登録簿だけで足りた。

### 追加した契約と実験定義
- `design/examples/invoice-management.json`（一覧 5 列、状態 8 件、`lint` と `evaluation` を含む）と `experiments/invoice-management/{manifest.json, brief.md, prompt.md, starter/}`
- 一覧の列は 請求書番号（`isRowHeader`）/ 顧客名 / 発行日 / 金額 / ステータス。ステータスは 下書き・送付済み・入金済み・期限超過
- 顧客名と会社名はすべて架空。実在する企業名・人名は使っていない
- ルート は `/invoices` と `/invoices/:invoiceId`（HashRouter）。`sampleParams` の請求書 ID は架空の `invoice_2026_0142`

### invoice-01 の結果（2026-09-05、claude-opus-5、Claude Code 2.1.261）

| | baseline | harness |
| --- | --- | --- |
| status | completed | completed |
| typecheck / lint / test / build | すべて passed | すべて passed |
| 設計ルール | 合格 11 / 違反 12 / 要確認 5 | 合格 22 / 違反 1 / 要確認 5 |
| 費用 (USD) | 5.69 | 10.21 |
| 所要 (ms) | 1031164 | 1753682 |
| ターン数 | 60 | 105 |

- 費用は `events.jsonl` 末尾の `result` イベントの `total_cost_usd`。`run.json` に usage 欄は無い。`experiment:review` の AI レビュー呼び出しの費用はどこにも記録されない
- harness の唯一の違反は `component.table.columns`。account-management の mvp-11 harness も同じルールを同じ形の証跡で落としており、Phase 3 の退行ではない（この行は当初「評価器側の限界」と書いていたが誤り。Phase 4 の「`component.table.columns` は評価器の限界ではなかった」で撤回した。生成コード側で直せる違反）
- 隔離チェックは baseline / harness とも `repoPathMentions` 0。harness の `markerMentions.evaluate-experiment` 4 は `packages/eslint-plugin-atlas/src/index.mjs` のコメント（「評価器(scripts/evaluate-experiment.mjs)がこれを使う」）が plugin の tgz ごと workspace へ入るためで、評価器そのものは渡っていない
- パイプラインは `docs/EXPERIMENTS.md` の順で measure → evaluate → capture → review → compare → sanitize。`harness-corrected` と `refine` は 3 本目の有料 run になるので回していない

### サイト統合
- `src/data/runs.ts` を題材ごとの登録簿 `experimentRuns` に作り替えた。表示名・パス・スクリーンショット置き場・評価・比較を 1 エントリにまとめ、比較ページ / サンプルページ / Play ページはすべてここから引く。既存の名前（`comparison` など）は account-management のエイリアスとして残した
- 比較ページ（`/examples/<slug>/results`）に「比較する題材」の切り替えを追加。「同じモデルでの比較」は `sameModelRuns` を持つ題材だけに出す
- サンプルナビに「例：請求書管理」を追加。「生成結果の比較」は 1 項目のままにして、`alsoActiveOn` で請求書の結果ページでも選択中として扱う
- `play-invoice-atlas.html` / `play-invoice-baseline.html` と `src/play/invoice-{atlas,baseline}.tsx` を追加し、vite の入力に登録。`PlayPage` は題材ごとに状態一覧と HTML 入口を持つ
- `bundle:check` は 17 assets / 16 MiB で通った。請求書 baseline の CSS は account baseline と内容が同じでハッシュが重なり、1 ファイルに畳まれている

### 検証
- `pnpm demo:check` 緑（design:check / theme:check / design:conformance / runs:check / skills:check / public:audit / links:check / typecheck / lint / test:run / build / bundle:check）
- `pnpm test:run` → 31 files / 350 tests 緑
- `pnpm test:e2e` 緑。請求書の比較ページ、題材の切り替え、`/play/invoice-management` の Drawer とエラー表示を追加した

### 残る限界
- `pnpm public:audit --experiment invoice-management --pair invoice-01` は落ちる。`listRequiredArtifacts` が `harness-corrected/design-evaluation.json` を必須にしているが、invoice-01 は harness-corrected を回していない。`demo:check` が呼ぶ既定の `public:audit` は通る
- `design:conformance` の既定は account-management / mvp-11 のままで、請求書は対象外
- `scripts/verify-site.mjs` の「導入方法が縦3件」の判定が `.setup-card` を全ページから数えており、MCP クライアントのカード 2 枚を足した時点から 5 件になって落ちていた（Phase 3 以前からの壊れ）。`.setup-grid .setup-card` に絞って直した

## Phase 4: 顧客管理に「顧客を追加」を足して再 run（2026-09-05）

顧客管理の題材に集合画面からの追加操作を足し、契約・starter・サイトを揃えたうえで有料 run を 1 ペア回した。生成コードは直していない。

### 契約と実験定義の改訂
- `experiments/account-management/brief.md`: 対象外から「顧客の追加」を外し、集合画面の見出し操作から追加フォームを開いて保存する要件を足した。Drawer という語は出していない（baseline に実装手段を漏らさないため）
- `manifest.json`: `requiredStates` に `create-open` を追加して 9 件
- `design/examples/account-management.json`: 見出し操作の構成を改訂し、`componentUsage` に `component.button`（追加操作）と `component.drawer`（作成と編集を兼ねるフォーム）を追加。`lint.forbiddenText` から「顧客を追加」を外した
- `design/schemas/example.schema.json`: 上記 2 つの `$defs`（`createActionUsage` / `formDrawerUsage`）を追加。ルール数は 28 のまま増やしていない
- `starter/src/fixtures.ts` に `createCustomer` を追加。`deleteCustomer` と同じ同期の結果ユニオンで、`simulateFailure` を持つ
- `prompt.md` は題材非依存の書き方なので変更なし

### 基準 Run の設定を 1 か所に出した
- `design/conformance-target.json` と `scripts/conformance-target.mjs` を新設。`design:conformance` のバイト一致と `scripts/rules-method.test.mjs` の method 宣言テストが同じ 1 本を見るようにした。`--experiment` / `--pair` / `--mode` で一時的に上書きできる
- 中身は `account-management / mvp-11 / harness-corrected` のまま。create-01 の harness は違反 2 件あり、違反ゼロを求める既存のガードが正しく弾く。ガードは緩めていない

### create-01 の結果（2026-09-05、claude-opus-5）

| | baseline | harness |
| --- | --- | --- |
| status | completed | completed |
| 設計ルール | 合格 12 / 違反 11 / 要確認 5 | 合格 21 / 違反 2 / 要確認 5 |
| typecheck（サイト側の厳格設定） | failed | failed |
| lint / test / build | すべて passed | すべて passed |
| 費用 (USD) | 6.88 | 14.22 |
| 所要 (ms) | 1074494 | 2011574 |
| ターン数 | 86 | 152 |

- harness の違反 2 件は `component.table.columns` と `business.customer-name`。後者は会社名の `TextField` に `isRequired` が無く、必須であることが読み上げに乗らない。lint-01 / mvp-11 / prelint-01 では通っていた退行で、baseline は通している
- baseline の違反 11 件は component.approved / component.usage / component.table.columns / token.radius / navigation.link-semantics / layout.grouping / layout.collection-toolbar / layout.back-navigation / layout.narrow / action.confirmation / a11y.focus-management
- 費用は 2 本で 21.10 ドル。harness は事前見積り（1 本 6〜11 ドル）を超えた
- 実在する企業名・人名は無い。画面に出る 4 社は starter の fixtures から引き継いだもので、エージェントが足した名前はテストファイル内だけ（架空社名と `example.com` のアドレス）

### `component.table.columns` は評価器の限界ではなかった（前回報告の訂正）
- 前回この違反を「評価器側の限界」と書いたが、調べたところ誤りだった。撤回する
- 判定は `scripts/evaluate-experiment.mjs` の `evaluateTableContract` が、列の値一致・Header と Row の列定義共有・`tabular` 適用の 3 条件を見る。`normalizeColumn` は `isRowHeader` と `tabular` も比較対象に含める
- create-01/harness の `CustomerListPage.tsx` の列配列は id と順序こそ example と一致するが、`companyName` の `isRowHeader: true` と `lastContactedAt` の `tabular: true` を持たず、Row が列定義を map していない。どれも生成コード側で直せる
- 実際、lint-01/harness、prelint-01/harness、mvp-11/harness-corrected はこのルールを通している。落ちているのは create-01 と invoice-01 と mvp-11 の harness、および全 baseline
- ただし評価器の失敗メッセージは誤解を招く。列順が合っていても「期待する列順: …」を出すため、列順を確かめたエージェントは「合っている」と判断して先へ進みかねない。メッセージ文言を変えると保存済み評価とのバイト一致が崩れるので今回は直していない

### 評価器が見ていない退行
- create-01 の harness は `<Drawer.CloseTrigger />` をラベル無しで置いたため、閉じるボタンの読み上げ名が HeroUI 既定の英語 "Close" になっている。lint-01 と invoice-01 は日本語ラベルを渡していた
- 閉じる操作のラベルを見る設計ルールが無いので評価は合格のまま通る。`business.customer-name` と同じく「前の run では出ていた a11y 属性が今回落ちた」形

### サイト側の対応
- Play の入口（`src/play/atlas.tsx` / `baseline.tsx`）と `src/data/runs.ts` の顧客管理ペアを lint-01 から create-01 へ切り替えた。`sameModelRuns`（prelint-01 と lint-01）は比較材料としてそのまま残す
- `PlayPage` の状態一覧に「追加を開く」（`create-open`）を追加。この状態はスクリーンショットを撮っていない。capture が Drawer 画面では `invalid-*` の状態しか扱わないため
- README の件数と `--pair` を create-01 に更新。`HarnessPages.tsx` の説明文も同じ run を指すよう直した

### tsconfig を 3 分割した（判断が必要な箇所）
- create-01 の生成コードは `noUncheckedIndexedAccess` の下でエラーを出す。Play 画面はこの生成コードを取り込むので、切り替えた時点で `pnpm typecheck` が落ちた
- ただし内訳は baseline 側だけ。baseline は `CustomerCreateModal.tsx` `customerService.ts` `CustomerListPage.tsx` のアプリコード 3 件、harness は `customerFlows.test.tsx` の 4 件のみで、テストファイルは Play が読み込まない。つまり分割が要ったのは baseline のためで、どちらのアームもこのフラグを知らされていないが、harness のアプリコードはたまたま満たしていた
- `tsconfig.app.json` に `exclude: ["src/play"]` を足し、`tsconfig.play.json`（同フラグを off、`exclude: []` が必須。`exclude` は `extends` で継承されるため）を新設して `tsconfig.json` の references に追加した
- 生成コードを直す・`tsc -b` をやめる・Play を lint-01 に戻す、はいずれも採らなかった。lint-01 に戻すと新しい「追加を開く」が動かない
- 取り消すなら 3 ファイルを戻すだけで済む
- 後日案: starter の tsconfig に `noUncheckedIndexedAccess` を入れて次の run から両アームに同じ条件を課し、通ったら `tsconfig.play.json` の上書きを消す。記録済みの run の条件を後から変えたくないので今回はやっていない

### E2E のロケータを実装依存から構造依存に変えた
- `scripts/verify-site.mjs` の顧客管理ブロックが、閉じるボタンを「編集を閉じる」という lint-01 固有のラベルで、エラー表示を「メールアドレスの形式を確認してください。」という lint-01 固有の文言で探していた。どちらも設計契約が定めていない文言で、create-01 は別の言い回しを選んだため落ちた
- `[role='dialog'] [data-slot='drawer-close-trigger']` で引き、アイコンのみ・幅 24〜48px・読み上げ名が空でないこと、を確かめる形にした。読み上げ名は「空でない」までで、"Close" を許容値として書き込むことはしていない
- エラー表示はメールアドレス欄の `aria-invalid` と `[data-slot='field-error']` の本文が空でないことで確かめる
- 請求書ブロックは通っているので触っていない。ただし同じ形の脆さが残っており、請求書を再 run すると同じ壁に当たる

### create-01/harness-corrected の結果（2026-09-06、claude-opus-5）

| | harness | harness-corrected |
| --- | --- | --- |
| status | completed | completed |
| 設計ルール | 合格 21 / 違反 2 / 要確認 5 | 合格 23 / 違反 0 / 要確認 5 |
| run.json の checks | typecheck と design-rules が failed（lint / test / build は passed） | typecheck / test / build / design-rules すべて passed |
| 費用 (USD) | 14.22 | 4.96（生成 3.35 + refine 1.61） |
| 所要 (ms) | 2011574 | 454356（生成 249611 + refine 204745） |
| ターン数 | 152 | 88（生成 55 + refine 33） |

- 事前見積りは約 11 ドルだったが、実際は 4.96 ドル
- エージェントのパスは 2 回走った。指摘 3 件が 1 パスで片付いたわけではない
  - 1 パス目（`experiment:run --mode harness-corrected`、55 ターン / 3.35 ドル）で `business.customer-name` と閉じるボタンの読み上げ名が解消。`CustomerFormDrawer.tsx` の会社名 `TextField` に `isRequired`、`Drawer.CloseTrigger` に `aria-label`（一覧は「追加を閉じる」、詳細は「編集を閉じる」）が入った。`component.table.columns` は「列の値は一致」「tabular列の適用あり」まで進んだが「HeaderとRowが同じ列定義を参照していません」が残り、`22 passed / 1 failed / 5 review`
  - 2 パス目（`experiment:refine`、33 ターン / 1.61 ドル）が残った 1 件を直した。編集したのは `CustomerListPage.tsx` 1 ファイルだけで、列定義を定数にして Header と Row の両方から参照する形にし、`isRowHeader: true` と `tabular: true` を載せた。ここで `23 passed / 0 failed / 5 review`
  - `refine` はまず評価だけ走らせ、違反が 0 なら追加パスをせず抜ける作り（`scripts/refine-experiment.mjs`）。今回 `refinement-events.jsonl` が残っているのは、1 パス目のあとに違反が 1 件残っていた証拠
- AI レビューの所見は baseline / harness と同じで、`a11y.error-recovery` と `state.failure` が concern。レビューへ渡すのが `default` 状態の 2 枚だけなので、エラー状態が写っていないことによるもの。3 アームで同じなので退行ではない
- 実在する企業名・人名は無い。fixtures の 4 社は架空社名、アドレスはすべて `example.com`

### VALIDATION.md に人が書き足した行（開示）
- `harness-corrected` の入力は `VALIDATION.md` 1 本という約束なので、機械が書いた内容と人が足した内容を分けて残す
- 機械が書いたのは `component.table.columns` と `business.customer-name` の 2 件。閉じるボタンの英語読み上げ名を見る設計ルールが無いため、3 件目は自動では出てこない
- 人が足したのは次の 3 か所。いずれも「どう直すか」ではなく「何が観測されるか」を足したもの
  - `a11y.control-name` の FAIL ブロック全体（`Drawer.CloseTrigger` にラベルが無いこと）
  - `component.table.columns` の証跡 1 行（列の id と順序は合っており、欠けているのは `isRowHeader` と `tabular`）
  - 見出しの件数を 2 failed から 3 failed へ
- 生成コードは人が触っていない。`VALIDATION.md` は run 後に元へ戻した

### capture が前のターゲットに引きずられていた
- `pnpm experiment:capture` が harness-corrected で落ちた。閉じるボタンの `boundingBox()` が 30 秒待って失敗する
- 原因は生成コード側でも読み上げ名でもない。capture は 1 枚のページを使い回してターゲットを順に開くが、4 枚目（詳細のモバイル）と 5 枚目（詳細の `invalid-email`）は route が同じで、変わるのはハッシュ内のクエリだけ。`page.goto` が同一文書内のフラグメント遷移になり、`CustomerDetailPage` が作り直されない。状態は `useState` の初期値だけで決まるので Drawer が開かないまま
- 3 通りの実測で切り分けた。新しいページで直接開くと dialog は 1 件、capture と同じ順で開くと 0 件、同じ順に `page.reload()` を挟むと 1 件
- mvp-11 が同じ capture を通っていたのは、あの run のエージェントが `[customerId, detailState]` を依存に持つ `useEffect` で状態を同期していたから。契約が求めていた挙動ではなく偶然
- `scripts/capture-experiment.mjs` に `page.reload()` を足し、どのターゲットも直前のターゲットに左右されず撮れるようにした。撮る状態が「前に何を撮ったか」で変わるのは検査側の脆さなので、生成コードではなく capture を直した

### Play の状態切り替えが同じ理由で壊れていた
- 公開中のサイトでも同じことが起きていた。`PlayPage` の iframe は `src` のハッシュだけが変わるため、詳細画面の中で状態を切り替えても画面が作り直されない
- 実測: `invalid-email` から「編集を開く」へ切り替えてもエラー表示が残り、「削除を確認」へ切り替えても削除ダイアログではなく編集 Drawer が出たままだった。別 route の「通常」を経由すれば直る
- 既存の E2E は mode の切り替え（HTML エントリが変わる＝本当に読み込み直す）しか見ていなかったので気づけなかった
- `scripts/verify-site.mjs` に、同一 route のまま `delete-confirm` へ切り替えて `[role='alertdialog']` が出て `drawer-close-trigger` が消えることを確かめる assert を先に足し、落ちることを確認してから直した
- 直したのはサイト側のコードで、`<iframe key={frameSrc}>` を付けて要素ごと作り直す形にした。生成コードには触っていない。請求書の Play も同じ実装なので一緒に直る

### 基準 Run と既定 pair の切り替え
- `design/conformance-target.json` を mvp-11/harness-corrected から create-01/harness-corrected へ。`pnpm design:conformance` は `23 passed / 5 review` で緑
- `scripts/audit-public-data.mjs` と `scripts/preview-experiment.mjs` の既定 pair を mvp-11 から create-01 へ。どちらもコメントで「既定は掲載中の Run に合わせる」としているのに、Phase 4 でサイトを create-01 へ移したあとも mvp-11 のままだった
- `src/data/runs.ts` の `RunComparison` 型は `reveal` / `checks` / `review` の `corrected` を必須として推論していた。create-01 に修正 Run が入ったことで、修正 Run を持たない invoice-01 が代入できなくなり `tsc` が落ちた。3 か所の `corrected` を任意にした
- README の件数を mvp-11 の頃と同じ形に戻し、「Harness 初回が 21 pass / 2 fail / 5 review、修正すると 23 pass / 0 fail / 5 review」とした。`experiment:preview` の例にも `--mode harness-corrected` を足した
- Play の入口（`src/play/atlas.tsx`）が読むのは harness のままにした。invoice-01 も harness を読んでおり、サイトのどの画面にも修正アームを描く仕組みが無いため

### 検証
- `pnpm demo:check` 緑。`design:conformance` は `Design conformance OK (account-management/create-01/harness-corrected): 23 passed / 5 review`、`test:run` は 31 files / 350 tests、`bundle:check` は 20 assets / 17 MiB
- `pnpm test:e2e` 緑
- `pnpm public:audit --experiment account-management --pair create-01` 緑（491 text files / 7 required artifacts）
- Phase 4 の前半で書いた「`demo:check` が `design:conformance` で止まる」「`public:audit --pair create-01` が落ちる」は、この節で解消した

## Phase 5: run の手数を減らす（2026-09-07）

create-01 の `events.jsonl` を分類したところ、harness の 148 手のうち 99 手が API 調査だった。手数を減らす狙いで契約側に 3 つ手を入れ、有料 run 1 本で効果を測った。

### 何を変えたか

- **API シートを作った**。`scripts/build-components-api.mjs` が `design/components/*.json` と `node_modules/@heroui/react` の型定義から `design/components-api.md` を生成する。承認済み 15 部品ごとに import 文、下位コンポーネント、主要 prop と型、variant と size、最小の JSX 例、Atlas 側の制約を 30 行以内で載せる。生成物は commit し、`pnpm design:check` が stale を検出する。`scripts/design-catalog.mjs` に `design.components-api` として登録したので harness の `HARNESS_RESOLVED.json` から辿れる。`DESIGN.md` にも「部品の API は `design/components-api.md` を見る。`node_modules` は探索しない」の 1 行を足した。baseline には渡らない
- **検証コマンドを 1 本にした**。starter に `pnpm check`（`scripts/check.mjs`）を足し、lint、typecheck、test:run を順に走らせて失敗をまとめて報告する。`prompt.md` と `skills/atlas-design-system/SKILL.md` に「画面が仕上がった時点で一度だけ実行し、編集のたびに個別実行しない」と書いた。`prompt.md` は顧客管理と請求管理の両方を変えたので、次の請求管理の run は invoice-01 と `promptSha256` が変わる。`run-experiment.mjs` の checkCommands は触っていない
- **starter に `src/test-setup.ts` を置いた**。ResizeObserver、matchMedia、scrollIntoView を補い、vitest の `setupFiles` に登録した。両アームが毎回同じものを書いていた手間が消える。顧客管理と請求管理の両方に入れた

### API シートの例を lint で検証している

例が契約違反の書き方を教えると、run はそれを写して落ちる。そこで `scripts/components-api.test.mjs` に 3 種類の検査を足した。

- 例に出るタグが実在すること。`X.Y` は X の下位一覧に、単独タグは `@heroui/react` の named export にあること
- 例の `variant` と `size` が承認済みの値で、載せる先のタグも合っていること。Atlas の variant が HeroUI のどの prop に載るかは `componentApiSpecs` が持つ（Alert は `status`、AlertDialog は `AlertDialog.Backdrop`）
- Drawer、AlertDialog、Table の例を 1 画面に組んで `atlas/focus-management`、`atlas/action-confirmation`、`atlas/link-semantics` を実際に走らせること

いずれも「わざと壊した入力を渡すと落ちる」対の test を置いて、検査が空振りしていないことを確かめてある。この検証で実際に 3 か所直した。Drawer の例に `Drawer.Trigger` が無く `Drawer.CloseTrigger` に表示テキストが入っていた点、Table の例のオブジェクト名が Link でなかった点、AlertDialog の Footer が `AlertDialog.CloseTrigger` で Button を包んでいた点。逆に `AlertDialog.Trigger` の内側に Button を置く形は違反ではない。`action-confirmation.mjs` の `noButton` は Button が無いときに出るので、入れ子は必須。ここは将来「直さない」こと。

### fast-01 の結果（2026-09-07、claude-opus-5、harness のみ）

手数は `events.jsonl` の `tool_use` を分類して数えた。優先順は write > verify > node_modules-types > lint-plugin-source > contract-read > heroui-docs > other で、1 手に 1 ラベルを付ける。

| | create-01 harness | fast-01 harness |
| --- | --- | --- |
| tool_use | 148 | 35 |
| num_turns | 152 | 37 |
| 所要時間 | 33.5 分 | 12.2 分 |
| 費用 | 14.22 USD | 4.33 USD |
| 設計ルール | 21 pass / 2 fail / 5 review | 23 pass / 0 fail / 5 review |

内訳は次のとおり。

| カテゴリ | create-01 | fast-01 |
| --- | --- | --- |
| node_modules の型を読む | 59 | 1 |
| HeroUI skill の doc を読む | 22 | 8 |
| lint plugin の実装を読む | 18 | 3 |
| 契約を読む | 20 | 10 |
| 検証する | 13 | 4 |
| コードを書く | 9 | 6 |
| その他 | 7 | 3 |

API 調査（上 3 つの合計）は 99 手から 12 手へ減った。fast-01 は 6 手目で `design/components-api.md` を読み、以降 HeroUI の型定義を探しに `node_modules` へ入っていない。実際に `node_modules` を開いたのは lint ルールの実装を読んだ 30〜32 手目だけである。表の「node_modules の型を読む 1」は 28 手目の `find . -path ./node_modules -prune ...` で、分類がコマンド文字列の部分一致なので拾っているだけで、中身は読んでいない。

品質は落ちていない。fast-01 は修正 run を挟まずに 23 pass / 0 fail / 5 review に達した。これは create-01 が harness（21/2/5）のあと `experiment:refine` を回してようやく届いた水準と同じである。review 5 件の AI 判定も create-01/harness-corrected と完全に一致し、`a11y.control-name`、`a11y.color-only`、`color.semantic` が pass、`a11y.error-recovery` と `state.failure` が concern だった。concern 2 件はどちらもスクリーンショットに正常系しか写っていないことが理由で、両 run に共通する。

ただし create-01 と fast-01 の間では API シート、`pnpm check`、`test-setup.ts` の 3 つを同時に変えており、run は 1 本ずつの N=1 である。効果の切り分けはカテゴリ別の内訳（`node_modules` の型読みが 59 手から 1 手）に頼っている。

### 事前の見積もりとのずれ（訂正）

着手前は「API 調査 40 手、検証 40 手、コード生成 60 手」と見ていたが、分類すると API 調査 99 手、検証 13 手、コード生成 9 手だった。検証とコード生成はもともと手数を食っていない。`pnpm check` の一本化は狙いどおり検証を 13 手から 4 手に減らしたが、効果の大半は API シートによるものである。

harness が Read や Edit を使わず Bash のヒアドキュメントで全文を書き直していた点も、手数の観点では問題ではなかった。harness の書き込みは 9 手、baseline は Write と Edit で 28 手を使っている。全文書き直しのほうが手数は少ない。

### `pnpm check` は baseline にも届く

`prompt.md` は両アーム共通なので、`pnpm check` を使えという指示は baseline にも渡る。starter の `package.json` も共通である。API シートだけが harness 限定で、検証の一本化は条件差にならない。次に baseline を回すときは baseline 側の検証手数も減る前提で比較すること。

### 次に効きそうなところ

- fast-01 の 27 手目から 32 手目までの 6 手は `atlas/link-semantics` の失敗原因を探すのに使われた。Cell の中身を `renderCustomerCell` という別関数へ切り出したため、AST を見る lint ルールが `Table.Cell` 直下の `Link` を見つけられなかった。描画結果は正しい。API シートの Table 節に「Cell へ直接書く（別関数へ切り出すと lint が見つけられない）」と書き足した。ルール側を局所ヘルパーまで追うようにする案もある
- lint plugin の実装を読む手は 18 手から 3 手に減ったが、まだ残っている。ルールの違反メッセージだけで直し方が決まるようにすれば、この 3 手も消える見込み

### 手を入れなかったもの

- **refine run の入力**。「VALIDATION.md 全文ではなく失敗ルールと証拠と該当ファイルだけを渡せないか」という論点だが、`evaluate-experiment.mjs` の `toMarkdown` はすでに `status === "failed"` だけを書き出しており、各項目に証拠（`src/pages/InvoiceDetailPage.tsx 1:37` のような位置つき）と修正指示と lint ルール ID が入っている。invoice-01 の harness では 11 行 445 バイト、12 件失敗した baseline でも 84 行 5212 バイトである。渡しすぎてはいない。加えて `check-design-conformance.mjs` は保存済み `design-evaluation.json` の `rules` を `JSON.stringify` でバイト比較するため、ルール結果に項目を足すと基準 run の照合が壊れる。変更しない
- **starter の `scripts/check.mjs` にある `node:process` と `node:console` の明示 import**。当初 `no-undef` に引っかかると見て入れたが、typescript-eslint の recommended が `no-undef` を 0 にしているので実際には不要である。害はないので残したが、読んで不思議に思ったらこの理由。
- **編集ツールの使い分けを prompt で指定すること**。原因は prompt にない。両アームとも 1 手目から Bash で始めており、baseline は実装に入る 42 手目で Read と Edit に切り替え、harness は 123 手目まで調査が続いたため切り替えないまま終わった。ツール名を書けば Claude 固有の指示になり、CLI 中立という方針から外れる。上に書いたとおり手数の面でも損はしていないので、報告だけに留める

### 検証

- `pnpm demo:check` 緑。`design:conformance` は `23 passed / 5 review` のまま変わっていない。`test:run` は 33 files / 377 tests
- `pnpm test:e2e` 緑
- `src/data/runs.ts` と Play は create-01 のまま触っていない。fast-01 はサイトに載せていない
- `pnpm public:audit` の既定 pair は create-01 なので、fast-01 の成果物は必須アーティファクトに要求されない
