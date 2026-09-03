# デザインシステム成立に必要な機能の過不足分析

> 2026-09-02 調査。「このデモのデザインシステムを成立するために必要な機能の過不足を洗い出して」の結果。
> 修正は未実施（分析のみ）。

## 前提（判定基準）

- 判定基準は**デモの成立**（MVP.md: 契約→生成→検証のループを保存済みRunで見せ、登壇後に閲覧者がサイトを見て信頼できること）。フル機能の本番DSとしては判定しない。
- MVP.md「MVPに含めないもの」（複数シナリオ・多言語・ライブAI・ダークモード・独自UIライブラリ等）は**明示的な非目標**であり、不足には数えない。データ可視化のみ非対応宣言がなく DESIGN.md:73 が自由領域として許可する一方で規約皆無のグレーゾーン。
- LAYOUT_GAP_ANALYSIS.md（レイアウト定義の欠落）は解消済みの前回分析であり、本書と重複させない。

## 結論

不足は4層、過剰は1種類に整理できる:

1. **P0: デモ自身の主張と実装の乖離** — 「契約で検査できる」という中心主張が4箇所で実態と食い違う
2. **P1: 契約の穴** — 実使用・実要求されている部品が未契約／契約の数値が人に見えない／状態表現がトークン外
3. **P2: 運用の器の不在** — 契約に版数がなく、変更を利用側が検知できない（大半はTASKS.md把握済み）
4. **過剰 = 機能していない定義** — どこからも参照されない契約・variant・enum値が「修正前の失敗モード」のまま残存

---

## P0. デモの主張を崩す乖離（新規発見）

### P0-1. component.approved が許可リストとして機能していない
- MVP.md:210 は「許可されていないHeroUIコンポーネント」の検査を約束するが、実体（evaluate-experiment.mjs:679-687）は生HTML検出のみ（`<button` `<table` `<select` `<input` `role="dialog"`）
- 契約にない HeroUI 部品（Checkbox等）を import しても**素通り**する。import文とJSX使用をAtlas契約14件と突き合わせる検査が存在しない

### P0-2. toolbar のドリフトが検出不能
- example.account-management は `component.toolbar` の使用を主張するが、mvp-11 の実装は `<div className="collection-toolbar">` の手組み（App.tsx:398）
- validate-design.mjs は参照IDの実在しか見ないため、「契約が主張する部品を実装が使っていない」ドリフトを誰も検知できない。ハーネスの核心（ドリフト検出）の穴

### P0-3. rules.json の `method` フィールドが実行系に読まれていない
- ai-review の実行系 scripts/review-experiment.mjs は存在するが、対象ルールを `reviewRuleIds = ["layout.grouping", "color.semantic"]` と**ハードコード**（:7）。rules.json に ai-review ルールを追加しても自動ではレビューされない
- human 宣言の3件（a11y.error-recovery / a11y.color-only / state.failure）は evaluate-experiment.mjs が文字列ヒューリスティクスで pass/fail を機械判定しており、宣言と実挙動が乖離
- layout.grouping は幾何計測で automatic 化済みなのに宣言が ai-review のまま（Phase 3 の成果が rules.json に反映されていない）
- 逆方向の乖離もある: a11y.control-name は **automatic 宣言なのに** evaluate-experiment.mjs:935 は "review"（人が見て、の意）を返し機械判定していない
- human 宣言ルールには判定を記録する場所も回す仕組みもない（mvp-11 の run 成果物に human 判定のファイルは一切存在しない）
- /rules ページの「確認方法」列はこの宣言を表示するため、閲覧者に実態と異なる説明をしている

### P0-4. component.variants がリテラルしか見ない
- evaluate-experiment.mjs:432-447 は静的な `variant="..."` のみ検査。`variant={someVar}` は素通り

## P1-A. 契約の幅の穴 — 実使用・実要求されている部品が未契約（新規発見）

