# 画面レイアウト定義の欠落分析

> 2026-09-01 調査。「ハーネスで画面レイアウトの定義がうまくいかない。何が足らないか」の洗い出し結果。
> 修正は未実施（分析のみ）。

## 結論

レイアウト定義は散文としては存在するが、**3つの層で欠けている**:

1. **語彙の欠落** — レイアウトの数値を契約として書く場所（スキーマ・トークン・実装部品）がない
2. **供給の欠落** — 書いてある定義が実装AIまで届かない（variant破棄・孤児ファイル・正本の分裂）
3. **検証の欠落** — 描画結果の幾何を一切測っておらず、文字列マッチだけで判定している

最も本質的な一点: **生成側と検査側が語彙を共有していない**。
評価器は `.mobile-list` などのクラス名や `aria-label="企業名で検索"` を決め打ちで要求するが、
その名前を使えという契約はどこにも書かれていない。正しい実装が名前違いでfailし、
正規表現さえ満たす壊れたレイアウトがpassする構造になっている。

---

## A. 語彙の欠落 — 数値を書く場所がない

### A-1. patternスキーマに構造化レイアウト値を書くフィールドがない
- `design/schemas/pattern.schema.json`: variantの `desktop` / `narrow` は `type: string` 固定＋`additionalProperties: false`
- そのため `design/patterns/page-layout.json` のレイアウト指定は全て散文:
  - 「最大1200pxの中で」(L86)、「主情報を副情報の2倍以上の幅にする」(L95)、「ナビゲーション幅を固定し」(L104)
- グリッド定義・カラム比・gap・折返しブレークポイントを機械可読に書く場所が存在しない

### A-2. レイアウトトークンが不在
- `design/tokens.json` のレイアウト系は `content.maxWidth: 1200px` と `content.readingWidth: 720px` のみ
- 存在しないもの: **ブレークポイント**（「狭幅」が何pxか未定義。320pxはルール散文にのみ登場）、
  2カラム比率、サイドナビ幅、アプリヘッダー高さ、コンテンツ左右パディング

### A-3. レイアウト実装部品（コンポーネント / CSSクラス）が不在
- `design/rules.json` は「CollectionRegion」(L182)「PageHeading」「BackNavigation」(L192) という部品名で語るが、
  その実体（CSSクラスもコンポーネントも）は `design/` にも `src/` にも存在しない
- `design/component-theme.css` は29行のHeroUI角丸アダプターのみ
- 結果: 実装AIは毎回、散文からflex/gridを再発明する（run間でレイアウトがブレる直接原因）

### A-4. レイアウト数値が画面固有Exampleにしかない
- 機械可読な数値契約は `design/examples/account-management.json` の `componentUsage` だけ
  （gapToPageHeading: space.4、gapAfterPageHeading: space.8、gapBeforeTable: space.3、SearchField 16rem、table列width%）
- 汎用の `pattern.page-layout` 側に数値ゼロ → **2画面目を作ると数値の根拠が消える**

## B. 供給の欠落 — 定義がAIに届かない

### B-5. variant指定が解決時に捨てられる
- `scripts/design-catalog.mjs:85-94` `resolvePatternRef` は `#collection-table` の存在を**確認するだけ**で、
  ファイル全体のリソースを返す。`resolveDesignContract` (L102-132) の出力 `resources` にvariantは反映されない
- 実出力 `HARNESS_RESOLVED.json` でも pattern.page-layout は1件のパスのみ（`requested.patterns` に文字列が残るだけ）
- → 実装AIは6 variant全文を渡され、どれを使うか**再推測**している
- TASKS.md L251「Page layout variantの選択基準を掲載する」(DH-242) が未完了なのと対応

