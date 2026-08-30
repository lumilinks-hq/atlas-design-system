# Atlas Design System 公開までの残作業

更新日: 2026-08-30

このファイルは現在の実装から公開版へ到達するための残作業を管理する。比較条件と受け入れ条件は[`MVP.md`](./MVP.md)、AIと人が参照する設計方針は[`DESIGN.md`](./DESIGN.md)を正本とする。

## 目標と役割

Atlasを次の四つの用途で使える状態にする。

1. 人がデザインシステムの設計判断を読む。
2. 開発者がGitHubからcloneして比較実験を再現する。
3. AIエージェントがSkillまたはMCPを通して設計契約を参照する。
4. カンファレンスやウェビナーで、Issueから生成・検査・結果比較までを説明する。

公開サイト内では次の役割を混ぜない。

| 目的 | CTA | 遷移先 |
| --- | --- | --- |
| Atlasを導入する | 導入方法を見る | `/getting-started` |
| 生成結果を触る | 生成された画面を操作する | `/play/account-management` |
| 比較の仕組みを理解する | 実装比較デモを見る | `/demo/runs/account-management` |
| 設計判断を読む | Foundations / Components / Patterns / Rules | 各ドキュメント |

Explore用LP、ライブAI実行、複数シナリオ、英語対応は初回公開後に扱う。

## 現在できていること

- [x] React、TypeScript、Vite、HeroUIで公開サイトを起動できる
- [x] `#0d0bb6`をアクセントにしたAtlasテーマを生成できる
- [x] `DESIGN.md`と`design/`にtoken、component、pattern、example、ruleの正本がある
- [x] 設計データと保存済みRunを検証できる
- [x] 同じBriefからBaseline、Harness、Harness修正版を生成・評価できる
- [x] `mvp-05`の生成ソース、差分、検証結果、比較結果が保存されている
- [x] BaselineとHarness修正版をローカルの別ポートで操作できる
- [x] Presenter modeでIssue、設計適用、生成と検査、結果比較の4場面を再生できる
- [x] SceneをURL、ボタン、左右キー、リセットで操作できる
- [x] `pnpm demo:check`で設計、Run、型、Lint、テスト、Buildを確認できる

2026-08-30時点の検証結果は6 test files・19 tests成功、Production build成功。

## P0: 利用導線と操作デモ

### DH-201 情報設計を固定する

依存: なし

- [x] Overview、Getting started、Play、Presenter、Docsの役割とルートを確定する
- [x] 「今すぐ使ってみる」を廃止し、遷移先が分かるCTAへ置き換える
- [x] 1画面に強いPrimary CTAを一つだけ置く
- [x] 登壇デモを導入導線から分離する
- [x] 生成画面とPresenterを「実装デモ」という一語でまとめない

完了条件: Overviewから「導入」「操作」「比較説明」へ迷わず移動でき、CTA名と遷移先が一致する。

### DH-202 CTAとナビゲーションを修正する

依存: DH-201

- [x] OverviewのPrimary CTAを「導入方法を見る」に変更する
- [x] Overviewに「実装比較デモを見る」の副導線を置く
- [x] 実装例ページに「生成された画面を操作する」を置く
- [x] サイドバーの「登壇デモを見る」はPresenter modeへ維持する
- [ ] 外部リンクであることを表示する
- [ ] 全CTAの遷移テストを追加する

完了条件: Presenterへ移動するCTAは「登壇デモ」または「実装比較デモ」と表記される。

### DH-203 Getting startedページを作る

依存: DH-201

- [x] `/getting-started`を追加する
- [x] GitHub、Skill、MCPの三つの導入方法を目的別に説明する
- [x] 初回推奨をGitHub cloneとして明示する
- [ ] 各方法の前提、導入、確認、更新方法を掲載する
- [x] 未公開の方法は利用可能に見せない
- [ ] コマンドをコピーできるようにする
- [ ] READMEと手順がずれない検査方法を決める

完了条件: 初見の開発者が自分に合う導入方法を選べる。

### DH-204 生成画面を公開サイト内で操作できるようにする

依存: DH-201