- **実装が既に使っているのに契約がない**: Form / Input / Label / Description / FieldError / Alert / ListBox / toast関数（mvp-11 harness の実 import と突き合わせ）。特に Label / Description / FieldError は text-field.json の requirements が**名指しで要求**しており宙ぶらりん
- **ルールが前提にするのに契約がない**: Spinner（baseline が使用、state.loading ルールの判定対象）
- **次シナリオ（DH-302: 設定変更と権限／破壊的操作）で初日に必要**: Checkbox / Switch / Tabs / Modal（AlertDialog / Drawer は契約済みで汎用 Modal だけ欠けている非対称）。なお evaluate-experiment.mjs:688-696 は「Atlas CRM」「顧客を追加」等の日本語文字列をハードコードしており評価器自体がこのシナリオ専用 — DH-302 では契約追加だけでなく評価器の汎用化も要る
- HeroUI v3 の71部品中、契約は14件。57件の未契約自体は不足ではないが、P0-1 の許可リスト検査がない限り「契約外＝管轄外」で素通りする構造が問題

## P1-B. 契約の数値が人に見えない — docsサイトのレンダリング落ち（新規発見）

src/data/design.ts は全JSONを取り込んでいるのに、レンダリング層が捨てている（「人とAIが同じ仕様を読む」というサイト自身の主張に反する。修正コストは最小）:

- Patterns: **variants[].layout（数値契約そのもの）**・states・components・rules が非表示
- Rules: category が非表示（fix・重大度の非表示は DH-242 残として**既知**なのでここに数えない）
- Components: defaults・visual.*・relatedRules・layout が非表示
- Foundations: content・breakpoint トークンが非表示
- Example: components[]・rules[] 非表示、componentUsage は table のみ表示

## P1-C. トークンの守備範囲 — 状態表現がすべてトークン外（新規発見）

静的な見た目（色・余白・角丸・影・文字サイズ）は完全トークン化されている一方:

- **未トークン化**: フォーカスリング幅・オフセット（2px）、モーション duration / easing（DESIGN.md:308「150ms以下」は散文のみ、検査もなし）、z-index（design/ 側の theme.css / component-theme.css / layout.css に定義が一切なく、重なり順の規約が存在しない）、無効時 opacity、active 縮小 0.96、font-family（DESIGN.md は「system sans」だが design/ 側に font-family の定義・供給・検査が皆無）、font-weight、border-width、icon-size
- 要約: **状態の表現（フォーカス・動き・重なり・不透明度）と書体は契約の外**にある

## P2. 運用の器（大半は TASKS.md 既知）

- **契約JSONに version フィールドがなく、変更を Skill / MCP 利用側が検知できない**（新規）。version 番号は5か所に分散し相互に無関係（DESIGN.md v2 / tokens.json 1.0.0 / rules.json 1.0.0 / package.json 0.1.0 / MCP server 1.0.0）。CHANGELOG なし
- コントラストの**サイトへの掲載**は DH-240 の既知項目。新規なのは**再計算スクリプトの不在** — 検査が DESIGN.md:104-116 の手計算HTMLコメントのみで、トークン変更で静かに腐る
- ビジュアルリグレッションなし（スクショはRun証跡でありベースライン差分比較はしない）
- 既知（TASKS.md 把握済み・未完了）: DH-240（Motion掲載・コントラスト結果掲載）、DH-241（部品別a11y文書）、DH-242 残（重大度・確認方法の掲載）、DH-243（横断検索）、DH-261（LICENSE）、DH-262（404画面等）、DH-263（CONTRIBUTING）、DH-210（Release方針）

## 過剰 — 機能していない定義（新規発見）

「機能が多すぎる」のではなく、**参照ゼロの定義が正常な契約と見分けがつかない形で混在**していることが問題:

