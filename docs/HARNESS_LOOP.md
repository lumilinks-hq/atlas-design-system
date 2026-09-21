# 検査結果から次の工程を決めるループ

更新日: 2026-09-19（段階 1、2 完了。段階 3 は判定器と保存済み 13 本への書き込みまで。段階 4 の図を差し替え、Jev の図を追加）

## 目標

検査の結果を見て、コードが次の工程を「修正」「人の判断」「次工程へ」のどれかに振り分ける。

- 状態確認は二つある。コードによる検査（数値、必須項目、完了条件）と、モデルによる判定（文脈、意味、修正の必要性）
- モデルの判定結果は合否には使わない。振り分けの材料にする
- 判定するモデルは交換できる部品にする（Jev、軽量 LLM など）。Jev については [JEV_DESIGN_CHECK.md](./JEV_DESIGN_CHECK.md) を参照
- 振り分けの基準（しきい値、修正回数の上限、人の承認が要る項目）は、人がファイルに書いて決める

## 図と今の実装の対応

| 図のノード | 今の実装 | 足りないもの |
| --- | --- | --- |
| 方針・制約・権限、判断基準 | `design/rules.json`（severity と method） | しきい値、修正回数の上限、承認が要る項目 |
| コードで検査 | `scripts/evaluate-experiment.mjs`、`scripts/measure-experiment.mjs` | なし |
| モデルで判定 | `scripts/review-experiment.mjs`（画面画像）、`scripts/judges/`（段階 3。Jev でソースを判定） | `a11y.error-recovery` は Jev から外し、画像レビューと人の判断に戻した（実行時に決まる文言が見えない）。refine の中ではまだ呼ばない |
| コードが次の工程を決定 | `scripts/harness-dispatch.mjs`（段階 1）。refine が使う（段階 2） | なし |
| 要修正 → LLM が修正 → 再検査 | `refine-experiment.mjs`、`correction-prompt.mjs` | 1 回の実行で修正は 1 回。続けるには人が再実行する |
| 判断・根拠不足 → 人の判断・追加の根拠 | `decisions.json` と `pnpm experiment:decide`（段階 2）。失敗状態の画面も撮る。判定の確率と材料不足は `pnpm experiment:judge`（段階 3） | なし |
| 必須条件・承認確認 → 次工程へ | `compare-experiment.mjs` の入力一致の確認 | 承認の記録 |
| 現在の状態 | Run ディレクトリの `run.json`、`design-evaluation.json`、`measurements.json`、`source/`、`judgments.json`（保存済み 13 本に Jev の判定を書いた） | 人の判断（`decisions.json`）はまだどの Run にもない |

## 追加するファイル

| ファイル | 中身 | 書く人 |
| --- | --- | --- |
| `design/harness-policy.json` | しきい値、修正回数の上限、人の承認が要る項目 | 人 |
| `<run>/judgments.json` | ルールごとのモデル判定（違反の確率、根拠が足りるか、使ったモデル） | 判定スクリプト |
| `<run>/decisions.json` | ルールごとの人の判断（採用、差し戻し、保留、理由、判断した人、日時） | 人（CLI 経由） |
| `<run>/next-step.json` | 振り分けの結果 | 振り分けの関数 |

`design-evaluation.json` には足さない。`design:conformance` は `summary` と `rules` の一致だけを見ているが、evaluate を再実行すると `review` 欄を含めてファイルごと書き直されるため、別ファイルにする。

「権限」は判断した人を記録するだけにとどめる。認可の仕組みは作らない。

## 振り分けの規則（案）

ルールごとに次の順で決める。

1. 人の判断がある: 採用なら通過、差し戻しなら修正、保留なら人の判断
2. コードの検査で failed: 修正。回数の上限に達していれば人の判断
3. コードの検査で review（コードでは決められない）: モデルの判定を見る
   - 判定がない、または根拠が足りない: 人の判断（根拠不足）
   - 違反の確率がしきい値以上: 修正
   - 確率が中間: 人の判断
   - 確率が下限以下: 通過。ただし承認が要る項目なら人の判断
4. コードの検査で passed: 通過

