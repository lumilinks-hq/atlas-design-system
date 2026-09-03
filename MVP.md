# Design Harness Demo MVP

> 2026-09-03 追記: Presenter（`/demo/runs/account-management`）は廃止し、Design Harnessの説明（`/harness`）と生成結果の比較（`/examples/account-management/results`）へ置き換えた。以下の Presenter、Scene、1280×720 に関する記述は履歴として残している。

## MVPの目的

カンファレンスとウェビナーで、次の流れを通信状態に左右されず説明できる状態を作る。

1. 同じ機能要件とスターターコードを二つの隔離環境へ渡す
2. 一方は要件だけ、もう一方は既存の設計ルールも参照してAIが実装する
3. 二つの初回実装へ同じ自動検証を実行する
4. 画面、コード、検証結果をラベルを伏せて比較する
5. Harness側は指摘をもとに修正する
6. 人が結果と根拠を確認し、次のルール改善候補を作る

公開サイトでは、デモが参照する設計ルール、HeroUIの利用仕様、画面パターン、検証方法を確認できるようにする。

## 成功の定義

MVPは、一覧と詳細に分かれた同じ「顧客管理」機能をDesign Harnessなし／ありで実際にAIへ実装させ、その保存済みRunを最初から最後まで比較できる状態を指す。Harness側が参照した設計情報は公開サイトから確認できる。

登壇者は、コードやターミナルを操作せず、画面上の「次へ」だけで次を説明できる。

- 要件と参照ルール
- 同じ条件から作られた二つの初回実装
- ラベルを伏せた画面比較
- 自動検証、AIレビュー、人の判断の違い
- Harness側が指摘を反映した修正版
- 変更差分と検証結果
- フィードバックの反映先

登壇中と公開サイトではライブAIを使わない。開発時に認証済みのCodex CLIから二つの実装を生成し、入力、実行記録、差分、検証結果、画面画像をRunとして保存する。Presenter modeは保存済みRunを読み、同じ操作から常に同じ結果を表示する。

## 対象利用者

### 登壇者

短い時間でDesign Harnessの考え方と実装例を説明する。途中から開始し、任意の段階で止め、初期状態へ戻せる必要がある。

### 参加者

登壇後に公開サイトを開き、デモで使われたルールと画面パターンを自分で確認する。

### リポジトリ閲覧者

設計情報の正本、検証処理、保存済みRunを確認し、自分のプロジェクトへ応用する方法を理解する。

## MVPに含める画面

### 公開デザインシステム

```text
/                     Atlas Design Systemの概要
/foundations          主要トークン
/components           MVPで使うHeroUIコンポーネント
/patterns/page-layout 再利用可能なページレイアウト
/examples/account-management  顧客管理の実装例
/rules                ルール一覧と検証区分
```

公開デザインシステムはHeroUIの公式ドキュメントを複製しない。このプロジェクトでの使い方だけを掲載する。

トップページには顧客管理など、特定プロダクトの機能を置かない。トップページはAtlas Design Systemが定義するFoundations、Components、Patterns、Rulesを案内する。再利用可能な構造はPatterns、具体的な機能はExamplesとPresenter modeへ分離する。

### Presenter mode

```text
/demo
/demo/runs/account-management
```

Presenter modeは会場で一目で理解できる4場面で構成する。

1. 作りたい機能のIssue
2. IssueへAtlas Design Systemを適用する流れ
3. AIが設計を読み、生成し、検査結果で補正する過程
4. Issueだけで生成した画面と、Atlasを適用して補正した画面の比較

各場面は一つの主張に絞り、サイドパネルや細かなログを常時表示しない。

## MVPシナリオ

### 題材

営業・CS担当者が顧客一覧から会社を選び、基本情報と対応状況を確認・更新する。取引が終了した顧客は削除する。

### 画面と機能

- 顧客一覧へ会社名、担当者、ステータス、最終対応日を表示する
- 選択中の顧客について連絡先と対応メモを表示する
- 顧客情報の編集Drawerを開ける
- 会社名、担当者、メールアドレス、ステータスを変更できる
- 会社名の必須入力とメールアドレスの形式を検証する
- 空状態、保存中、成功、失敗を表示する
- 保存後に顧客詳細を更新する
- 詳細画面から顧客を削除できる。確定前にAlertDialogで対象と結果を確認し、成功でToastを表示して一覧へ戻る

### 保存する状態

- Default
- Empty
- Drawer open
- Invalid email
- Loading
- Success
- Failure
- Delete confirm

