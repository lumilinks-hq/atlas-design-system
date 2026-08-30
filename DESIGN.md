---
generated: 2026-08-30
mode: hybrid
version: 2
platform: web
token_source: ./design/tokens.json
---

# Design System: Atlas

## TL;DR

- 北極星: 「整った業務台帳」— 状態、事実、次の操作を同じ順序で確認できる
- カラー: 明るいニュートラル基調。強い操作は`color.accent`の1色、状態色は意味を持つ場所だけに使う
- タイポグラフィ: 日本語UIは14pxを本文基準とし、見出し・本文・補助情報の4段階で構成する
- レイアウト: `pattern.page-layout`からvariantを選び、ページ見出しからコンテンツへ重要度順に配置する
- 死守ライン: 320px幅、200% zoom、キーボード操作でも主要情報・主要操作・回復方法を失わない

## Design Principles

### Creative North Star

**Metaphor:** 「整った業務台帳」— 利用者がページを開くたびに読み方を覚え直さず、現在の状態と判断材料を同じ位置から確認できる道具。

**This means:**

- ページの先頭に、対象、現在の状態、主要操作をまとめる
- 情報は業務オブジェクトの関係に沿ってセクション化する
- 数値と状態は走査しやすく揃え、装飾より比較を優先する
- 編集、確認、結果の順序を画面間で変えない
- 通常状態は静かに、失敗や権限制限は文言と操作で明示する

**This does NOT mean:**

- 紙の罫線、ファイル、台帳を模した装飾を使うことではない
- すべての情報を一画面へ詰め込むことではない
- 業務画面だから小さい文字や狭い操作対象を許容することではない

### When Principles Conflict

- 一覧性と可読性が衝突する → 14px本文と1.6の行間を保ち、列や情報を次画面へ分ける
- デスクトップの同時参照と狭幅の操作性が衝突する → 狭幅では1カラムまたは別画面を選び、横スクロールを増やさない
- 画面固有の便利さと既存Patternが衝突する → 業務上の根拠がある場合だけExampleへ例外を記録し、Pattern自体へ暗黙に混ぜない
- AIの初回出力と検査結果が衝突する → 検査結果を優先し、同じRunへ修正指示として戻す

### Global Constraints

- React 19、TypeScript、HeroUI v3を使う
- HeroUIで提供される操作部品を独自HTMLで再実装しない → `design/components/*.json`の契約から選ぶ
- JSXやCSSへ色コードを直接書かない → `design/tokens.json`から生成した`--dh-*`を使う
- 1画面で塗りの主要ボタンは一つにする → 補助操作はsecondaryまたはghostを使う
- 状態を色だけで伝えない → 状態名、アイコン、回復操作を併記する
- フォームのsubmitは入力前から操作可能にし、submit時に検証して対象入力の近くへ回復方法を表示する
- WCAG 2.2 AAを最低基準とし、本文コントラスト4.5:1、UI境界とフォーカス3:1を満たす
- `prefers-reduced-motion`を尊重し、意味のない自動アニメーションを追加しない
- Dark Mode: not planned

## Visual Language

### Mood & Tone

正確、落ち着き、明瞭。長時間使う業務道具として、親しみや華やかさより判断の速さを優先する。

### Visual Characteristics

- **階層:** 余白を第一、サーフェス色差を第二、区切り線を第三の手段にする
- **角丸:** 通常は8px。カプセル型と正円だけを用途が明確な例外として使う
- **影:** Cardは`shadow.raised`を標準とし、Drawer、Dialog、Popoverなど一時的な層にはより強い影を使う
- **密度:** テーブルと一覧は14px基準。ページ見出しとセクション間には32px以上を確保する
- **アイコン:** Lucideの線画を使い、文字と組み合わせる。アイコンだけの操作には必ず名前を付ける

**自由領域:** データの特徴を伝える小さな可視化や空状態の構成。業務台帳に短い注釈を加えるように、判断を早める範囲で工夫してよい。

## Color Strategy

### Palette

