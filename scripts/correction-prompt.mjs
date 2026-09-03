// harness-corrected（run-experiment）と experiment:refine の両方が使う修正プロンプト。
// 2 箇所で内容が食い違うと修正 Run の再現性が崩れるため、ここに 1 本化している。
export const correctionPrompt = [
  "$atlas-design-system、$heroui-react、$ui-writingを使い、VALIDATION.mdの失敗項目、pnpm exec tsc -p tsconfig.app.json --pretty false --noUncheckedIndexedAccess、pnpm test:runで再現する失敗だけを修正してください。",
  "各項目の証拠と修正指示を文字通り確認し、削除対象として挙がったUIは別部品へ置き換えず削除してください。",
  "修正方法はHARNESS_RESOLVED.jsonが指すAtlas契約（screensのvariant、pattern・componentのlayout、exampleのcomposition、design/layout.cssのクラス）に従い、レイアウトを独自に再発明しないでください。",
  "DESIGN.mdとdesign/は変更せず、既存の画面要件と機能を保ってください。",
  "テストではHeroUI操作前にfake timersを有効化するとuserEventやDrawerの完了処理が停止するため、操作はreal timersで行い、保存完了だけwaitForで待ってください。",
  "調査用に追加した一時テストやconsole.logは、比較対象の成果物に混ざるため修正完了前に削除してください。",
  "修正後に厳格typecheck、test:run、buildを実行してください。",
].join("");
