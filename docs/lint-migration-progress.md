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
