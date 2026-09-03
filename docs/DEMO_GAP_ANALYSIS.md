# 登壇デモの不足洗い出し（PdEConf 2026・9/5）

> 2026-09-03 追記: Presenter（`/demo/runs/account-management`）は廃止し、Design Harnessの説明（`/harness`）と生成結果の比較（`/examples/account-management/results`）へ置き換えた。以下の Presenter、Scene、1280×720 に関する記述は履歴として残している。

作成: 2026-09-03（木）。対象: Product Engineering Conference 2026、9/5（土）14:10〜14:40 Hall A、30分トーク、会場はオフライン開催。セッション「デザインハーネス：AIが生成する"デザイン"の妥当性を、誰がどう担保するのか」。

依頼は「実演に必要な機能・仕様が他にあるか」の洗い出し。ここでは修正はしていない。残り1営業日（金曜）なので、項目は「金曜に何を決めるか」で分けた。

## 現状（9/3 に確認済み）

- main はクリーン。`pnpm demo:check` は12段すべて通過。バンドルも予算内。
- Presenter（`/demo/runs/account-management`）4場面、Play（`/play/account-management`）8状態は動く。オフライン再生の手順は `docs/PRESENTATION_CHECKLIST.md` にある。
- 本番ホスティングは無い。会場はローカルの `pnpm dev` か `pnpm build && pnpm preview` で見せる前提。
- Google Drive と Notion を検索したが、PdEConf 用のスライドは見つからなかった（7/9 イベントの司会スライドと事例集のみ）。スライドとデモの対応は未確認。

## 最優先の点

### 1. タイトルの問い「誰がどう担保するのか」が画面に出ていない

検証ルールは「自動検証 23 / AIレビュー 5 / 人の判断 0」の3区分で管理されていて、`/rules` にはラベルもある。しかし Presenter の結果場面は合格・違反・要確認の合計数だけで、誰が判定したかが見えない。「人の判断」は0件で、`MVP.md` が約束する decision artifact（人の判断の記録）も無い。

対応の目安: Scene 4（結果）か Scene 3 に「自動 23 / AI 5 / 人 0」の内訳を出す。1〜2時間。人の判断の中身は土曜までに作れないので、舞台で明言する。

舞台での言い方: 「機械で判定できるものは自動、画面を見ないと分からないものは AI レビュー、体験の違和感は人。今日のデモでは人の枠は空けてある。何を人に残すかを決めるのがハーネス設計の仕事」。

### 2. Scene 3 の「4件の設計違反 → 指摘を返して直す → 0件」が、保存されている修正ログと一致しない

確認した事実:

- Scene 3 は harness の評価結果（failed 4）をそのまま「4件の設計違反」と表示し、次の段で「設計違反 0件」と表示している。
- 保存されている修正ログ（`harness-corrected/refinement-events.jsonl`）では、エージェントが受け取った VALIDATION.md は「22 passed / 1 failed / 5 review」で、直したのは component.usage（Toolbar 未使用）の1件だけ。
- その修正は 9/2 10:51 に実行された。このとき VALIDATION.md はすでに28ルール分（22+1+5）あり、他の3ルール（action.confirmation、a11y.focus-management は 8/31、component.table.columns は 9/2 00:48 にコミット）は refine の前から存在していた。
- それなのに現在の harness の評価では、その3ルールも failed になっている（合計 failed 4）。同じソースが 10:51 には通っていた3ルールで今は落ちる理由は未確認。評価器の判定が後から変わった可能性が高いが、確認していない。corrected は4件とも passed。
- Scene 3 の「4件」は評価結果から計算しているが、次の段の「設計違反 0件」は固定文字列。パイプラインを再実行して corrected に違反が残っても画面は 0 と出る。
- `changes.diff` は 1.1MB あり、`dist/` や `design/` の契約ファイルも含む。「エージェントの修正差分」としてそのまま見せられる状態ではない。

つまり「4件が返されて0件になった」を1本のログで証明できないし、1件と4件の差を今は説明できない。質疑で「4件はどう直ったのか」と聞かれると答えに詰まる。

金曜の選択肢:

- (a) 文言だけ直す（30分）。「検査で違反を検出 → 指摘を返す → 再検査で0件」までにして、返した件数は表示しない。ログは見せない。
- (b) 現行の評価器で修正ループを再実行する（半日）。下の「金曜のパイプライン1回」を参照。

## 金曜のパイプライン1回で同時に片づくもの

`experiment:refine`（Codex に VALIDATION.md を渡して直させる）→ `experiment:capture`（スクショ）→ `experiment:review`（Codex にスクショを AI レビューさせる）→ `experiment:compare` を1回通すと、次の3つが同時に揃う。