### B-6. spacing-layout.json が孤児（かつ読解禁止）
- `design/patterns/spacing-layout.json` は唯一の余白契約（ページ内側 space.8、セクション間 space.8、グループ間 space.6 等）
- しかし**どのmanifestからも参照されていない**
- `skills/atlas-design-system/SKILL.md` L22 は "Read only the files returned in `resources`" と指示 → 物理的にコピーはされるが読むことを禁じられている
- `scripts/validate-design.mjs` に孤児Pattern検出がなくCIも通る

### B-7. 正本が二つあり値が食い違う（付随発見）
- DESIGN.md の表: body 14px / heading 18px / title 28px / label 13px / small 12px、background `oklch(0.985 0.004 255)`
- tokens.json → theme.css（実際に描画される側）: body **16px** / heading **20px** / title **32px**、background `oklch(0.978 0.008 265.9)`
- prompt.md は DESIGN.md を正と指示しているため、AIはどちらを信じるか判断できない
- **DESIGN.md の表が古い**（theme.css は tokens.json から生成され一致している）

## C. 検証の欠落 — 幾何を測っていない

### C-8. automaticルールが全て文字列マッチ
- `scripts/evaluate-experiment.mjs` は App.tsx / fixtures.ts / styles.css / component-theme.css の
  **4ファイルをテキストとして読むだけ**（L706-746）。ブラウザ・DOM不使用
- layout.narrow: `.mobile-list` 等のクラス名決め打ち＋@media有無（L433-447）。320pxで描画していない
- layout.collection-toolbar: `aria-label === "企業名で検索"` の日本語決め打ち（L534）
- layout.back-navigation: ASTの出現位置＋CSS文字列照合（L495-512）

### C-9. ai-review が未実装、判定の行き先もない
- layout.grouping（「セクション間をグループ内の2倍以上空ける」）は負margin正規表現のみで「2倍」を計測せず、
  ほぼ全runで "review" 判定 → その所見を記録する欄が comparison.json に存在しない
- TASKS.md L254「自動検証、AIレビュー、人の判断を区別する」が未完了なのと対応

### C-10. 幾何計測がほぼゼロ
- `scripts/capture-experiment.mjs` は 1440x900 / 390x844 のスクリーンショット撮影のみ
- 唯一の実測は Drawer閉じるボタンの boundingBox 24〜48px チェック（L46-51）
- 320px viewportなし、横スクロール検出なし、余白のpx実測なし
  （layout.narrow の定義文「320px幅で横スクロールを発生させない」を誰も測っていない）

### C-11. 評価器が account-management 専用＋run間の条件不一致
- `evaluate-experiment.mjs` L17-21 が account-management の example を静的 import → 2画面目に一般化しない
- mvp-10/harness の保存結果に layout.back-navigation が無い＝旧ルールセットのスナップショット。
  run間比較（baseline vs harness）が同条件でない。baselineが layout.narrow を常にpassするのは検査が緩い証拠

---

## 埋め方の方向性（各一言）

- A-1: pattern.schema.json の variant に `layout` オブジェクト（grid / columns / gap / breakpoint）を追加する
- A-2: tokens.json に `breakpoint.narrow` `layout.sidebarWidth` `layout.twoColumnRatio` 等を追加する
- A-3: CollectionRegion / PageHeading 等を design/ 側のCSS（またはコンポーネント）として実装し、契約と評価器が同じクラス名を共有する
- A-4: 汎用数値は pattern へ、画面固有の上書きだけ example へ移す
- B-5: variant指定を `resources` の中まで通す（選択variantのみ抽出 or variantを明記したメタを付ける）
- B-6: spacing-layout.json をmanifestに配線し、validate-design.mjs に孤児検出を足す
- B-7: DESIGN.md の表を tokens.json から生成して一本化する
- C-8〜10: capture-experiment.mjs を拡張し、320px描画＋横スクロール検出＋余白のboundingBox実測を automatic 判定に組み込む
- C-9: ai-review の実行系（スクショ＋ルール文をLLMに渡して判定を comparison.json に記録）を作る
- C-11: 評価器の example 参照を manifest 経由にし、全runを最新ルールで再評価する
