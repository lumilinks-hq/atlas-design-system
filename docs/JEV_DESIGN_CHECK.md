# Jev によるデザインチェックの検討

更新日: 2026-09-19（判定器を実装し、保存済み 13 本で画像レビューと比べて、判定を書き込んだ）

## Jev の役割

画像を見るレビュアーの代わりにはしない。コードが画面から抜き出したテキスト（ボタンやリンクの名前、エラー表示の文言、状態表示の文字）について、意味の判定だけを確率で返させる。色値、数値、レイアウトの判定は今の `evaluate-experiment.mjs` と `measure-experiment.mjs` に残す。

## Jev の仕様（2026-09-19 時点のドキュメント）

| 項目 | 内容 |
| --- | --- |
| モデル | `jev-1.13.0`（SDK の既定は `jev-latest`。しきい値を決めるなら ID を固定する） |
| 入力 | テキストのみ。画像は不可 |
| 上限 | 1 リクエスト 64k トークン。state と最も長い質問の合計が 32k トークン以内 |
| 料金 | 入力 100 万トークンあたり $0.042。出力は無料 |
| 速さ | 1 リクエスト約 100ms |
| 答えの形 | Noul（yes の確率）、Choice（選択肢と確率）、Score（段階と確率） |
| SDK | `@typesafe-ai/sdk` 0.6.0（Node.js 20 以上。版を固定して devDependencies に入れた）。鍵は `TYPESAFE_API_KEY`。429 や 5xx、接続の失敗は既定で 2 回まで再試行する。ブラウザでは使わない |
| 苦手 | 色値や数値の比較、数を数えること。英語が主で、日本語は精度が落ちる |

参照: https://docs.typesafe.ai/models.md 、 https://docs.typesafe.ai/sdk/javascript.md 、 https://docs.typesafe.ai/model-jaggedness/jev-1.13.md

## 使える箇所

`design/rules.json` の `method: "ai-review"` の 5 件と、ルールになっていない文言の規則が対象になる。

| 対象 | Jev に渡すもの | 質問の例（Noul） |
| --- | --- | --- |
| `a11y.error-recovery`、`state.failure` | failure 状態の画面の alert、toast、ボタンの文言 | 何が失敗したか書かれているか。再試行などの次の操作が画面に残っているか |
| `a11y.control-name` | アクセシビリティツリーのボタンとリンクの名前一覧 | この名前から操作の内容が分かるか（要素ごとに 1 問） |
| `a11y.color-only` | Chip などの状態表示の文字と色の指定 | 状態名が文字でも示されているか |
| `color.semantic` | 操作のラベルと、使っている色の token や variant の組 | 危険色を削除などの破壊的な操作以外に使っていないか |
| 文言（ルールなし） | ボタン、リンク、確認ダイアログの文言 | `button.json`、`alert-dialog.json`、`link.json` の requirements と `skills/ui-writing` に沿っているか |

質問（instructions と criteria）は英語で書き、state には日本語の文言をそのまま入れる。

## 置き場所

- `evaluate-experiment.mjs` には入れない。今の evaluate は ai-review の 5 件を常に review として返し、`design:conformance` は保存済み Run の結果との完全一致を求めている。ここに通信を伴う確率判定が入ると、`demo:check` と CI に鍵と通信が必要になる。
- Run ごとの `judgments.json` に書く。合否には使わない（今の扱いと同じ。MVP.md の「AIレビューは参考情報として表示し、合否判定には使わない」とも一致する）。
- 確率は、次の工程を選ぶ材料にする（[HARNESS_LOOP.md](./HARNESS_LOOP.md)）。

## Jev と無関係に先に直すこと

`a11y.error-recovery` と `state.failure` は、レビュー記録がある保存済み Run 11 件すべてで concern になっている。`review-experiment.mjs` は default 状態のスクリーンショットだけを渡し（47 行目）、`measure-experiment.mjs` も default と drawer-open しか巡回していない。failure 状態は `requiredStates` に入っているが、どちらも見ていない。生成画面によっては `?state=failure` だけでは表示されず、保存操作が要る。これを直さないと、どの判定器を使っても判定できない。

## 最初の一歩

パイプラインは変えず、保存済み Run で精度を確かめる。

1. `experiments/*/runs/*/*/source/` から、ボタン、リンク、aria-label、エラー表示の文言を抜き出す（ソースは 1 Run 30〜47KB。上限には収まるが、関係ない情報が多いと精度が落ちるので抜き出す）
2. ai-review の 5 件を Noul で聞く
3. 既存の verdict と比べる。例: `a11y.control-name` は mvp-11 の 3 件だけが concern。create-01 との差が確率に出るかを見る
4. 結果が使えるなら、review-experiment への組み込みを検討する

## 鍵の扱い

- `TYPESAFE_API_KEY` はこのリポジトリで初めてのサーバー側の鍵になる
- `.env` は利用者が自分で作る。`.env.example` に変数名だけ書く
- Node のスクリプトだけで使い、ブラウザには渡さない（DH-305 と同じ理由）
- 鍵の形式は公開されていないので、`scripts/sanitize-run-artifacts.mjs` は手元に設定された値そのものを伏せる

## 決めたこと

- Jev の確率は合否には使わず、次の工程（修正、人の判断、次工程へ）を選ぶ材料にする。振り分けの仕組みは [HARNESS_LOOP.md](./HARNESS_LOOP.md) にまとめた（2026-09-19）
- 判定の結果は `review.findings` ではなく、Run ごとの `judgments.json` に書く。evaluate を再実行すると `design-evaluation.json` の review 欄が消えるため
- 最初の一歩の 1、2 は `scripts/judges/` と `pnpm experiment:judge` で実装した。聞き方は [HARNESS_LOOP.md](./HARNESS_LOOP.md) の「決めたこと（段階 3）」
- 最初の一歩の 3 は終えた。結果は HARNESS_LOOP.md の「保存済み 13 本での確認」。mvp-11 の `a11y.control-name` は、画像レビューが「画像では名前を確かめられない」で concern にしたもので、Jev はコードの aria-label を見て 0.07 以下で通した。失敗の画面が写らない `state.failure` も、Jev はコードから判定できた。一方 `a11y.error-recovery` は、実行時に決まる文言が見えないので 13 本中 11 本が人の判断になる
- 保存済み 13 本の `judgments.json` に判定を書いた（Jev の呼び出し 224 回、入力 128,706 トークン、約 0.005 ドル）。`judgments.json` は追記だけなので、同じ Run にもう一度書くと判定が重なる
- aria-label のない `Drawer.CloseTrigger` は、Jev に聞かずコードで違反にした。`design/components-api.md:149` が aria-label を必須にしているため。判定器（`scripts/judges/questions.mjs`）の中の扱いで、`design/rules.json` は変えていない
- `/harness` に「モデルで判定する仕組み」の節と、Jev を入れた構成の図を足した