1. 上記2の「4件→0件」が、現行ルールでのログと一致する。
2. AI レビューの「要確認 5件」の中身が改善する。現在の所見を読むと、a11y.error-recovery と state.failure が concern なのは「スクショに失敗状態が写っていない」から。Play は `state=failure` を描けるので、capture に失敗状態を含めれば AI が判断できる。
3. エージェントの発言（VALIDATION.md を読んで方針を立てる日本語のメッセージ）が最新ルールで保存され、Scene 3 に表示できる材料になる。

やる前に確認すること:

- `experiment:refine` が mvp-11 を上書きせず、別の pair（例: mvp-12）または別の出力先に書けるか。`experiment:evaluate` に `--out` があることは確認したが、refine は未確認。
- `DEMO_PROGRESS.md` の厳守事項どおり、mvp-11 に対して evaluate / measure を単発で再実行しない（review 欄が消える）。
- Codex CLI と gpt-5.4 が必要なのでネットワークが要る。会場では走らせない。

## 判断表

| 区分 | 項目 | 何が足りないか | 壊れる主張 | 目安 | 直さない場合に舞台で言うこと |
| --- | --- | --- | --- | --- | --- |
| A | 判定者の内訳表示 | 自動/AI/人の数が画面に無い | タイトル | 1〜2h | 上記1 |
| A | Scene 3 の件数 | ログと不一致 | 実演の信頼性 | 0.5h か 半日 | 上記2 |
| A | 修正ループの動画 | 未収録。会場でライブ AI は使わない方針 | 「実際のワークフロー」 | 1〜2h | Scene 3 の静止表示で説明 |
| A | 聴衆に配る URL | 公開先が無い | 事後の到達 | 0.5h〜 | 「後日公開」と言う。`docs/PUBLICATION_POLICY.md` を先に確認 |
| B 金曜午後があれば | パイプライン1回 | 上記 | 実演の信頼性、検証の層 | 半日 | 文言修正 (a) で代替 |
| B | AI レビュー所見の表示 | 5件の note が画面に無い | 「誰が担保」 | 1〜2h | 口頭で「AI が見た所見が5件保存されている」 |
| B | 修正前 harness.png | `public/` にあるが未使用 | 検証の層の見せ方 | 0.5〜1h | baseline と corrected の2枚で通す |
| B | フィードバックの層 | 「結果→制約」の例が画面に無い。component.usage は Toolbar の逸脱を見つけて追加した実話が git にある | 4層の4つ目 | 1h（静的カード） | 口頭で経緯を話す |
| B | Play のモバイル幅切替 | 390 / 320px を DevTools を開かずに切り替える手段が無い | 幾何計測の説明 | 1〜2h | 計測値はスライドの数値で |
| B | 修正差分の見せ方 | `changes.diff` を `src/` だけに絞った表示が無い | 「人は直していない」 | 1h | 見せない |
| C 舞台で対象外と言う | 人の判断の記録 | human 0件、decision artifact 無し | タイトル | 土曜までは不可 | 上記1 |
| C | ライブ AI 生成 | 方針として不使用 | 「実際の」 | ― | 「保存済み Run を再生している」と最初に言う |
| C | 探索型ハーネス | note 記事の「これから」。デモ範囲外 | ― | ― | 締めで一言 |
| D イベント後 | DH-252 進行設定 | 10分/20分/30分の切替が無い | ― | ― | ― |
| D | DH-262 404 画面 | `*` はトップへリダイレクト | ― | ― | ― |
| D | mvp-05 の旧 PNG | `public/` に残存 | ― | ― | ― |
| D | DH-271/272 公開環境 | 未設定 | ― | ― | ― |
| D | 評価器の日本語ハードコード | 汎用化は DH-302 時 | ― | ― | ― |

## ライブ実演の可否

- 安全: `pnpm experiment:evaluate --pair mvp-11 --mode harness --out <scratch>`。オフラインで決定的、数秒。ただし出力先を必ず scratch にする。
- 安全: Play の8状態の操作、Presenter の4場面。
- 危険: `experiment:refine` と `experiment:review`。Codex とネットワークが要る。金曜に収録して動画で見せる。

## 会場で確認すること

`docs/PRESENTATION_CHECKLIST.md` に既にある項目に加えて:

- Hall A のプロジェクタ解像度。Presenter は 1280×720 でのみ収まりを検証している。
- 動画を再生する場合、音声とフルスクリーンの切替をリハーサルする。

## 用語

- Run / pair: 同じ Issue から生成した baseline（設計指示なし）と harness（Atlas 適用）の一組。mvp-11 が現在の保存済み Run。
- evaluate: 生成コードを28ルールで自動判定し、VALIDATION.md と design-evaluation.json を書く。オフラインで動く。
- measure: Playwright で 1440 / 390 / 320px の幾何を計測する。
- capture: スクショを撮る。review: そのスクショを Codex に見せて AI レビューする。
- refine: VALIDATION.md をエージェントに渡して修正させ、harness-corrected を作る。
- compare: 3モードの結果を comparison.json にまとめる。Presenter はこの JSON と各モードの評価結果を読んでいる。