| Intent | Token | Value | Do | Don't |
|---|---|---|---|---|
| Page background | `color.background` | `oklch(0.985 0.004 255)` | アプリケーション全体の背景 | カード背景として使わない |
| Surface | `color.surface` | `oklch(1 0 0)` | カード、テーブル、固定パネル | ページ全体を白一色にしない |
| Muted surface | `color.surfaceMuted` | `oklch(0.965 0.006 255)` | 入力背景、補助領域、コード領域 | 主要操作の強調に使わない |
| Primary text | `color.text` | `oklch(0.25 0.02 255)` | 見出し、本文、主要数値 | 大面積の背景に使わない |
| Secondary text | `color.textMuted` | `oklch(0.52 0.02 255)` | 説明、メタ情報、補助ラベル | 12px未満の文字に使わない |
| Border | `color.border` | `oklch(0.9 0.01 255)` | テーブル罫線、セクション境界 | テキスト色として借用しない |
| Primary action | `color.accent` | `#0d0bb6` | 主要ボタン、リンク、選択状態。本家Design Harnessとの接点 | 装飾や通常見出しに使わない |
| Accent background | `color.accentSoft` | `oklch(0.94 0.035 265.9)` | 選択行、補助的な強調背景 | 白文字を直接載せない |
| Success | `color.success` | `oklch(0.50 0.13 155)` | 保存完了、正常状態 | 通常操作のアクセントに使わない |
| Warning | `color.warning` | `oklch(0.52 0.14 80)` | 注意、期限接近 | エラーや破壊操作に使わない |
| Danger | `color.danger` | `oklch(0.54 0.2 25)` | エラー、削除、失敗 | 通常操作や強調に使わない |
| Focus | `color.focus` | `oklch(0.65 0.18 265.9)` | 2pxのフォーカスリング | 文字色として使わない |

### Color Rules

#### 台帳の一色 Rule

操作を示すアクセントは`color.accent`だけにする。success、warning、dangerは状態の意味がある場所へ限定し、必ず文字かアイコンを添える。

#### 静かな正常 Rule

正常なデータ行を緑で塗らない。通常状態は`color.text`と`color.surface`で表示し、確認が必要な状態だけを意味色で示す。

<!-- コントラスト検証 2026-08-30, Chromium computed sRGB:
  color.text × color.surface = 16.03:1
  color.textMuted × color.surface = 5.49:1
  color.textMuted × color.surfaceMuted = 4.97:1
  color.accent × color.surface = 12.07:1
  white × color.accent = 12.07:1
  color.accent × color.accentSoft = 10.08:1
  color.success × color.surface = 5.58:1
  color.warning × color.surface = 5.60:1
  color.danger × color.surface = 5.60:1
  color.focus × color.surface = 3.30:1
  color.focus × color.background = 3.16:1
-->

## Typography

### Scale

**原則:** 日本語の業務UIは14pxを基準とし、階層はサイズを増やしすぎず、weightと余白で補う。

| Context | Token | Font | Size | Weight | Line Height | Reasoning |
|---|---|---|---|---|---|---|
| Page title | `type.title` | system sans | 28px | 650 | 1.25 | 対象画面の識別と視線の起点 |
| Section heading | `type.heading` | system sans | 18px | 650 | 1.4 | 情報群の境界を明示する |
| Body / table | `type.body` | system sans | 14px | 400 | 1.6 | 日本語の可読性と業務画面の密度を両立する |
| UI label | `type.label` | system sans | 13px | 500 | 1.5 | ボタン、入力、ナビゲーション |
| Caption / metadata | `type.small` | system sans | 12px | 400 | 1.4 | 補助情報の下限。これ未満にしない |

### Rules

- ページタイトル、セクション見出し、本文の順にサイズとweightを下げる
- 3行以上になる説明文はline-height 1.6以上にする
- 数値、席数、件数、日付には`font-variant-numeric: tabular-nums`を使う
- 見出しは`text-wrap: balance`、短い説明は`text-wrap: pretty`を使う
- 長い説明は最大60–75文字相当に制限する
- モバイルの入力文字は16pxを下回らない

