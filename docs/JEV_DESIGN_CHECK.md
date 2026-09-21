# Jev によるデザインチェックの検討

更新日: 2026-09-20（保存済み 13 本の結果を見て、Jev に聞くルールを 2 件に絞った）

## Jev の役割

画像を見るレビュアーの代わりにはしない。コードが抜き出した材料のうち、意味の判定が要るものだけを確率で返させる。いま聞くのは、danger の色を使った操作のラベルと、失敗時の処理のコードの 2 つ（2026-09-20 に絞った。下の「聞くルールを絞った経緯」）。名前や文字があるかどうかはコードで決め、色値、数値、レイアウトの判定は今の `evaluate-experiment.mjs` と `measure-experiment.mjs` に残す。

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

`design/rules.json` の `method: "ai-review"` は 5 件ある。最初は 5 件とも Jev に聞いたが、保存済み 13 本の結果を見て 2 件に絞った（下の「聞くルールを絞った経緯」）。

| 対象 | 判定のしかた | Jev に渡すもの | 質問（Noul） |
| --- | --- | --- | --- |
| `color.semantic` | Jev | 操作のラベルと、danger を含む variant や color | その操作は削除などの破壊的な操作ではないか |
| `state.failure` | Jev | 失敗時の処理のコードと、その state を表示している JSX | 操作の失敗か。toast だけか。画面を閉じるか |
| `a11y.control-name` | コード | — | — |
| `a11y.color-only` | コード | — | — |
| `a11y.error-recovery` | 画像レビューと人の判断 | — | — |

質問（instructions と criteria）は英語で書き、state には日本語の文言をそのまま入れる。

## 聞くルールを絞った経緯

13 本に書いた判定（Jev の呼び出し 224 回）を集計すると、確率が動いたのは 2 ルールだけだった。

| ルール | 呼び出し | 確率の実際 | 判断 |
| --- | --- | --- | --- |
| `color.semantic` | 26 | 12 本は 0.03〜0.05。`invoice-01/baseline` だけ 0.39 | 残す。Run の差が確率に出た |
| `state.failure` | 28 | 0.085〜0.229 | 残す。画像では写らない失敗処理をコードから判定できた |
| `a11y.error-recovery` | 125（全体の 56%） | 大半が 0.28〜0.45 の中間。0.8 を超えたのは `customerService.ts:76` の 1 件だけで、これは確認ダイアログの文言を誤って拾ったもの | 外す。実行時に決まる文言が読めず、人の判断に落ちるだけだった |
| `a11y.control-name` | 16 | 全件 0.04〜0.19 | 外す。名前があるかどうかはコードで決まる |
| `a11y.color-only` | 29 | 全件 0.04〜0.17 | 外す。文字があるかどうかはコードで決まる |

`a11y.control-name` と `a11y.color-only` を Jev に回していたのは、`{customer.companyName}` のように式で文字を出す箇所を読めなかったため。実際に聞いていた 45 件はすべてこの形で、文字が出ないケースは 1 件もなかった。そこで式と spread は「文字が出る」側に倒し、判定器の note に「式や spread で渡すものの中身は見ていない」と書き残すことにした。aria-label のない `Drawer.CloseTrigger` は、以前からコードで違反にしている。

絞り込みで呼び出しは 224 回から 54 回（1 Run あたり 4〜5 回）に減った。

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
- 保存済み 13 本の `judgments.json` に判定を書いた（2026-09-19、Jev の呼び出し 224 回、入力 128,706 トークン、約 0.005 ドル）。`judgments.json` は追記だけなので、同じ Run にもう一度書くと判定が重なる
- 聞くルールを `color.semantic` と `state.failure` の 2 件に絞り、13 本の判定を消して書き直した（2026-09-20、呼び出し 54 回、入力 31,453 トークン、約 0.0013 ドル）。しきい値（`design/harness-policy.json`）は変えていない
- aria-label のない `Drawer.CloseTrigger` は、Jev に聞かずコードで違反にした。`design/components-api.md:149` が aria-label を必須にしているため。判定器（`scripts/judges/questions.mjs`）の中の扱いで、`design/rules.json` は変えていない
- `/harness` に「モデルで判定する仕組み」の節と、Jev を入れた構成の図を足した
