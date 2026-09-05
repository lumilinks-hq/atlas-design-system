# 比較実験の実行

保存済みRunを再実行・追加する手順。認証済みのAIエージェントCLIが必要です。既定は`codex`で、`--runner claude`または環境変数`AGENT_RUNNER`でClaude Codeへ切り替えられます（[`AGENT_RUNNERS.md`](./AGENT_RUNNERS.md)）。

## 前提

- `PAIR_ID`は新しい値にする。既存Runは上書きしない
- workspaceはリポジトリ外の`~/.cache/design-harness/runs/`に作られる。`DESIGN_HARNESS_RUNS_DIR`で変更でき、リポジトリ内を指すと実行を止める
- 依存はworkspaceごとに`pnpm install`する。生成物は公開対象に含まれない
- どのスクリプトも`--experiment <name>`で対象を選べる。省略時は`account-management`

Harness実行ではmanifestから`HARNESS.json`と`HARNESS_RESOLVED.json`を生成し、Agent Skillsをworkspaceの`.agents/skills/`へ配置します。AIは`DESIGN.md`を入口に、Pattern・Example・HeroUIコンポーネント契約・検証ルールをIDで解決します。Baselineには設計契約もSkillsも渡しません。

## 手順

```bash
pnpm experiment:run --pair "$PAIR_ID" --mode baseline
pnpm experiment:run --pair "$PAIR_ID" --mode harness

# 幾何計測（measurements.json）を先に取り、評価が実測値を参照できるようにする
pnpm experiment:measure --pair "$PAIR_ID"
pnpm experiment:evaluate --pair "$PAIR_ID" --mode baseline
pnpm experiment:evaluate --pair "$PAIR_ID" --mode harness

# 検査結果を入力に修正を依頼し、再評価まで行う
pnpm experiment:run --pair "$PAIR_ID" --mode harness-corrected
pnpm experiment:refine --pair "$PAIR_ID"

pnpm experiment:capture --pair "$PAIR_ID"
pnpm experiment:review --pair "$PAIR_ID"
pnpm experiment:compare --pair "$PAIR_ID"
pnpm runs:sanitize --pair "$PAIR_ID"
```

## 順序の注意

- `experiment:review`はスクリーンショットをAIレビューへ渡し、所見を`design-evaluation.json`の`review`欄へ保存する
- `experiment:evaluate`は`review`欄を含めて評価ファイルを作り直す。必ずreviewより前に実行し、review後に再実行しない
- `experiment:compare`は最後に実行する。所見を`comparison.json`へ転記する

## 生成コードを人が直さない

生成コードを人が直接直すと比較条件が崩れます。修正は`VALIDATION.md`を入力にした`harness-corrected`として別Runへ保存します。公開前の確認で新しい設計違反が見つかった場合も`pnpm experiment:refine`で追加の修正イベントとして保存します。

## 置き場所

| 対象 | パス |
| --- | --- |
| 実験の定義 | `experiments/<name>/manifest.json` |
| 保存Run | `experiments/<name>/runs/<PAIR_ID>/<mode>/` |
| workspace | `DESIGN_HARNESS_RUNS_DIR/<name>/<PAIR_ID>/<mode>/` |