**自由領域:** 数値の強調方法。サイズかweightのどちらか一方で差をつけ、色だけに頼らなければ調整してよい。

## Spacing & Layout

### Spacing Scale

**原則:** 4pxを基準にし、グループ間はグループ内の2倍以上空ける。

| Token | Value | Use case | Reasoning |
|---|---|---|---|
| `space.1` | 4px | ラベル内、アイコンの微調整 | 最小の関係を示す |
| `space.2` | 8px | アイコンと文字、同一情報内 | 強く関連する要素をまとめる |
| `space.3` | 12px | 隣接する入力、ボタン群 | 操作対象を分離する |
| `space.4` | 16px | 小さいコンテナ内 | 標準の内側余白 |
| `space.6` | 24px | カード内、見出しと本文 | 情報群の内部を整える |
| `space.8` | 32px | セクション間 | グループ境界を示す |
| `space.12` | 48px | ページ内の大きな区切り | 別の目的を持つ領域を分ける |

### Shadow

**原則:** 構造は境界線と余白、前後関係は影で示す。Cardは通常状態のborderを持たず、背景から一段持ち上げるため`shadow.raised`を標準とする。境界は選択やフォーカスなど、状態を示す場合だけ加える。

| Token | Use case | Reasoning |
|---|---|---|
| `shadow.none` | Table、影を持たないフラットな領域 | 同じ階層の構造を影で持ち上げない |
| `shadow.raised` | Card | 背景から一段だけ離れていることを示す |
| `shadow.dragging` | ドラッグ中の要素 | 操作中の要素がCardより手前にあることを示す |
| `shadow.overlay` | Drawer、Dialog、Popover | 通常の画面より前にある一時的な層を示す |
| `shadow.floating` | Toast、画面上に固定する操作 | 他のオーバーレイより前にある状態を示す |

### Page Layout Selection

Patternの正本は`design/patterns/page-layout.json`。Issue固有の画面名ではなく、業務オブジェクトの関係からvariantを選ぶ。

| Variant | Use when | Narrow behavior | Reasoning |
|---|---|---|---|
| `collection-table` | 複数オブジェクトを属性で比較する | `collection-list`へ切り替える | 横方向の比較は広い画面で価値がある |
| `collection-list` | 狭い領域で識別情報と状態を順に見る | 主要属性だけを1行へ置く | 水平スクロールを避ける |
| `single-one-column` | 一つのオブジェクトを並列なセクションで見る | 重要度順の1カラムを維持する | 最も予測しやすい詳細構造 |
| `single-two-column` | 主情報を扱いながら副情報を参照する | 主情報と副情報を1カラムへ積む | 重要度の差を幅で表現する |
| `side-navigation` | 多数・階層的な項目を頻繁に切り替える | ナビゲーションを別画面へ移す | コンテンツ幅を守る |
| `collection-detail` | 一覧の対象を頻繁に切り替えて詳細を見る | 一覧と詳細を二つのページに分ける | 選択文脈を保つ |

### Page Anatomy

1. アプリケーションヘッダー
2. ページ見出し: タイトル、リード文、状態、主要操作
3. 補助ナビゲーション: 必要な場合だけ
4. コンテンツ領域: セクションを重要度順に配置
5. フィードバック領域: loading、empty、error、permission-limited

#### 台帳見出し Rule

最初のviewportで対象、状態、主要操作を確認できるようにする。主要操作はページ見出し領域に一つだけ置く。

#### 一件一列 Rule

単一オブジェクトの詳細は`single-one-column`から始める。主情報と副情報の役割が明確で、同時参照が業務効率を上げる場合だけ`single-two-column`へ変更する。

#### 狭幅積み替え Rule

320px幅では複数カラムを1カラムへ積み替える。テーブルはリストへ変え、コンテンツ領域全体の横スクロールを使わない。

**自由領域:** セクション内の具体的なグリッド。業務上比較する情報が同時に見え、狭幅で順序を保てる範囲で設計してよい。

