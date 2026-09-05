# 公開データの基準

Atlasの比較デモは、結果だけでなく生成条件と修正過程を検証できることを優先する。

## 公開するもの

- Issue相当のBrief、共通starter、manifest、実行prompt
- Baseline、Harness初回、Harness修正版の`run.json`
- 設計評価、比較結果、生成ソース、差分、検証ログ
- 一覧、詳細、モバイル、エラー状態のスクリーンショット
- sanitize済みのイベントログと標準エラーログ

イベントログは生成過程の根拠として残す。ただしworkspace（既定は`~/.cache/design-harness/runs/`、`DESIGN_HARNESS_RUNS_DIR`で変更可）にある未加工データは公開せず、`experiments/`へ保存したsanitize済み成果物だけを対象にする。sanitizeはworkspaceの絶対パスを`<workspace>`へ畳む。

## 公開しないもの

- APIキー、token、Cookie、認証情報
- 端末の絶対パス、ユーザー名、内部URL、非公開リポジトリ名
- Codexや他ツールの認証設定
- Issueの範囲外で読み込まれた端末内ファイル
- 実在の顧客、会社、担当者を識別できるデータ

## 公開前の確認

```bash
pnpm runs:sanitize --pair <PAIR_ID>
pnpm public:audit
pnpm demo:check
```

account-management以外の実験では`runs:sanitize`へ`--experiment <name>`を足す。

`runs:sanitize`は実行端末のOSユーザー名を`<user>`へ置き換え、`public:audit`は同じ名前が残っていないかを検査する。別端末で作った成果物を検査する場合は`ATLAS_AUDIT_USERNAMES`へカンマ区切りで名前を追加する。CIでは実行ユーザー名が`runner`のような一般語になるため、置き換えと検査のどちらも行わない。

`public:audit`は文字列検査であり、公開承認ではない。差分、画像、イベントログは人が開き、生成過程の説明に必要か、権利と機密性に問題がないかを確認する。