- **number-field.json**: 完全な孤児。契約以外のどこにも出現しない（example / manifest / 実装 / サイト個別記述すべてなし）
- **page-layout の3 variant**（single-two-column / side-navigation / collection-detail）: layout 数値なし＋参照なし。LAYOUT_GAP_ANALYSIS で解消したはずの「散文だけの variant」がこの3つにはそのまま残っており、AIがこれを選んだ瞬間にレイアウトドリフトが再発する
- **spacing-layout の2 variant**（surface-content / inline-actions）: design-contract.test.ts からのみ参照（定義とテストだけ）
- **visual.surfaceOwner の enum値 "parent"**: 全14契約で未使用（enum の 1/3 が死亡）
- **import フィールド**: 全件 `"@heroui/react"` の const で情報量ゼロ
- **DocsPages.tsx のプレビュー switch(id)**（:678-834）: 契約と別系統のハードコードで、契約更新に追従しない二重正本
- ⚠️ **surface.json は過剰ではない**: 一見未使用だが component.table.surface 禁止ルールの基準点（evaluate-experiment.mjs:391-392, 415-416）。整理時に削除してはいけない

## 既知 vs 新規の対応

| 区分 | 項目 |
| --- | --- |
| 新規（本書で発見） | P0-1〜4、未契約 anatomy 部品、docsレンダリング落ち、状態トークン不在、契約version不在、コントラスト再計算不在、孤児定義群 |
| 既知（TASKS.md 未完了） | 部品別a11y / Motion掲載 / fix・重大度掲載 / 検索 / LICENSE / 404 / CONTRIBUTING / Release方針 |
| 非目標（不足に数えない） | 複数シナリオ・多言語・ライブAI・ダークモード・DB/認証/Analytics |

## 方向性（各一言・優先順）

1. **P0-3**: review-experiment.mjs が `method === "ai-review"` を rules.json から読む形にし、layout.grouping の宣言を automatic へ更新（宣言＝実行に）
2. **P0-1/2**: import / JSX 使用を契約14件＋example の componentUsage と突き合わせる検査を追加（toolbar ドリフトも同時に落ちる）
3. **P1-A**: 実使用部品（Form / Label / FieldError / Alert / Spinner / ListBox）を契約化、または text-field 等の anatomy として吸収
4. **P1-B**: design.ts に既にあるデータ（pattern layout 数値・rule fix）をサイトに表示する
5. **P1-C**: focus / motion / z-index / opacity のトークン追加と theme 生成への組込み
6. **過剰**: number-field 削除かシナリオ配線、未参照 variant は layout 付与か「未整備」明記、surface は理由コメント付きで維持
7. **P2**: 契約 version の一本化＋CHANGELOG（公開前。DH-210 と接続）、tokens.json からのコントラスト自動再計算

---

## 修正計画（2026-09-02 追記・未着手）

### 前提となる制約 — demo:check は「再評価型」

scripts/check-design-conformance.mjs は保存JSONの形式検証ではなく、**現在の評価器＋現在の契約で mvp-11 harness-corrected を再評価し、保存済み design-evaluation.json との完全一致（summary と rules の JSON.stringify 比較）を要求する**。エラー文自体が「契約を変えたら refine→capture→review→compare で更新せよ。evaluate 単独再実行は review 欄を消すため禁止」と指示している。よって:

- **評価器の出力を変える修正**（新検査の追加・判定の変更・evidence 文言の変更）と**評価器の入力を変える修正**（component-theme.css を変えるトークン追加を含む）は、すべて mvp-11 更新とワンセット
- rules.json の `method` 宣言だけの変更は安全（保存 rules のキーは id / status / evidence のみで method を含まないことを実測確認済み）
- 結論: **評価器を触る修正は1バッチにまとめ、mvp-11 更新を1回で済ませる**

### ラウンド1: 宣言＝実行の一致＋許可リスト検査（評価器バッチ）

着手順（TDD の Red が先）:

