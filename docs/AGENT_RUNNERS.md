# Agent runner の切り替え

実験スクリプト（run / refine / review）は AI エージェント CLI を直接呼ばず、`scripts/agent-runners/` の adapter 経由で呼ぶ。CLI 固有のフラグはすべて adapter に閉じている。

## 使い方

```bash
# 既定は codex
pnpm experiment:run --pair "$PAIR_ID" --mode baseline

# Claude Code へ切り替える（--runner か環境変数 AGENT_RUNNER）
pnpm experiment:run --pair "$PAIR_ID" --mode baseline --runner claude
AGENT_RUNNER=claude pnpm experiment:run --pair "$PAIR_ID" --mode harness
```

実験の切り替えは `--experiment <name>`（既定は `account-management`）で、runner の指定とは独立している。

runner は最初の `experiment:run` で `run.json` の `environment.runner` に記録され、refine / review / compare はその値を使う。同じ pair で runner や CLI バージョンが違うと compare が止まる。

## adapter の形

| フィールド | 役割 |
| --- | --- |
| `id` | `run.json` に記録される名前 |
| `command` | 実行ファイル名 |
| `defaultModel` | `--model` 未指定時のモデル |
| `versionArgs` | `cliVersion` を取るための引数 |
| `buildExecArgs({ model, prompt, images, json, cwd })` | 1 回の実行引数を組み立てる |
| `prepareWorkspace(workspaceDir)` | 任意。workspace 生成後の CLI 固有の準備 |

## 各 adapter の注意

- codex: 画像は `-i`、prompt は `--` の後ろに置く。イベントは `--json` の JSONL。
- claude: 画像フラグが無いので、パスを prompt に書いて Read させる。skills は `.agents/skills/` を `.claude/skills/` へ symlink して読ませる。`--setting-sources project` でユーザー設定を持ち込まない。

## 既知の差分

- `sanitize-run-artifacts.mjs` の skills 読み取りの伏せ字処理は codex の `item.type === "command_execution"` 形式を前提にしている。claude の stream-json は形が違うため、文字列走査による伏せ字は効くが、この項目専用の処理は動かない。
- claude runner で実際に完走させた実績はまだ無い。dry-run と単体テストのみ確認済み。
