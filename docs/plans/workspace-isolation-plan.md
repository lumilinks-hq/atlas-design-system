# 実験 workspace の隔離（workspace 脱出の修正）計画

作成: 2026-09-04（Fable が計画、Opus が実装）

## 背景

- 実験 workspace は `<repo>/.runs/account-management/<pair>/<mode>/` に作られ、`node_modules` はリポジトリ root の `node_modules` への symlink（`scripts/run-experiment.mjs` L67-69）。
- エージェントは `ls -la` で親リポジトリの絶対パスを知り、prelint-01 では採点器 `scripts/evaluate-experiment.mjs` を読みに行った。lint-01 harness も `ls ..` で 1 回覗いている。
- このままでは baseline / harness の比較数字を「Harness の効果」と言えない。

## 方針（決定済み）

1. **workspace をリポジトリの外へ出す**。既定は `~/.cache/design-harness/runs/account-management/<pair>/<mode>`。環境変数 `DESIGN_HARNESS_RUNS_DIR` で上書き可。root がリポジトリ内に解決された場合は throw。
2. **symlink を廃止し、workspace ごとに本物の `pnpm install`** を行う。
3. **隔離の証拠を run.json に残す**。sanitize 前の `events.jsonl` をリポジトリ絶対パスで走査し、件数を記録する。
4. 保存済み run（`experiments/**/runs/**`）と `hashHarnessContext` は触らない。

## 調査で確定している事実

- starter `package.json` の依存バージョンは root と全件一致（react 19.2.8、vite 8.2.2、vitest 4.1.11、typescript 6.0.3 など）。よって本物 install でも従来と同じバージョンが入る。
- starter には eslint 系 devDeps が無い。root は eslint 10.9.1 / @eslint/js 10.0.1 / globals 17.11.0 / typescript-eslint 8.68.0。
- starter に `.gitignore` は無い（`git add .` が node_modules を丸ごとコミットしてしまう）。root に `.npmrc` は無い。
- `pnpm-workspace.yaml` は `packages/*` のみ。starter は非メンバー。workspace 内で pnpm を動かす際は `--ignore-workspace` を付ける（親の pnpm-workspace を拾わないため。ただし workspace が repo 外なら元々拾わない）。
- `packages/eslint-plugin-atlas` は private、`dependencies: {"@eslint/css": "^1.4.0"}`、peer `eslint >=9`。未公開なので harness workspace へは `pnpm pack` した tarball を `file:` 指定で渡す。
- `design/schemas/run.schema.json` は `additionalProperties: false`。`isolation` を optional で追加する必要がある。`scripts/validate-runs.mjs` は既存 run（isolation なし）を通し続けること。
- `.runs` を参照する箇所: `scripts/run-experiment.mjs:25,42,97`、`refine-experiment.mjs:16`、`capture-experiment.mjs:18`、`measure-experiment.mjs:121,215`、`finalize-experiment.mjs:11`、`evaluate-experiment.mjs:913`。ドキュメント: `README.md:102`、`docs/PUBLICATION_POLICY.md:13`、`DEMO_PROGRESS.md:68`。`scripts/audit-public-data.mjs:8` の禁止文字列 `.runs` は残す。
- sanitize（`scripts/sanitize-run-artifacts.mjs` の `sanitizeText`）は `rootDir` → `<repo>`、`/Users/<name>` → `<home>` に置換する。新 runs root も `<workspace>` に置換する行を追加する（`<home>` より先に適用）。

## 実装ステップ（TDD: 各ステップで失敗するテストを先に書く）

### 1. パスヘルパー `scripts/workspace-paths.mjs`（+ `.test.mjs`）

```js
export function runsRootDir(env = process.env)  // DESIGN_HARNESS_RUNS_DIR ?? join(homedir(), ".cache", "design-harness", "runs")。rootDir 配下なら throw
export function pairWorkspaceDir(pairId, env)    // runsRootDir/account-management/<pair>
export function workspaceDir(pairId, mode, env)  // pairWorkspaceDir/<mode>
```

テスト: 既定値が home 配下、env 上書き、repo 内を指すと throw、相対パスは絶対化。
上記 7 スクリプトの `.runs` 組み立てをこのヘルパーに置換。ログ文言（`Prepared ...`、`workspaceが既に存在します`）は実パスを出す。

### 2. starter の依存と .gitignore