全体の次の工程は、修正が 1 件でもあれば「修正」、なければ未判断の人の判断が 1 件でもあれば「人の判断」、どちらもなく実行時の検査（型、テスト、ビルド）も通っていれば「次工程へ」。

今の LLM レビューは確率を返さないので、段階 1 では concern を「中間」、pass を「下限以下」として扱う。

## 段階

| 段階 | 作るもの | API キー | 費用 | 状況 |
| --- | --- | --- | --- | --- |
| 1 | `harness-policy.json` と `decisions.json` のスキーマ、振り分けの純粋関数とテスト、次の工程を表示する CLI | 不要 | なし | 完了 |
| 2 | refine が振り分け結果の「修正」を使う。回数の上限。人の判断を記録する CLI。失敗状態の画面を巡回に加える | 不要 | 修正を実行すると LLM の利用料 | 完了（実際の修正はまだ回していない） |
| 3 | 判定の adapter（`scripts/judges/`）。LLM 版と Jev 版を作り、`judgments.json` に書く。保存済み Run で精度を確かめる | Jev 版は必要 | Jev はほぼ無料 | 判定器、CLI、保存済み 13 本での確認と書き込みは完了。refine からはまだ呼ばない |
| 4 | `/harness` ページの図と、比較ページでのルールごとの次の工程の表示 | 不要 | なし | 図は完了（次の工程の図と Jev の図）。比較ページは未着手 |

段階 1 は保存済みの Run 13 本だけでテストできる。Run の再生成はしない（1 本 11 ドル）。

## 触らないもの

- 保存済み Run の `design-evaluation.json` と、`design:conformance` の検査内容
- 保存済み Run のディレクトリ。`pnpm experiment:next` は既定で標準出力に出すだけで、ファイルを書かない（`run.json` の `artifacts` と食い違うため）。`next-step.json` を書くのは、refine を実行したときと `--write` を付けたときだけ
- `run-experiment.mjs` の構成。run-experiment は振り分けを使わない
- `design/rules.json` のスキーマ。承認などのフィールドをルールに足すかは段階 4 の後に決める

## 決めたこと（段階 1）

振り分けは `scripts/harness-dispatch.mjs` の純粋関数 `dispatch(input, policy)` にする。ファイルは CLI が読み、関数はデータだけを受け取る。

入力:

| 項目 | 形 | 出どころ |
| --- | --- | --- |
| `rules` | `{id, status, evidence}[]` | `design-evaluation.json` の `rules` |
| `checks` | `{name, status, exitCode}[]` | `run.json` の `checks` |
| `judgments` | `{ruleId, probability?, verdict?, evidenceSufficient?, model, judgedAt}[]` | 段階 1 は `review.findings` を CLI が写す。段階 3 から `judgments.json` |
| `decisions` | `{ruleId, decision, reason, decidedBy, decidedAt, iteration?}[]` | `decisions.json`。保存済み Run にはない |
| `iteration` | refine が修正をかけた回数 | `run.json` の `artifacts` にある `refinement-events*.jsonl` の数（段階 2） |

方針（`design/harness-policy.json`）: `thresholds.fix`、`thresholds.pass`、`maxFixIterations`、`requireApproval`（ルール ID）、`requiredChecks`（typecheck、test、build）、`decidedBy`、`decidedAt`。`design-rules` は評価結果と重なり、`lint` は一部の Run にしかないので `requiredChecks` に入れない。

出力: `{step, rules: [{ruleId, step, reason}], checks: [{name, step, reason}]}`。`step` は全体が `fix`、`human`、`advance`、ルールと検査が `fix`、`human`、`pass`。`reason` は英字の固定コードにして、日本語は画面側で当てる。

判定の帯は judgments に書かず、関数の中で決める。確率があればしきい値で、なければ verdict で concern を中間、pass を下限以下とする。

計画から詰めた点:

