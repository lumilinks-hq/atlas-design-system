# 登壇前チェックリスト

## 前日まで

- Node.js 24とpnpm 11.13.1で`pnpm install --frozen-lockfile`を実行する
- `pnpm demo:check`と`pnpm test:e2e`を通す
- `/demo/runs/account-management?scene=issue`から4場面を左右キーで再生する
- `R`で最初へ戻り、下部ナビゲーションから途中開始できることを確認する
- `/play/account-management?mode=atlas&state=invalid-email`でDrawerと入力エラーを確認する
- Baselineへ切り替えても`state`が維持されることを確認する

## 会場・配信環境

- 1280×720または16:9でブラウザを表示し、各Sceneにスクロールがないことを確認する
- ブラウザの表示倍率を100%にする
- 通知、ブックマークバー、不要なタブを閉じる
- ネットワークを切り、Docs、Play、Presenterを再読み込みできることを確認する
- 予備として`pnpm build && pnpm preview`でも起動できるようにする

## 開始直前

- Issue場面を開く
- キーボードフォーカスが入力欄やSelectに残っていないことを確認する
- Atlas適用後と設計指示なしの違いを「初回の見た目」ではなく「検査して修正できるか」と説明する