1. **契約テストを先に書く**（新規テスト）: rules.json の全ルールを回し「automatic ⇒ evaluate が passed/failed を返す」「ai-review ⇒ review 対象集合に含まれ evaluate は review を返す」「human ⇒ 機械判定されない」を検査。現状は P0-3 の4乖離でちょうど Red になり、以後 method↔実行の再ドリフトを恒久的に防ぐ回帰装置になる
2. review-experiment.mjs:7 の `reviewRuleIds` ハードコードを rules.json の `method === "ai-review"` 読み取りへ置換
3. rules.json の宣言修正: layout.grouping → automatic（幾何計測済み）／a11y.control-name → ai-review（"review" を返す実体に合わせる）／human 宣言3件（a11y.error-recovery・a11y.color-only・state.failure）→ **ai-review へ変更し、evaluate の文字列ヒューリスティクスは pass/fail 確定判定から「"review" ＋ evidence（参考情報）」へ降格**。automatic への昇格はしない — ヒューリスティクスを確定判定と主張するのは P0-3 と逆方向の過大主張。これで human 宣言ルールに欠けていた実行経路と記録場所（review 欄）が新規インフラゼロで手に入る。human は本物の記録フローができるまで宣言0件のままスキーマに残す
4. **契約の幅を広げてから許可リスト検査**（順序厳守 — 逆だと現行 harness が自分の検査で落ちる）: Label / Description / FieldError は text-field.json の anatomy として吸収、Form / Alert / Spinner / ListBox / toast は小さい契約JSONを新規作成 → その後 evaluate に (a) `@heroui/react` の import / JSX を契約部品＋anatomy の許可セットと突き合わせる検査（P0-1）、(b) example の componentUsage が主張する部品が実装に出現するかの検査（P0-2。toolbar ドリフトがここで落ちる）を追加
5. **P0-4**: `variant={式}` は AST 解決まではせず **"review" へ降格**（素通り廃止）

### ラウンド2: mvp-11 更新（1回だけ・ラウンド1とワンセットでコミット）

- DEMO_PROGRESS.md の手順どおり refine→capture→review→compare を実行。toolbar 検査で harness-corrected が正当に fail → refine が `component.toolbar` 採用へ修正する。**実装を契約に合わせる方向で直し、example の主張は下げない**（「契約が正」がデモの主題）。Codex CLI 認証と生成費用が必要
- demo:check が通るまでラウンド1をコミットしない（「既存テスト全パス後にコミット」ルール）
- 副次効果: 「新しい検査がドリフトを検出し refine が直す」実演が1つ増え、デモの主張はむしろ強くなる

### ラウンド3: 評価器に触らない安い修正（任意順・単独コミット可）

- **P1-B**: design.ts に既にあるデータ（pattern variants[].layout・states・rule category・component defaults / visual / relatedRules・foundation content / breakpoint・example components / rules）をレンダリング層へ。docs-consistency.test に表示検査を先に追加
- **過剰整理**: number-field.json 削除（git に残る）／page-layout・spacing-layout の未参照 variant は layout 付与か削除（放置すると AI が選んだ瞬間にドリフト再発）／surfaceOwner "parent" は enum から削除／surface.json は禁止ルール基準点のため理由コメント付きで維持
- **P2（公開前分）**: 契約スキーマへ version 追加＋CHANGELOG.md 新設（DH-210 と接続）

### 公開後（ゲート明示）

- **P1-C 状態トークン**（focus / motion / z-index / opacity / font-family）: tokens.json → generate-theme → component-theme.css。**component-theme.css は評価器の入力のため、実施時に mvp-11 更新がもう1回必要**になる点を織り込む
- コントラスト自動再計算スクリプト（tokens.json から WCAG 算出、design:check へ組込み）
- 評価器の汎用化（issueScope 日本語ハードコードの manifest 移管）は DH-302 着手時

### 進行状況（2026-09-02 実行中）

実行体制: 計画・仕様・検収は Fable、実装は Opus サブエージェントへ委譲。

