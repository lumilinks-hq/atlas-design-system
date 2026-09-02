# CHANGELOG

`design/`配下の契約の変更履歴を記録する。契約の変更は、このファイルと各契約ファイルの`version`で追跡する。

`version`の上げ方は次のとおり。

- **major**: 互換のない変更、または項目の削除
- **minor**: 互換を保った追加
- **patch**: 意味を変えない誤記の修正

このファイルが扱うのは契約のversionであり、`package.json`のversionとは別に管理する。

## 1.0.0 - 2026-09-02

契約セットの初期リリース。この時点の内容は次のとおり。

- コンポーネント契約15件（`design/components/`）
- パターン契約2件（`design/patterns/`）
- Example契約1件（`design/examples/`）
- ルール28件（`design/rules.json`）
- デザイントークン7分類（color、space、radius、shadow、content、breakpoint、type）

初期リリースまでに入れた主な変更は次のとおり。

- 評価器をルール28件へ対応させ、Exampleの`componentUsage`が指定した部品を実装で使っているかを検査する`component.usage`を追加した
- `layout`契約を機械可読にし、パターンのvariantがbreakpoint、CSSクラス、トークン参照を持つようにした
- どのExampleからも参照されていないnumber-fieldの契約と、`layout`を持たないまま残っていたpage-layoutのvariant 3件を削除した
- component、pattern、Exampleの各スキーマへ`version`を必須項目として追加した（型は文字列。書式はスキーマでは制約せず、上記の方針を運用で守る）