1. 実行時の検査（型、テスト、ビルド）が failed なら修正。上限に達していれば人の判断。`requiredChecks` にあるのに記録がなければ人の判断（根拠不足と同じ扱い）
2. 中間は `thresholds.pass < p < thresholds.fix`。`p >= fix` は修正、`p <= pass` は通過
3. 人の判断が差し戻しでも、修正回数の上限に達していれば人の判断に戻す（修正が止まらなくなるため）
4. automatic のルールが review を返した場合（`component.variants` の動的な variant、計測なしの `layout.grouping`）は判定器の対象外なので、判定なしとして人の判断になる

保存済み Run での期待値:

- failed が 0 の 4 本（create-01/harness-corrected、fast-01/harness、lint-01/harness、mvp-11/harness-corrected）は人の判断。`a11y.error-recovery` が画像レビューで concern のため（このルールは Jev に聞かない）
- failed がある 9 本は修正
- 次工程へ進む Run は保存済みの中にない。合成した入力でだけ確かめる

## 決めたこと（段階 2）

### 修正の回数

- 数えるのは refine がかけた修正だけ。`run-experiment` の harness-corrected が最初にかける修正は、比較の条件なので数えない
- 記録の名前は 1 回目が `refinement-events.jsonl` と `refinement-stderr.log`（保存済み Run と同じ）、2 回目からは `refinement-events.2.jsonl` のように回数を付ける。回数は `run.json` の `artifacts` にある `refinement-events*.jsonl` の数
- 上限は `maxFixIterations`（今は 2）。上限に達すると、修正になるはずの項目は人の判断（`iteration.limit`）になる
- refine は 1 回の実行で修正を 1 回だけかける。続けるかは、結果を見た人が再実行して決める

### 人の判断

- `pnpm experiment:decide --pair <pair> --rule <rule> --decision accept|reject|defer --reason "..." --by <役割名>` で `decisions.json` に追記する。既定の mode は harness-corrected。記録したあと、次の工程を表示する
- 判断には、そのときの修正回数を `iteration` として残す
- 差し戻しは、その後に修正を 1 回かけると使い終わる（`iteration` が今の回数より小さい差し戻しは見ない）。修正後の状態は、検査と判定、または新しい判断で決める。`iteration` のない差し戻しは 0 回目とみなす
- 採用と保留は、修正をかけても残る
- `--by` には OS のユーザー名ではなく役割名を書く。Run は公開するので、`audit-public-data.mjs` と同じ確認で手元のユーザー名やパスを拒否する
- `pnpm runs:check` が `decisions.json` をスキーマで確かめる

### refine の流れ

1. evaluate で検査をやり直し、`dispatch` で振り分ける
2. 修正でなければ、実行時の検査（型、テスト、ビルド）をやり直して記録する。新しく失敗していれば修正へ進む。そうでなければ `next-step.json` を書いて止まる
3. 修正なら、VALIDATION.md と振り分けの差を `NEXT_STEP.md` にしてワークスペースに置く。差は「追加で修正するルール」（人の差し戻し、違反の確率が高い判定）と「修正しないルール」（failed だが人が採用・保留した、または上限に達した）の 2 つ。差がなければ置かない（前回の分は消す）
4. `NEXT_STEP.md` を置いたときだけ、修正プロンプトの末尾に「修正する範囲は VALIDATION.md より NEXT_STEP.md を優先する」を足す。置かないときは生成時の修正と同じ文を使う
5. 修正のあと、検査と振り分けをやり直し、`next-step.json` を書く

`NEXT_STEP.md` は VALIDATION.md と同じく git に入れないので、`changes.diff` には出ない。

evaluate は `design-evaluation.json` の `review` を消すので、refine の中では判定がない。そのため refine の振り分けが「次工程へ」になることはない。review のルールは判定がないとして人の判断になり、capture と review のあと `pnpm experiment:next` で振り分け直す。

終了コードは、修正したときは今までどおり（修正の失敗、実行時の検査の失敗、failed のルールが残る、のどれかで 1）。修正しなかったときは、上限で止まった場合だけ 1。

人が採用した failed のルールがあっても、`run.json` の `design-rules` は failed のまま残す。検査の記録はコードの結果で、振り分けはその上の層のため。

### 失敗状態の画面

