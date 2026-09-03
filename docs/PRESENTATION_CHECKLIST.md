# 登壇前チェックリスト

## 前日まで

- Node.js 24とpnpm 11.13.1で`pnpm install --frozen-lockfile`を実行する
- `pnpm demo:check`と`pnpm test:e2e`を通す
- `/harness`でDesign Harnessの4層のループ図（React Flow）が矢印4本付きで表示され、層をクリックすると下のファイル表（ファイル／役割）が切り替わること、「顧客管理での1周」が6ステップの図（React Flow）で矢印5本付きで表示され、04と06に違反数（初回4件→修正版0件）が出ることを確認する
- `/examples/account-management/results`で一覧・詳細・モバイルの画面切替と、ルールごとの検査結果を確認する
- `/play/account-management?mode=atlas&state=invalid-email`でDrawerと入力エラーを確認する
- Baselineへ切り替えても`state`が維持されることを確認する

## 会場・配信環境

- 16:9でブラウザを表示し、比較ページの2カラムが横に並ぶ幅（801px以上）にする
- ブラウザの表示倍率を100%にする
- 通知、ブックマークバー、不要なタブを閉じる
- ネットワークを切り、Docs、Design Harnessの説明、生成結果の比較、Playを再読み込みできることを確認する
- 予備として`pnpm build && pnpm preview`でも起動できるようにする

## 開始直前

- `/harness`を開き、続けて`/examples/account-management/results`を別タブで開いておく
- キーボードフォーカスが入力欄やSelectに残っていないことを確認する
- Atlas適用後と設計指示なしの違いを「初回の見た目」ではなく「検査して修正できるか」と説明する