**仕様確定時の計画からの差分**（実測に基づく確定事項、上の記述より優先）:

- **Spinner 契約は作らない**: state.loading は Spinner に言及せず（fix は「Buttonのloadingとdisabledを同期する」）、mvp-11 harness 系も Spinner を import していない。Spinner 使用は baseline のみで契約外
- **ListBox は select.json の anatomy** `["ListBox"]` とする（mvp-11 では Select 内部でのみ使用・App.tsx:697）。単独契約は作らない
- **toast（小文字関数）は toast.json の anatomy** `["toast"]` とする
- 新規契約は **form.json（Form）と alert.json（Alert）の2件のみ**。example.components へ追加して孤児検出を回避
- **許可セット = example が参照する契約の implementation ∪ anatomy**（design/components/ 全体ではない。孤児 number-field を許可しないため）。evaluateSource のシグネチャは変えず、契約はモジュールレベルで読み込む（既存の componentUsage 読み込みと同方式）
- **componentUsage 使用検査は新規 automatic ルール `component.usage`**（27→28ルール）。判定は import の有無ではなく **JSX タグの AST 出現**（`Toolbar.*` メンバーアクセス含む）
- 件数を固定する既存テストは無いことを確認済み（server.test.mjs は存在チェックのみ、docs-consistency.test.ts はコマンド文字列のみ）

**WP 分割と状態**:

| WP | 内容 | 担当 | 状態 |
|---|---|---|---|
| WP1 | 契約テスト scripts/rules-method.test.mjs（mvp-11 corrected へのアンカー実測として記述） | Opus A | **完了・検収済み**（Red で4乖離を実測→Green） |
| WP2 | method 整合（rules.json 5宣言修正・review-experiment method駆動化＋selectReviewRuleIds export・evaluate 3ルール降格） | Opus A | **完了・検収済み**（diff は method 5行のみ、mvp-11 corrected 実測 22/0/5、test:run 102件パス） |
| WP3 | スキーマ anatomy 追加・text-field/select/toast へ anatomy・form/alert 新規契約・example 配線 | Opus B | **完了・検収済み**（design:check 16 components、test:run 114件、19/19 カバレッジ検算済み・許可セット21要素） |
| WP4 | 評価器新検査（import許可リスト→component.approved 合流・component.usage 新ルール・variant={式}→review）。approvedComponents Map（evaluate L84-105）を契約由来に導出できるか調査し報告させる | Opus C | **完了・検収済み**（Red 7件→Green、test:run 124件パス、28ルール、mvp-11 corrected 実測 22/1/5 — 唯一の failed は component.usage の Toolbar 未使用＝意図したドリフト検出） |

WP4 からの申し送り（approvedComponents Map の契約由来化は**ラウンド1では不可能**と確定）:
- Map のキーには Card.Root / Select.Root / Table.Root / Drawer.Backdrop / AlertDialog.Backdrop などドット記法があり、契約の anatomy から導出できない。先頭識別子一致に緩めると Chip.Root が新たに variant 検査対象になり、mvp-11 の `Chip.Root variant={getStatusVariant(...)}`（App.tsx L308/L350/L603/L779）が review 化して component.variants の automatic 宣言と衝突、rules-method.test.mjs が落ちる → **ハードコード Map を現状維持**
- 公開後フォローアップ: 先に mvp-11 の Chip.Root をリテラル variant へ refine し、そのあとで Map を契約導出版へ置き換える（この順序なら衝突しない）