- [x] `/play/account-management`を追加する
- [x] BaselineとHarness修正版を同じURL構造で切り替えられるようにする
- [x] 生成ソースのCSSと状態をドキュメントサイトから隔離する
- [x] Default、Drawer、入力エラー、権限不足、保存中、成功、失敗を切り替えられるようにする
- [x] 入力、確認、保存、失敗後の復旧を操作できるようにする
- [ ] 条件と状態をURLで共有できるようにする
- [x] 業務画面を読める大きさで表示する
- [x] モバイルとデスクトップで操作確認する

完了条件: `pnpm experiment:preview`を別ポートで起動しなくても両条件を操作でき、保存済みRunのソースと内容が一致する。

### DH-205 操作デモとPresenterを接続する

依存: DH-202、DH-204

- [x] Presenterの結果画面から該当する操作デモへ移動できるようにする
- [x] 操作デモから比較説明へ戻れるようにする
- [x] BaselineとHarness修正版の条件説明を常時確認できるようにする
- [x] Presenter内では会場向けの情報量を維持する

完了条件: 「説明を見る」と「画面を触る」を往復しても現在の条件を見失わない。

## P0: GitHubから利用できるようにする

### DH-210 公開リポジトリの方針を決める

依存: なし

- [ ] リポジトリ名、owner、公開範囲、default branchを決める
- [ ] OSSライセンスを選ぶ
- [ ] 保存済みRun、画像、ログ、生成ソースの公開基準を決める
- [ ] Issue、Pull Request、外部Contributionを受け付ける範囲を決める
- [ ] versioningとRelease方針を決める

完了条件: 公開先と利用条件をREADMEとLICENSEへ書ける。

### DH-211 GitリポジトリとGitHub公開先を作る

依存: DH-210

- [ ] 現在の作業フォルダをGitリポジトリとして初期化する
- [ ] `.gitignore`へ生成中workspace、秘密情報、一時ファイルを追加する
- [ ] GitHubリポジトリを作成してremoteを設定する
- [ ] 初回コミット前に公開データ監査を通す
- [ ] default branchの保護方針を設定する

完了条件: 新しい環境からcloneでき、端末固有のファイルが追跡されていない。

### DH-212 clone後のQuick startを成立させる

依存: DH-211

- [ ] Node.jsとpnpmの要求バージョンを固定する
- [ ] `pnpm install`、`pnpm dev`、`pnpm demo:check`をREADME冒頭に整理する
- [x] Docs、Play、PresenterのURLを記載する
- [ ] 比較再実行にCodex CLI認証が必要であることを分離して説明する
- [x] 閲覧だけならAPIキー不要であることを明示する
- [ ] clean clone環境でQuick startを実行する

完了条件: READMEだけで15分以内にサイトと操作デモを起動できる。

## P1: Skillとして利用できるようにする

### DH-220 Atlas Skillの責務を定義する

依存: DH-203、DH-212

- [x] 対象を「Atlasに従う画面実装と検証」に限定する
- [x] `DESIGN.md`から必要なPattern、Example、Component、Ruleだけを読む順序を定義する
- [x] 設計データをSkill本文へ複製しない
- [x] Issue、設計契約、参照が不足する場合の停止条件を定義する
- [x] 検証結果を次の修正Runへ渡す手順を定義する

完了条件: Skillとデザインシステムの正本が二重管理にならない。

### DH-221 Atlas Skillを実装する

依存: DH-220

- [ ] `.agents/skills/atlas-design-system/SKILL.md`を作る
- [x] 入力、前提、参照順序、実装、検証、完了報告を記述する
- [x] manifestから参照対象を解決する補助スクリプトを用意する
- [x] Skillの構造と内部リンクを検証するコマンドを追加する
- [ ] CodexとClaude Codeが同じ正本を読める配置にする
- [x] Getting startedへ追加方法と使用例を掲載する

完了条件: cleanなconsumerプロジェクトへ追加して実行できる。

### DH-222 Skillの効果を検証する

依存: DH-221

- [ ] 同じIssueとstarterでSkillなし・Skillありの比較fixtureを作る
- [ ] 両条件へ同じTypeScript、Test、Build、設計検査を実行する
- [ ] Skillが参照したファイルとルールIDを記録する
- [ ] 失敗時の再実行手順を確認する
- [ ] Skill追加コマンドをclean環境で検証する