- 撮影の対象に `failure`（詳細画面、デスクトップ）を加えた。Drawer を重ねる画面で撮る
- 入力検証（`invalid-*`）は修正 Run だけを撮る。Drawer の閉じるボタンが契約どおりかを確かめるため。`failure` はこの確認がないので全モードで撮る。修正 Run だけに画像を足すと、比較ページのレビューの材料がモードでそろわなくなるため
- 失敗の表示が Drawer の中とは限らないので、`failure` では閉じるボタンを確かめない
- review には既定の状態と失敗状態の画面を渡し、プロンプトに画像ごとの画面と状態を書く。`state.failure` と `a11y.error-recovery` を既定の画面だけで判定していたため
- 保存済み Run には失敗状態の画像がない。review はファイルがない画像を飛ばす

## 決めたこと（段階 3）

### 判定器

- `scripts/judges/` に adapter を置き、`index.mjs` の `resolveJudge(id)` で引く。`jev`（TypeSafe の Jev）と `review`（画面画像の LLM レビューの所見を写すだけ。比べるために使う）
- `pnpm experiment:judge --pair <pair> [--mode <mode>] [--judge jev|review] [--write]`。既定は jev。mode を省くと 3 つとも見る
- 判定するのは `design-evaluation.json` で review になったルール。振り分けがモデルの判定を見るのはこれだけ。判定器が扱わないルール（`component.variants`、`a11y.error-recovery` など）は「判定していない」と表示する
- 既定では表示だけ。`--write` で `judgments.json` に追記し、次の工程を表示する。`run.json` は書き換えない
- review 版は `--write` を使えない。振り分けは所見を `design-evaluation.json` から直接読むので、写すと二重になる
- `judgments.json` には 1 つの判定器の結果だけを入れる。別の判定器で書こうとすると止める
- 判定にはそのときの修正回数を `iteration` として残す。振り分けは今の回数より前の判定を使わない（修正前のコードを見た判定のため）。同じルールでは `judgments.json` の最後の判定を LLM レビューより優先する
- 書く前に `audit-public-data.mjs` と同じ確認をする。細目の箇所は `App.tsx:92` のように source からの相対パスで書く

### Jev 版の聞き方

- ソースを丸ごと渡さない。`evidence.mjs` が JSX から操作要素、文字列、失敗時の処理を取り出し、`questions.mjs` がルールごとに質問を作る
- 1 箇所につき 1 回呼ぶ。質問はすべて「yes なら違反」の向きにそろえ、英語で書く。state には日本語の文言をそのまま入れる
- コードで決まるものは聞かない。`a11y.control-name` と `a11y.color-only` は全部コードで決める。aria-label がある、文字がある、部品の既定の名前がある（`SearchField.ClearButton`）、Field の Label が名前になる（`Select.Trigger`）、`{…}` や spread で文字を渡している。これらは確率 0 の細目として残し、見ていないものは note に書く
- ルールの確率は細目の最大。`details` に箇所ごとの確率を残す
- `state.failure` は「操作の失敗か」×「toast だけか」「画面を閉じるか」の大きいほう。`color.semantic` は「その操作は破壊的ではないか」の 1 問
- 聞く箇所がなければモデルに聞かず、材料不足（`evidenceSufficient: false`）にする。振り分けでは人の判断になる
- 失敗時の処理は 1 ルール 8 件まで聞く。超えた分は note に件数を書く
- `color.semantic` は variant か color が danger の操作だけを見る。CSS やクラスで付けた色は見ていない（note に書く）
- 同時に呼ぶのは 4 件まで。モデルは `jev-1.13.0` に固定し、応答のモデル ID を記録する。答えが欠けたら推測で埋めずに止める
- 保存済み 13 本をすべて判定すると 54 回呼ぶ（2 ルールに絞る前は 225 回）

### 鍵

- `.env.example` をまねて、リポジトリ直下に `.env` を作る。`.env` を読むのは `pnpm experiment:judge` だけ（`--env-file-if-exists`）
- 鍵がなければ Jev を呼ぶ前に止まる
- 鍵の形は公開されていないので、`sanitize-run-artifacts.mjs` は手元に設定された値そのものを伏せる。伏せられるのは鍵を読み込んだ実行の中だけで、`pnpm runs:sanitize` は鍵を読まない。今は鍵を書き出す処理がないので困らない。refine から Jev を呼ぶときに見直す