## Runの進行

### Scene 1 Issue

依頼内容、利用者、主要操作、完了条件をIssue形式で表示する。

### Scene 2 設計を適用

IssueへAtlas Design Systemのpattern、example、component、ruleをID参照で加え、AIが読む実装コンテキストを作る流れを表示する。

### Scene 3 生成と検査

設計を読む、画面を作る、同じ検査をかける、指摘を返して直す、の4工程を保存Runの数値とともに表示する。

### Scene 4 結果を比較

Issueだけで生成したBaselineと、Atlasを適用して検査後に補正した画面を並べる。初回出力の見た目ではなく、既存ルールで検査し直せることを結論にする。

## 設計情報の正本

```text
DESIGN.md
design/
  tokens.json
  theme.css            # tokens.jsonから生成（pnpm theme:generate）
  layout.css           # レイアウト実装部品の正本CSS
  component-theme.css
  components/          # button、table、drawer、alert-dialogなど14契約
  patterns/
    page-layout.json
    spacing-layout.json
  examples/
    account-management.json
  rules.json
  schemas/             # tokens、component、pattern、example、rules、experiment、runの7 schema
experiments/
  account-management/
    manifest.json
    brief.md
    prompt.md
    starter/
    runs/
      mvp-11/          # 保存済みRunのペア（旧pairはアーカイブ）
        comparison.json
        baseline/      # run.json、design-evaluation.json、measurements.json、source/、各種ログ
        harness/
        harness-corrected/
```

公開ページ、Presenter mode、検証処理はこの正本を読む。表示用の説明と検証用データを別々に管理しない。

## MVPで使うHeroUIコンポーネント

### 公開サイト

- Button
- Input
- Accordion
- Chip
- Tabs
- Separator
- Tooltip

### 顧客管理

- Table
- Link
- Toolbar
- SearchField
- Card
- Surface
- Chip
- Drawer
- Select
- TextField
- Input
- Button
- Form
- Alert
- Spinner
- Toast

### Presenter mode

- ButtonGroup
- Tabs
- Chip
- Drawer
- Progress
- Tooltip
- Separator

実装時に導入したHeroUIの実際のAPIとコンポーネント名を確認し、設計契約と対応付ける。存在しないAPIを設計データへ記載しない。

## MVPの検証

### 自動検証

- Build
- TypeScript
- Lint
- 設計JSONのSchema検証
- token、component、pattern、example、ruleの参照切れ
- 許可されていないHeroUIコンポーネント
- 許可されていないvariant
- 生の色コード
- ラベルのない入力
- エラー説明と入力の関連付け
- 必須状態のfixture不足
- 顧客名を空のまま保存できないこと
- メールアドレスの形式を検証すること
- 保存後に顧客情報が更新されること
- 削除の確定前にAlertDialogで確認を挟むこと（起点はAlertDialog.Trigger内のHeroUI Button）
- レイアウト（狭幅、余白、戻る導線、一覧ツールバー）が契約値どおりに描画されること
- BaselineとHarnessの入力条件が設計契約以外で一致すること
- 実行記録にモデル、CLI、スターター、Prompt、設計契約の識別子があること
- Presenter modeの前後移動とリセット
- 主要ルートのSmoke Test
- DesktopとMobileの主要画面

### AIレビュー

- 画面の主操作が明確か
- 情報量が登壇中に読める範囲か
- 会場の投影画面で各場面の主張が一目で理解できるか
- Issueだけの生成とAtlas適用後の結果を混同しないか
- Harness側の判断が参照ルールと結び付いているか

AIレビューは参考情報として表示し、合否判定には使わない。

### 人の判断

- デモの説明がDesign Harnessの定義と食い違っていないか
- 比較条件が公平で、都合のよい結果だけを選んでいないか
- 修正版がルールへ機械的に合わせただけになっていないか
- 次のルール改善候補に根拠があるか

## Presenter modeの必須操作

- 次へ
- 戻る
- 最初から
- 任意のSceneへ移動

キーボード操作を用意する。

```text
Right Arrow   次へ
Left Arrow    戻る
R             最初から
```

入力欄へフォーカスしている場合は登壇用ショートカットを無効にする。

## 登壇当日の要件

- 主要なデモが外部APIを使わない
- 外部フォントを必須にしない
- 保存済みRunと画像をBuildへ含める
- 初期状態へ一操作で戻せる
- 10分版と20分版の進行設定を用意する
- 直接開けるデモURLを用意する
- ローカル実行手順を用意する
- 公開環境が使えない場合もローカルBuildで再生できる
- デモ前確認を一つのコマンドで実行できる

