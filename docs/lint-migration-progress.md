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