### 保存済み 13 本での確認（2026-09-19）

表示だけで確かめたあと、`pnpm experiment:judge --write` で 13 本の `judgments.json` に書いた。表は書いた値を、振り分けのしきい値（0.2 以下は通す、0.8 以上は修正）で数えたもの。画像レビューとの比較は、レビューのない prelint-01 の 2 本を除く 11 本。Jev の呼び出しは 224 回、入力 128,706 トークンで、費用は約 0.005 ドル。

| ルール | 通す | 人の判断 | 修正 | 画像レビューとの比較 |
|---|---|---|---|---|
| `a11y.control-name` | 12 | 0 | 1 | ほぼ同じ。mvp-11 の 3 本は画像レビューが「画像では名前を確かめられない」で concern。Jev はコードの aria-label を見て通す。修正の 1 本は create-01/harness の aria-label のない閉じるボタン（コードで違反） |
| `a11y.color-only` | 13 | 0 | 0 | 同じ。ただし invoice-01/baseline のモバイル一覧の色は CSS なので Jev には見えない（画像レビューは concern） |
| `color.semantic` | 12 | 1 | 0 | 同じ。invoice-01/baseline の「無効化」（danger）は 0.39 で人の判断（表示だけで確かめたときは 0.34） |
| `a11y.error-recovery` | 1 | 11 | 1 | 画像レビューはすべて concern（エラーの画面が写っていない）。Jev も多くは決めきれない |
| `state.failure` | 9 | 4 | 0 | 画像レビューはすべて concern（失敗の画面が写っていない）。Jev はコードを読んで判定できる。mvp-11/baseline は確認時の 0.188 から書き込み時に 0.205 になり、人の判断に移った |

直したこと（いずれもテストを先に書いた）。

- 再試行のボタンが Footer にあるのに見えていなかった。`footer` を添えると、ダイアログやドロワーの中のエラー表示は 0.75 前後から 0.5 未満に下がった。直す前は 3 本が修正（0.8 以上）に振り分けられていた。直したあとは 1 本で、それも下に書いた予備の文言
- lint-01/baseline で「削除を取り消すことはできません」をエラーと判定していた（0.865）。基準を足して 0.474 になった。この Run の最大値は別の Alert に移った
- aria-label のない `Drawer.CloseTrigger` は、Jev に聞かずコードで違反（確率 1）にした。`design/components-api.md:149` が aria-label を必須にしているため。HeroUI の既定名は英語の「Close」。確認時は 0.49 で人の判断だった。判定器の中の扱いで、`design/rules.json` と `design-evaluation.json` は変えていない

分かっている穴。

- 実行時に決まる文言（`{deleteError}` など）は中身が見えない。`a11y.error-recovery` の多くが人の判断になる理由。データの流れを追わないと分からないので、今は直さない
- 部品の外の文言は、どこに表示されるかを見ずに判定する。create-01/baseline の 0.853 は `customerService.ts:76` の `result.ok ? "変更を保存できませんでした。" : result.reason` の予備の文言で、ほぼ表示されない。表示先の `CustomerEditDrawer.tsx` は Footer に保存ボタンがある。書いた判定でも修正に振り分けられる
- 「成功なら return し、その後に失敗の処理を書く」形は失敗時の処理として拾えない。lint-01/baseline の `state.failure` が材料不足になった
- CSS やクラスで付けた色は見ていない

### 聞くルールを 2 件に絞った（2026-09-20）

上の 13 本を見ると、確率が動いたのは `color.semantic` と `state.failure` だけだった。そこで Jev に聞くのはこの 2 件にし、残りは判定のしかたを変えた。