WP3 からの申し送りで確定した設計判断:
- **許可セットは全契約のグローバル和集合**（implementation ∪ anatomy の総和）で判定する。契約単位の親子判定（このタグはこの契約の anatomy か）はしない — mvp-11 は Select.Root 内で Label を使っており（App.tsx:691）、親子判定だと偽陽性になるため
- ラウンド3追加項目: src/data/design.ts は契約を明示 import しているため docs ページに form / alert が出ない → design.ts への import 追加＋scripts/design-contract.test.ts の componentNames（14件）更新を P1-B と併せて実施
| ラウンド2 | mvp-11 更新 | Fable | **完了（2026-09-02）** — evaluate(baseline 7/16/5・harness 19/4/5)→refine(corrected 23/0/5、App.tsx へ Toolbar.Root 採用のみ)→capture 全mode→review(全mode findings 5件)→compare→**demo:check 全12段通過**。README.md:11 を28ルール数値へ更新、DEMO_PROGRESS.md へ追記済み |

**ラウンド1+2 コミット済み（2026-09-02）**: 8d059bc（評価器28ルール＋契約13ファイル(M7+新規6)＋依存クロージャの component-theme.css）→ b684df1（mvp-11 成果物＋public PNG 2枚）→ 002b2f5（README・DEMO_PROGRESS 数値同期）→ ceeae0b（number-field へ defaults/visual 追加。新スキーマが必須化したため除外不可と worktree 検証で判明）。コミット後の作業ツリーは test:run 124件・design:conformance 23/0/5 で green。