完了条件: 設計ファイルを手動列挙せずAtlasに従う実装を再現できる。

## P1: MCPとして利用できるようにする

### DH-230 MCPの公開範囲と安全境界を決める

依存: DH-203、DH-212

- [x] 初回はローカルstdio MCPとして提供する
- [x] 設計情報をread-only resourceとして公開する
- [x] 任意ファイル読み込み、任意コマンド実行、書き込みを許可しない
- [x] resource URIとschema versionを決める
- [x] hosted MCPを初回公開から分離する

resource候補: `atlas://design/quick-reference`、`atlas://tokens`、`atlas://components/{id}`、`atlas://patterns/{id}`、`atlas://examples/{id}`、`atlas://rules`。

完了条件: MCPから参照できる情報と安全境界が明文化されている。

### DH-231 MCPサーバーを実装する

依存: DH-230

- [x] resource一覧とresource取得を実装する
- [x] manifestから必要な契約を解決するread-only toolを実装する
- [ ] 不正ID、参照切れ、schema不一致をエラーにする
- [x] package scriptから起動できるようにする
- [ ] MCP protocolの契約テストを追加する
- [ ] 設計データ以外のローカル情報をログへ出さない

完了条件: MCPクライアントからJSON正本と同じ設計契約をIDで取得できる。

### DH-232 MCPの接続手順を公開する

依存: DH-231

- [ ] Codex用の接続例を掲載する
- [ ] Claude Code用の接続例を掲載する
- [ ] 起動、疎通確認、更新、削除の手順を掲載する
- [ ] Getting startedへ利用場面と制約を掲載する
- [ ] clean環境で接続例を検証する

完了条件: 記載された設定だけでresource一覧を取得できる。

## P1: デザインシステムを参照資料として完成させる

### DH-240 Foundationsを完成させる

- [ ] Color、Typography、Spacing、Radius、Shadow、Motionを掲載する
- [ ] token名、値、用途、避ける使い方を表示する
- [ ] コントラストとフォーカス色の確認結果を掲載する
- [ ] JSONと表示内容の一致を自動検査する

### DH-241 Component契約ページを完成させる

依存: DH-240

- [ ] 採用HeroUIコンポーネントごとの詳細ページを作る
- [ ] 用途、使わない場面、許可variant、size、stateを掲載する
- [ ] アクセシビリティ要件、良い例、避ける例を掲載する
- [ ] 関連token、pattern、ruleを相互リンクする
- [ ] HeroUI公式ドキュメントへリンクする

### DH-242 Pattern、Example、Ruleページを完成させる

依存: DH-241

- [ ] Page layout variantの選択基準を掲載する
- [ ] 顧客企業管理の構成、業務制約、必須状態を掲載する
- [ ] Ruleの重大度、検証方法、修正方針を掲載する
- [ ] 自動検証、AIレビュー、人の判断を区別する
- [ ] 検査結果から該当Ruleへ直接移動できるようにする

### DH-243 検索と深いリンクを実装する

依存: DH-240、DH-241、DH-242

- [ ] token、component、pattern、example、ruleを横断検索する
- [ ] Ruleを重大度と検証方法で絞り込む
- [ ] 検索結果から該当見出しへ移動する
- [ ] URLで検索条件と見出しを共有できるようにする
- [ ] キーボードだけで検索できるようにする

### DH-244 公開向けの説明と表記を整える

依存: DH-202、DH-242

- [ ] Atlasを「Design Harnessに基づくデモ用デザインシステム」と一貫して表記する
- [ ] Design Harness、Atlas、HeroUIの責務を説明する
- [ ] 保存済みRunとライブAIの違いを明示する
- [ ] サンプルデータが架空であることを明示する
- [ ] 自動検証を完成承認と誤解させない
- [ ] 日本語と英語が不要に混ざる見出しを整理する

完了条件: 初見の閲覧者がDocs、導入、操作デモ、登壇デモを区別できる。

## P1: Presenterを再利用可能にする

### DH-250 保存済みRunとの整合性を保証する

依存: DH-204、DH-205

- [ ] CLIバージョン、モデル、検査数、画像をRun metadataから表示する
- [ ] Presenter内へ実行結果を手入力しない
- [ ] 欠損Artifactがある場合はBuildを失敗させる
- [ ] BaselineとHarnessの比較条件一致を検査する
- [ ] 画面上の主張と保存ログを照合するレビュー手順を作る