- `experiments/account-management/starter/package.json` devDependencies に `eslint 10.9.1`、`@eslint/js 10.0.1`、`globals 17.11.0`、`typescript-eslint 8.68.0`（root と同じ固定バージョン）。
- `experiments/account-management/starter/.gitignore` を新規: `node_modules`、`dist`、`.harness`。
- starter に残っている gitignore 済みの `node_modules/` ディレクトリは無視してよい（cp でコピーされるが、install が上書きする。気になるなら cp の filter で除外）。→ **cp の filter で `node_modules` を除外する**こと。

### 3. run-experiment.mjs の install 手順

順序: copy → (harness なら syncHarnessContext + prepareWorkspace) → **plugin を pack して file: 依存を patch** → `pnpm install` → hash → run.json → git init → agent。

- `nodeModulesPath` のチェックと `symlink` を削除。
- harness / harness-corrected: `pnpm pack --pack-destination <workspace>/.harness` を `packages/eslint-plugin-atlas` で実行し、workspace の package.json に `"eslint-plugin-atlas": "file:./.harness/eslint-plugin-atlas-<ver>.tgz"` を devDependency として追加（この patch は `syncHarnessContext` に置くのではなく、run-experiment 側の小さな関数 `addHarnessLintDependency(workspaceDir, tarballPath)` にして単体テスト）。baseline には入れない（対照群を汚さない）。
- `pnpm install --prefer-offline --ignore-workspace` を workspace cwd で実行。timeoutMs は付けない（初回は 30 秒を超える）。失敗したら throw。
- harness-corrected は harness を cp する際に `node_modules` と `.git` を除外し（現行どおり）、その後 install をやり直す。`.harness` の tarball は cp されるのでそのまま使える。
- `--dry-run` でも install までは行う（隔離の検証をお金をかけずに行うため）。
- `pnpm pack` が private パッケージで動くこと、tarball 経由で `@eslint/css` が解決されることを実機で確認する。

### 4. 隔離スキャン `scripts/workspace-isolation.mjs`（+ `.test.mjs`）

```js
export function scanIsolation(eventsText, { rootDir, markers = ["evaluate-experiment"] })
// → { repoPathMentions: n, markerMentions: { "evaluate-experiment": n } }
```

- run-experiment で `sanitizeRunArtifacts` の**前**に events.jsonl を読んで `run.isolation = scanIsolation(...)` を記録。
- `design/schemas/run.schema.json` に optional `isolation` オブジェクト（`repoPathMentions: integer`、`markerMentions: object<string,integer>`、additionalProperties false）。
- `scripts/validate-runs.mjs` が既存 run（isolation 無し）を通すことをテストで確認。

### 5. sanitize の追加

- `sanitizeText` に `runsRootDir()` → `<workspace>` の置換を追加（`/Users/<name>` → `<home>` より前）。テストを `scripts/sanitize-run-artifacts.test.ts` に追加。

### 6. ドキュメント

- `README.md`、`docs/PUBLICATION_POLICY.md`、`DEMO_PROGRESS.md` の `.runs` 記述を新しい場所と env 上書きの説明に更新。
- `docs/lint-migration-progress.md` に「2026-09-04 workspace をリポジトリ外へ隔離」の節を追記（何を変えたか、検証方法、残る限界: `--dangerously-skip-permissions` のエージェントは絶対パスを推測すれば読める。壁ではなくポインタの除去）。
- root `.gitignore` と `eslint.config.js` の `.runs` は残して害なし。

## 検証（お金をかけない）

```bash
pnpm exec vitest run scripts packages
pnpm experiment:run -- --mode baseline --pair iso-check --dry-run
pnpm experiment:run -- --mode harness  --pair iso-check --dry-run
# 各 workspace で
ls -la <workspace>            # node_modules が symlink でない
realpath <workspace>          # リポジトリの外
pnpm lint && pnpm test:run && pnpm build   # baseline は base config、harness は Atlas plugin が読み込まれる
pnpm demo:check               # CI と同じ 12 段
```

`experiment:run` の引数の受け渡し方は root `package.json` の scripts を確認する。検証後は `iso-check` の workspace と `experiments/account-management/runs/iso-check` を削除する（`experiments/**/runs/` に dry-run の run.json を残さない）。

## この変更で扱わないこと

- prelint-01 / lint-01 の再実行（1 本約 11 ドル。ユーザーが別途判断）。
- Claude Code の読み取りを cwd に閉じ込める設定（別調査）。
- processor postprocess が fatal メッセージを落とす問題。
