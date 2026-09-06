`brief.md`の要件を実装してください。

`HARNESS.json`が存在する場合は、`$atlas-design-system`、`$heroui-react`、`$ui-writing`を使って実装してください。実装前に`HARNESS_RESOLVED.json`と`DESIGN.md`を読み、解決済みのpattern、variant、example、component、ruleを正として扱います。HeroUIのAPI、compound component、標準スタイルは`heroui-react`、Atlasで許可する選択肢は設計契約、日本語UI文言は`ui-writing`に従ってください。参照したIDと採用した判断を最終報告へ記録してください。

`HARNESS.json`が存在しない場合は`brief.md`だけを入力として実装してください。どちらの条件でも既存ファイルの責務を保ち、必要な画面状態と機能を実装し、画面が仕上がった時点で`pnpm check`を一度だけ実行し、報告された失敗をまとめて解消してください。編集のたびに`pnpm lint`や`pnpm test:run`を個別に実行しないでください。最後に`pnpm build`が通ることを確認してください。依存関係は追加しないでください。