### DH-251 会場・ウェビナー表示を検証する

依存: DH-250

- [ ] 16:9と1280×720で各Sceneがスクロールなしに収まることを確認する
- [ ] キーボード、クリック、リセット、途中開始を確認する
- [ ] `prefers-reduced-motion`に対応する
- [ ] ネットワーク切断時も再生できることを確認する
- [ ] 発表前チェックリストを作る

### DH-252 イベント設定を分離する

依存: DH-251

- [ ] イベント名、登壇者、持ち時間を設定ファイルへ分離する
- [ ] Experiment、Run、Sceneを設定で選べるようにする
- [ ] PdEConf固有の内容を共通コードへ埋め込まない
- [ ] 過去イベントの共有URLを壊さない
- [ ] 別ウェビナー用設定の作り方を文書化する

完了条件: コード変更なしで別イベントの進行へ切り替えられる。

## P1: 公開前の安全・品質

### DH-260 保存済みRunと公開データを監査する

依存: DH-211、DH-250

- [ ] `pnpm runs:sanitize`を全公開Runへ実行する
- [ ] ローカルパス、ユーザー名、内部URL、非公開リポジトリ名を検査する
- [ ] APIキー、token、Cookie、認証情報らしい文字列を検査する
- [ ] 人名、メールアドレス、会社名を架空データへ統一する
- [ ] stderrとevents JSONLを公開する必要性を再判断する
- [ ] 画像、フォント、アイコンの出典とライセンスを確認する

### DH-261 ライセンスと第三者通知を整える

依存: DH-210、DH-260

- [ ] プロジェクトのLICENSEを追加する
- [ ] HeroUI、Lucide、フォント、その他依存のライセンスを確認する
- [ ] 必要な第三者通知を追加する
- [ ] 生成物と保存済みRunの利用条件をREADMEへ記載する

### DH-262 Web品質とアクセシビリティを確認する

依存: DH-204、DH-243、DH-244

- [ ] スマートフォン、タブレット、デスクトップで主要ルートを確認する
- [ ] キーボード、フォーカス、見出し、支援技術向けラベルを確認する
- [ ] 色コントラストと200%拡大を確認する
- [ ] 404と予期しないエラーの画面を作る
- [ ] 内部リンク切れと外部リンク切れを検査する
- [ ] 主要ルートのE2Eとアクセシビリティ検査を追加する
- [ ] CSSとJavaScript bundleの大きさを確認する

### DH-263 READMEと運用文書を完成させる

依存: DH-212、DH-222、DH-232、DH-261

- [ ] 目的、Quick start、主要ルート、正本、安全規則をREADMEへ整理する
- [ ] GitHub、Skill、MCPの導入方法を相互リンクする
- [ ] Pattern、Rule、Experiment、Runの追加手順を文書化する
- [ ] 保存済みRunの更新手順とレビュー項目を文書化する
- [ ] Contributionを受け付ける場合だけCONTRIBUTINGと行動規範を追加する
- [ ] Issueテンプレートを用意する

完了条件: READMEから利用、実験再現、設計変更、公開手順へ到達できる。

## P1: CI、公開、初回リリース

### DH-270 CIを追加する

依存: DH-211、DH-262

- [ ] Pull Requestで`pnpm demo:check`を実行する
- [ ] clean installとlockfile固定を検査する
- [ ] SkillとMCPの契約テストを追加する
- [ ] 公開データ監査とリンク検査を追加する
- [ ] main branchの必須Checkを設定する

### DH-271 Preview環境を作る

依存: DH-270

- [ ] 静的ホスティング先を決める
- [ ] SPAの直接URLと404 fallbackを設定する
- [ ] Pull RequestごとにPreview URLを発行する
- [ ] PreviewでDocs、Play、PresenterのSmoke Testを実行する
- [ ] Previewへ検索エンジンのindex抑止を設定する

### DH-272 Productionを公開する

依存: DH-263、DH-271