想定コマンド:

```text
pnpm demo:check
```

このコマンドはBuild、TypeCheck、Lint、Test、設計データ検証、保存済みRunの整合性検証を実行する。

## 公開条件

- 架空の氏名、メールアドレス、組織名だけを使う
- 内部URL、ローカル絶対パス、非公開リポジトリ名を含めない
- APIキーと秘密情報を必要としない
- 素材と依存ライブラリのライセンスを確認する
- READMEに目的、ローカル実行、検証、シナリオ追加方法を書く
- プロジェクトのLICENSEと第三者ライセンス一覧を置く
- 404と予期しないエラーの表示を用意する
- キーボード操作と主要な支援技術向けラベルを確認する
- 動きを減らす設定へ対応する
- mainブランチの検証を通った変更だけを公開する

## MVPに含めないもの

- Explore用LPの作り込み
- 登壇中と公開サイトでのライブAI
- 任意のリポジトリ読み込み
- 公開環境での任意のコード実行
- 利用者独自のデザインシステム読み込み
- 複数シナリオ
- 多言語対応
- 認証
- データベース
- Analytics
- 独自UIコンポーネントライブラリ
- HeroUI公式ドキュメントの複製

## 視覚方針

Meltaの左ナビゲーションと文書中心の情報構造を参照する。Meltaのロゴ、マスコット、文章、装飾、配色は複製しない。

生成済みの三案からOption 1を採用する。UI実装の前に、指定されたInterface Skillsを使って情報密度を下げた改訂案を作る。

- Option 1: Spec-first Catalog。採用
- Option 2: Evidence-led Manual
- Option 3: Harness Atlas

改訂条件:

- 左ナビゲーションはカテゴリー名と現在地を中心にし、下位項目を常時すべて表示しない
- ホーム画面では概要、4つの層、デモへの入口、AIが参照する設計情報だけを見せる
- ルールカバレッジ、Playground、テンプレート一覧はホーム画面から外す
- 1画面内の見出し、ボタン、補助リンクを減らす
- 余白と文字組みで階層を作り、囲みと装飾を増やさない
- Presenter modeの詳細はデモ画面へ分離する
- 顧客管理はPresenter mode内の生成例として扱い、公開トップには表示しない

改訂画像は初期検討時のローカル成果物として確認し、公開リポジトリには含めない。

状態: 公開トップから画面固有の例を除いた改訂方針を採用済み

## 完了を証明するもの

| 要件 | 証拠 |
| --- | --- |
| 公開設計情報 | 各公開ルートの実画面とSmoke Test |
| HeroUI利用 | `package.json`、実装コード、コンポーネント契約 |
| Harnessなし／ありの初回実装 | 入力条件、実行記録、保存済みRun、画面画像、変更差分 |
| 公平な比較 | 同一条件manifest、隔離workspace、同一検証結果 |
| Harness修正版 | 検証結果を入力にした修正Runと再検証結果 |
| AIレビュー | Run内の独立したreview artifact |
| 人の判断 | Run内のdecision artifact |
| フィードバック循環 | 改善候補と反映先の表示 |
| オフライン再生 | ネットワークを使わないローカルBuildの実機確認 |
| 登壇操作 | キーボード操作を含むE2Eテスト |
| 公開安全性 | 秘密情報検査、素材一覧、ライセンス一覧 |
| 公開環境 | Production URLとCI結果 |

## MVP完了チェック

- [ ] 視覚案が選択されている
- [ ] 設計情報の正本が作られている
- [ ] 顧客管理の全状態が実装されている
- [ ] 同じ条件からBaselineとHarnessを実際に生成できる
- [ ] Baseline、Harness、Harness修正版のRunが保存されている
- [ ] 二つの初回実装をラベルなしで比較できる
- [ ] 公開デザインシステムの全ルートが表示される
- [ ] Presenter modeの全場面を再生できる
- [ ] 自動検証、AIレビュー、人の判断が分かれている
- [ ] フィードバックの改善候補を確認できる
- [ ] `pnpm demo:check`が成功する
- [ ] DesktopとMobileで実機確認している
- [ ] オフラインでデモを完走できる
- [ ] READMEと登壇手順がある
- [ ] ライセンスと公開データを確認している
- [ ] Productionへ公開されている

すべての項目を現在のファイル、テスト結果、実画面、公開環境から確認できた時点でMVP完了とする。