## Effects

### Radius Scale

| Token | Value | Use case | Reasoning |
|---|---|---|---|
| `radius.base` | 8px | ボタン、入力、Card、Table、Dialog、Toast | 通常の操作部品と面を一つの値で統一する |
| `radius.pill` | 999px | Chip、短いステータスラベル | 横長の独立したラベルに限定する |
| `radius.circle` | 50% | ドット、正方形の番号やアイコン背景 | 幅と高さが同じ要素を正円にするときだけ使う |

### Surface Rules

- 固定表示のセクションは余白か1px borderで区切る
- Tableの行境界は走査性のためborderを使う
- Drawer、Dialog、PopoverはHeroUI標準のelevationを使う
- Card内へCardを重ねない → 小見出しと余白で下位グループを表す

## Component Patterns

### Selection Guide

| Situation | Component | Reasoning |
|---|---|---|
| 主要操作 | `component.button` primary | 一画面の視線の起点を一つにする |
| 補助操作 | `component.button` secondary / ghost | 主要操作と競合させない |
| 構造化データの比較 | `component.table` | 行と列を走査できる |
| 状態表示 | `component.chip` + text | 色以外でも状態を理解できる |
| 軽い編集 | `component.drawer` | 元の閲覧文脈を保つ |
| 契約・権限・削除の確定 | `component.alert-dialog` | 結果と変更前後を確認する |
| 入力固有の失敗 | NumberField / Selectのinline error | 対象と回復方法を近接させる |
| 保存結果 | `component.toast` + 文脈内状態 | 一時通知だけに結果を依存しない |

### Composition Rules

#### 一操作 Rule

塗りの主要操作は一画面に一つ。補助操作が3個以上になる場合は、優先順位を見直すかメニューへまとめる。

#### 追記可能 Rule

Loading、Success、Failure、Unauthorized、Invalidを通常画面と同じ構造の中で表現する。状態ごとに別のレイアウトを発明しない。

#### 編集分離 Rule

一覧や詳細の軽い編集はDrawerへ分離する。複数セクションにまたがる編集や長い入力は別ページを使う。

### State Handling

| State | Visual | Reasoning |
|---|---|---|
| Default | 通常のsurfaceとtext | 基準状態 |
| Hover | 役割に応じて背景色または下線を変える | 操作可能性を示す |
| Focus | `color.focus`の2px ring、offset 2px以上 | キーボード位置を示す |
| Active | 背景色の変化と0.96 scale | 押下を即時に返す |
| Disabled | 見た目を弱め、近くに理由を表示する | 操作できない理由を隠さない |
| Loading | 元のラベルを残してSpinnerを併記し、二重送信を止める | 処理内容を保つ |
| Error | 対象の近くに原因と次の操作を表示する | 回復経路を明確にする |

**自由領域:** Hoverと空状態の表現。150ms以下、`prefers-reduced-motion`対応、静的な状態手掛かりを残す範囲で調整してよい。

## Design Token References

### Sources

- `design/tokens.json` — color、spacing、radius、content width、typeの値
- `design/components/*.json` — HeroUIコンポーネントの許可variantと必須状態
- `design/patterns/page-layout.json` — Page Layoutのanatomyとvariant
- `design/examples/*.json` — Issue固有のPattern適用例
- `design/rules.json` — automatic、ai-review、humanの検査ルール

### Resolution Order

1. `HARNESS.json.designRefs`で対象Pattern、variant、Exampleを特定する
2. `DESIGN.md`で全体の判断基準を読む
3. Patternで画面構造を決める
4. ExampleでIssue固有の構成、状態、業務制約を追加する
5. Component契約でHeroUIの部品とvariantを選ぶ
6. Ruleを実装後の検査へ使い、失敗は同じRunへ修正指示として戻す

書かれていない視覚表現は自由に設計してよい。ただし、Pattern、Component、Ruleの参照IDを置き換えたり、検査を回避する独自部品を追加してはいけない。