- `a11y.control-name` と `a11y.color-only` は、Jev に聞いていた 45 件がすべて `{customer.name}` のように式で文字を出す箇所で、文字が出ないケースは 1 件もなかった。式と spread は「文字が出る」側に倒し、コードで決めることにした
- `a11y.error-recovery` は呼び出しの 56%（125 回）を占めながら、大半が 0.28〜0.45 の中間で 13 本中 11 本が人の判断になっていた。判定器から外し、画像レビューと人の判断に戻した
- 呼び出しは 224 回から 54 回、費用は約 0.005 ドルから約 0.0013 ドル（入力 31,453 トークン）になった。`judgments.json` は追記だけなので、13 本をいったん消してから書き直した

| ルール | 判定 | 通す | 人の判断 | 修正 | 材料不足 |
|---|---|---|---|---|---|
| `a11y.control-name` | コード | 12 | 0 | 1 | 0 |
| `a11y.color-only` | コード | 13 | 0 | 0 | 0 |
| `color.semantic` | Jev | 12 | 1 | 0 | 0 |
| `state.failure` | Jev | 11 | 1 | 0 | 1 |
| `a11y.error-recovery` | 判定しない | — | — | — | — |

Jev は同じ入力でも答えが少し動く。`color.semantic` は 13 本中 11 本が絞り込み前と同じ値で、invoice-01/baseline が 0.39 から 0.36、lint-01/baseline が 0.05 から 0.04 になった。`state.failure` は ±0.03 ほど動き、0.2 の境目にあった 2 本（create-01/harness は 0.221 から 0.192、mvp-11/baseline は 0.205 から 0.195）が通す側に移った。create-01/harness-corrected は 0.229 から 0.216 で人の判断のまま。材料不足の 1 本（lint-01/baseline）は絞り込み前と同じで、上の表では人の判断に数えていたもの。Run ごとの振り分け（修正 9 本、人の判断 4 本）は変わらない。

### まだやっていないこと

- 合成した例（名前のないアイコンボタン、「保存」の danger ボタン、文字のある Chip、toast だけの失敗処理）での確認
- refine の中で呼ぶこと。evaluate のあとに Jev 版を呼べば、refine の振り分けでも判定を使える

## 決めたこと（段階 4 の図）

`/harness` の「デモ画面の生成サイクル」（6 ステップ、違反数つき）を、「検査結果から次の工程を決める」の図に差し替えた。部品は `src/components/HarnessNextStep.tsx`（React Flow、10 項目、矢印 12 本）。

- 元の図の点線の枠「状態確認」は、枠ではなく 1 つの項目にして、そこからモデルとコードへ矢印を分けた
- 分岐の条件（要修正、判断・根拠不足、必須条件・承認確認、状態更新・再検査、判断・根拠追加）は項目にせず、矢印のラベルにした
- 項目は見出しだけにして、補足は図の下の表（図の項目／ファイルと役割）に書いた。`decisions.json` はまだリポジトリにないのでリンクにしない
- 「Jev／軽量LLMなど：交換可能部品」はページに書かない。書いた当時は Jev が未実装だった。Jev の仕組みは下の別の図にした
- ページには、振り分けの結果は `pnpm experiment:next` で表示するまでで、修正版の作成にはまだ使っていないと書いた。段階 2 のあと、refine が振り分けの「修正」で動くと書き換えた
- 狭い画面（800px 以下）は縦に並べ、分岐の 3 つだけ横に並べる。日本語の改行は `word-break: auto-phrase`（対応ブラウザだけ）

## 決めたこと（Jev の図）

`/harness` の「モデルで判定する仕組み」に、Jev を入れた構成の図を足した。部品は `src/components/HarnessJudge.tsx`（React Flow、11 項目、矢印 13 本）。次の工程の図と共通の部品は `src/components/StepFlow.tsx` に分けた。

- 入口は 3 つ。コードで検査、部品と文言を抜き出す、LLM が画面画像をレビュー。抜き出したものは、コードで決まるもの（0 か 1）と、Jev に聞くもの（違反の確率）に分ける
- 画像レビューから決定への矢印にはラベルを付けない。Jev の判定がないルールだけで使うことは、図の下の表に書いた
- 行き先のラベルは振り分けのしきい値（違反・0.8 以上、中間・材料不足、0.2 以下）
- 図の上の文は 3 段落。Jev の役割、コードと Jev の分け方、しきい値と鍵の扱い