**ラウンド3 進行中（2026-09-02）**: 着手前確認 — runs:check（validate-runs.mjs）は manifest/run.json のみ検証・validate-design.mjs は live design/ のみ走査で、**runs/mvp-11 スナップショットの design/** はどの検査にも掛からない** → WP6/WP7 は mvp-11 更新なしで安全、version は必須化で進める。conformance は evaluateSource 再評価＋保存評価の JSON 完全一致のみで version 追加は無影響。HeroUI は Alert/Form とも export 確認済み。DESIGN.md L196-198・L214 に削除対象 variant の記述あり（WP6 で更新）。**1c51a49**: src WIP 6ファイル（DocsPages/design.ts/styles.css/App.test/DocsShell＋untracked account-management-table.ts）を WP5 に先行して独立コミット — WP5 で丸ごと入る運命のものを便乗ではなくラベル付きで先出しし、HEAD のビルド可能性を回復（design.ts が account-management-table.ts へ依存）、fresh HEAD の App.test.tsx 3失敗も解消。**WP5 完了・検収済み**（Red 3件→Green、demo:check 全12段通過、test:run 127件。docs-consistency.test.ts へ表示検査16項目＋method 日本語ラベル＋form/alert 配線検査を追加。6ページの未表示データを描画: FoundationsPage=breakpoint/content、ComponentsPage=defaults/visual/relatedRules 2カラム化、Pattern/SpacingPatternPage=LayoutContractDetails 共有で variant.layout＋pattern.states、ExamplePage=components/rules、RulesPage=category バッジ＋method 日本語化。form/alert のコード例＋プレビュー追加。HeroUI: Form は単体・Alert は compound）→ コミット **ca62362**（validate-design.test.mjs — ラウンド1 WP3 の TDD テストが 8d059bc に入り漏れていたのを発見し単独補完）＋ **fe84d70**（WP5 本体5ファイル）。WP6=過剰整理（number-field 削除一式・page-layout 未参照 variant 3件削除＋DESIGN.md/PatternPage 文言更新・surfaceOwner "parent" enum 削除・schema へ note 追加と surface.json 維持理由）→ WP7=version 必須化＋CHANGELOG。各WPゲートは demo:check 全12段。

**WP6 完了・検収済み（2026-09-02）** → コミット **490f9d0**（12ファイル 31+/93-）: number-field.json 削除＋evaluate-experiment.mjs の approvedComponents Map 行削除（Map は契約 JSON を readFileSync するため同一バッチ必須だった）＋spacing-layout.json components から除去＋design.ts / design-contract.test.ts を15契約へ。page-layout.json 未参照 variant 3件（single-two-column / side-navigation / collection-detail）削除、component.schema.json の surfaceOwner enum から未使用 "parent" を削除、schema へ optional `note` を追加し surface.json に維持理由を明文化。TDD: validate-design.test.mjs へ3テスト追加（"parent" 拒否・note 受理・非文字列 note 拒否）。検収時に conformance 23 passed / 5 review を3回計測で不変確認、demo:check 全12段通過。Opus が範囲外として報告のみに留めた page-layout.json:118 の avoidWhen 行き止まり（削除済み single-two-column への誘導前提）は Fable が直接修正、DESIGN.md:253 の NumberField 言及も TextField/Select の inline error へ修正。**弱い残課題**: page-layout.json:15 の principles「切り替えたい」文言は collection-list⇔collection-table の切替とも読めるため保留（最終報告に記載）。

**WP7 完了・検収済み（2026-09-02）** → コミット **a86f92a**（23ファイル 112+/5-）: component/pattern/example の3スキーマへ `version` を必須追加（rules/tokens スキーマと同じ `{ "type": "string" }`・required 先頭・$schema 直後）、契約18ファイルへ `"version": "1.0.0"`（diff は1行追加×18のみ）、CHANGELOG.md 新設（契約 version の major/minor/patch 運用方針＋1.0.0 初期リリース記録。package.json の version とは別軸と明記）。TDD: validate-design.test.mjs へ6テスト追加（Red 6件→Green）。書式（semver）はスキーマでは制約せずテストの `toMatch(/^\d+\.\d+\.\d+$/)` が担保 — スキーマ側で縛るなら rules/tokens スキーマも同時変更が必要。demo:check 全12段通過、conformance 23/5 不変、test:run 136件、links:check は CHANGELOG 追加で18ファイルへ。**申し送り**: version 軸の分散は5→実質4（DESIGN.md frontmatter v2・package.json 0.1.0・MCP server 1.0.0 は手つかず）。RELEASING.md へ「契約 version と CHANGELOG をリリース手順のどこで確認するか」を書き足す作業は DH-210 の残タスク。

**worktree 検証で確定した既存負債（コミット起因ではない・28c323e 時点から存在）**: fresh clone の HEAD は未追跡の scripts/skill-catalog.mjs（design-catalog.mjs が import、design:conformance と test 5ファイルのロードを破壊）と scripts/harness-context.mjs（refine/run-experiment/validate-skills が import）に依存して壊れている。ローカルは作業ツリーに実ファイルがあるため green。**ラウンド3の最初に skill-catalog.mjs＋harness-context.mjs の chore コミットを提案**（スコープ判断はユーザー）。なお今回のコミットは fresh HEAD の design-contract.test.ts の2失敗を解消した（悪化なし・純改善）。

**ラウンド2 実行手順（README:105-125・DEMO_PROGRESS.md Phase 5 実績から確定）**:

1. `pnpm experiment:evaluate --pair mvp-11 --mode baseline` → 2. 同 `--mode harness`（ソース不変なので measurements.json は有効、measure 再実行不要。※evaluate は review 欄を消すが後段の review で再生成される）
3. `pnpm experiment:refine --pair mvp-11`（codex が VALIDATION.md を入力に corrected を修正。**refine 自身が実測込みの再評価まで行う**ため measure/evaluate の手動再実行は不要。component.usage の failed が Toolbar 採用を駆動する想定）
4. `pnpm experiment:capture --pair mvp-11`（--pair のみで全 mode 処理。console-error ゲートあり）
5. `pnpm experiment:review --pair mvp-11`（全 mode の review 欄を再生成。selectReviewRuleIds により ai-review 5件が対象になる）
6. `pnpm experiment:compare --pair mvp-11` → `pnpm demo:check` 全通過確認
- 期待値: corrected 23 passed / 0 failed / 5 review（28ルール）。README.md:11・DEMO_PROGRESS.md:57/:67 の数値、DemoPage の自動参照値を新実測に同期
- 注意: 生成コードを人が直接編集しない（refine のイベントとして保存）。
- **着手前確認済み（advisor レビュー反映・2026-09-02）**:
  - refine-experiment.mjs は既存 corrected workspace（`.runs/account-management/mvp-11/harness-corrected`、独立 git repo・存在確認済み）を対象に、**Codex 起動前に measureRun＋evaluateRun を再実行**（L20-21）するため stale 評価の心配なし。failed=0 なら Codex を呼ばず成果物更新だけ行う短絡パスあり（L24-48）
  - VALIDATION.md は **failed のみ**列挙（evaluate-experiment.mjs toMarkdown L1137）。review 5件は Codex に渡らず「review まで直してしまう」回帰は構造的に起きない
  - public/ 同期は不要 — capture-experiment.mjs:11 が**直接 public/experiments/.../mvp-11/ へ PNG を書く**。public:audit は機密文字列＋必須アーティファクト存在検査のみで equality 比較なし
  - findHeroUiImportNames は L163 で named imports 以外（default / namespace / type-only）をスキップ済み → baseline 評価でのクラッシュなし
  - **復旧手順**: mvp-11 の experiments/・public/ 配下は未コミット変更なし（クリーン）→ 失敗時は `git checkout HEAD -- experiments/account-management/runs/mvp-11 public/experiments/account-management/runs/mvp-11` で復元。**git stash は禁止**（ラウンド1の未コミット変更を巻き込む）
  - **早期ゲート**: refine 直後に repo ルートで typecheck / test:run＋corrected source の git diff 確認（Toolbar 以外の変更を検分）を行い、その後に capture / review へ進む。review は corrected failed=0 になるまで実行しない。refine 不収束は2〜3回で打ち切り報告（手編集フォールバックなし）
- コミット時: 大量の旧 WIP（mvp-07..10 の public 等）を巻き込まない。`git add -A`/`-u` 禁止、Phase で触ったファイルのみ選択的に add

- コミットはラウンド1+2完了・demo:check 全通過後に論理単位で分割（それまで一切コミットしない）
- 各エージェントには demo:check / design:conformance / experiment系 / git 操作を禁止済み
- ラウンド2で成果物再生成後に更新が必要な散文カウント: README.md:11（25 pass / 0 fail / 2 review）、DEMO_PROGRESS.md:57・:67（WP2完了により旧値化。新値は評価再実行後に確定）

**最終検証完了（2026-09-02）**: 全9コミット（8d059bc→a86f92a）確定後の main で `pnpm demo:check` 全12段を再実行し green（exit 0）を自測 — design:check「15 components, 2 pattern, 1 example, 28 rules」／conformance「23 passed / 5 review」／runs:check 18 runs／test:run 136件14ファイル／links:check 18 Markdown／bundle OK。CHANGELOG の「トークン7分類」は tokens.json 実キー（color・space・radius・shadow・content・breakpoint・type、$schema/version 除く）と一致確認済み。worktree 検証（fresh HEAD＋frozen-lockfile install）はテストレベル失敗ゼロ・失敗5ファイルは全て未追跡 skill-catalog.mjs 連鎖のロード失敗で既存負債（コミット起因でない）。App.test.tsx 3失敗は 1c51a49 で解消済みを fresh HEAD で実証。

**WP7 追加申し送り（opus-wp7 補足2点目・2026-09-02）**: `experiments/account-management/runs/*/design/` のスナップショット契約は `version` を持たないまま（experiments/ は不触の方針どおり）。現状は無害 — runs:check は manifest/run.json のみ・validate-design.mjs は live design/ のみ走査で、スナップショットはどの検査にも掛からない（demo:check 12段 green で実証済み）。**設計上の既知の穴**: 将来スナップショットをスキーマ検証の対象に含めると、version 必須化済みの3スキーマが過去 run の契約を全て弾く。その際は「スナップショット検証には必須化前スキーマを使う」か「過去 run を検証対象から明示除外する」かの判断が必要。
