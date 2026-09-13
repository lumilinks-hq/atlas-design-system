# アクセシビリティ検査

`pnpm test:e2e`（`scripts/verify-site.mjs`）で、公開サイトに対して次を自動検査します。

## axe（WCAG 2.1 AA）

- ツール: `@axe-core/playwright` の `AxeBuilder`
- タグ: `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`（best-practice は対象外）
- ビューポート: 1440px と 390px
- 対象ページ: `/`, `/harness`, `/getting-started`, `/technical-specifications`, `/foundations`, `/components`, `/patterns/page-layout`, `/patterns/spacing-layout`, `/patterns/visual-grouping`, `/patterns/mobile-layout`, `/examples/account-management`, `/examples/account-management/results`, `/examples/invoice-management`, `/examples/invoice-management/results`, `/rules`, `/no-such-page`（404）
- violation が1件でもあれば失敗します。ルール単位の除外（`disableRules`）は行っていません。除外が必要になった場合は、理由とともにこのファイルに記録します。

## 200% 拡大（WCAG 1.4.10 リフロー）

ブラウザの拡大操作は自動化しにくいため、1440px の 200% に相当する 720px 幅のビューポートで横スクロールが出ないことを確認しています。横スクロール検査の幅は 1440 / 768 / 720 / 390 です。

## 404

存在しない path（`/no-such-page`）を開いたとき、URL を書き換えずに h1「ページが見つかりません」が表示されることを確認します。`/demo/runs/...` は従来どおり比較ページへ redirect されることを確認します。

## 除外した違反

なし。

## 検査で見つけて直した箇所

axe を導入した時点で見つかった違反と対処です。除外ではなく実装側で直しています。

| 場所 | 違反 | 対処 |
| --- | --- | --- |
| `/rules` の一覧 | `aria-required-children`（`role="row"` の子に cell がない） | 子要素へ `role="columnheader"` と `role="cell"` を付けた |
| 390px の table wrapper と import 文の `code` | `scrollable-region-focusable` | `tabIndex={0}` を付けてキーボードで横スクロールできるようにした |
| `/harness` の React Flow attribution リンク | `color-contrast` | `styles.css` で文字色を `--dh-text-muted` に上書き |
| HeroUI の danger ボタン、table の列見出し、フィールド説明文、success の soft Chip | `color-contrast`（HeroUI 既定色） | `design/component-theme.css` で `--danger` `--success` `--muted` と success soft Chip の前景・背景を Atlas トークンへ寄せた |