- [ ] Production URLと独自ドメインの有無を決める
- [ ] main更新からProductionへ自動反映する
- [ ] version、commit、更新日時を確認できるようにする
- [ ] Analyticsと監視を使う場合は収集範囲を決める
- [ ] 公開後に全主要ルートを外部環境から確認する

### DH-280 clean環境の受け入れテストを行う

依存: DH-222、DH-232、DH-272

- [ ] GitHubからcloneしてQuick startを実行する
- [ ] デザインシステムを閲覧する
- [ ] BaselineとHarness修正版を操作する
- [ ] Presenterを4場面再生する
- [ ] Atlas Skillをconsumerプロジェクトで実行する
- [ ] MCPを接続して設計契約を取得する
- [ ] APIキーなしで公開サイトを閲覧する
- [ ] Codex CLI認証ありで比較実験を再実行する

### DH-281 初回リリースを作る

依存: DH-280

- [ ] versionを決める
- [ ] Release noteに利用方法、既知の制約、保存済みRunを記載する
- [ ] GitHub Releaseを作る
- [ ] Getting startedのリンクを公開URLへ更新する
- [ ] 公開サイトとReleaseのversion一致を確認する

完了条件: GitHub、Skill、MCP、公開サイトが同じリリースを参照している。

## P2: 初回公開後

### DH-301 Explore用LPを作る

- [ ] Design Harnessの短い説明とAtlasへの入口だけを置く
- [ ] デザインシステムサイトと内容を重複させない

### DH-302 シナリオを追加する

- [ ] 一覧と空状態
- [ ] 設定変更と権限
- [ ] 破壊的操作と確認
- [ ] データ読み込みと失敗時の復旧

### DH-303 英語表示を追加する

- [ ] UI文字列と設計文書を翻訳可能な構造にする
- [ ] 片方の言語だけ古くならない検査を追加する

### DH-304 hosted MCPを検討する

- [ ] 認証、rate limit、versioning、監視、利用規約を決める
- [ ] ローカルstdio MCPとresource URIを互換にする

### DH-305 ライブAI実行を分離して検討する

- [ ] ブラウザへAPIキーを渡さない
- [ ] サーバー側で実行環境、入力、時間、利用量を制限する
- [ ] 失敗時は保存済みRunへ戻せるようにする

## 推奨実行順

```text
DH-201 情報設計
  ├─ DH-202 CTA修正
  ├─ DH-203 Getting started
  └─ DH-204 操作デモ ─ DH-205 Presenter接続

DH-210 公開方針 ─ DH-211 GitHub ─ DH-212 Quick start
                                     ├─ DH-220〜222 Skill
                                     └─ DH-230〜232 MCP

DH-240〜244 デザインシステム拡充
DH-250〜252 Presenter再利用
DH-260〜263 公開品質
          ↓
DH-270 CI ─ DH-271 Preview ─ DH-272 Production
          ↓
DH-280 clean環境検証 ─ DH-281 初回リリース
```

最初の縦切りは`DH-201 → DH-202 → DH-203 → DH-204 → DH-205`。サイト上の言葉と実体を一致させた後、GitHub、Skill、MCPの順で利用経路を実装する。

## 初回公開で作らないもの

- Figmaの代替となる編集画面
- AIとのチャット画面
- 任意コードをブラウザで実行する機能
- ライブAIの公開実行
- hosted MCP
- 複数人での共同編集
- HeroUI全コンポーネントの複製ドキュメント
- Explore用LPの作り込み
- 複数シナリオ
- 英語対応

## 初回公開の完了条件

- [ ] GitHubからcloneしてAtlasを起動・検証できる
- [ ] Skillを通してAIがAtlasの設計契約を参照できる
- [ ] MCPを通してAtlasの設計契約をread-onlyで取得できる
- [x] 公開サイトからDocs、導入方法、操作デモ、Presenterへ移動できる
- [ ] BaselineとHarness修正版をブラウザで操作できる
- [ ] Presenterを別ウェビナーでも再利用できる
- [ ] 設計ページと検証処理が同じ正本を参照している
- [ ] 保存済みRunと公開画面の数値、画像、条件が一致している
- [ ] 秘密情報、端末固有情報、権利不明な素材が含まれていない
- [ ] clean環境の受け入れテストとCIが成功する
- [ ] 公開URL、GitHub Release、Skill、MCPが同じversionを参照している
