# プロンプト監査レポート（2026-09-03）

`/claude-api prompt-audit` の実行結果。所見 1〜5 は 2026-09-03 に適用済み（下記「適用結果」参照）。末尾の提案 diff は監査時点の案で、所見 3 は方針変更により実装が異なる。

## 前提（Step 0）

| 項目 | 内容 |
| --- | --- |
| 対象範囲 | リポジトリ全体のプロンプト面。`.runs/**`、`experiments/**/runs/**`（Run 成果物のコピー）、`dist/`、`node_modules/` は対象外 |
| 対象モデル | OpenAI `gpt-5.4`（`scripts/run-experiment.mjs:18` の既定値）。実行経路は Codex CLI `codex exec` のみ |
| プロバイダ | Anthropic SDK は不在。Anthropic API 固有の置き換え（structured outputs、thinking 設定、prefill）は提案しない。SDK の切り替えも提案しない |
| 確信度の上限 | 監査ガイドの根拠は Claude の挙動に基づく。gpt-5.4 には類推でしか適用できないため、全所見を Medium 以下に抑えた |
| 言語 | TypeScript / Node（`package.json`） |

## 棚卸し（Step 1）と由来（Step 2）

| ファイル | 種別 | 到達経路 | 由来 |
| --- | --- | --- | --- |
| `experiments/account-management/prompt.md` | ベースプロンプト | `run-experiment.mjs:101` | 2026-08-31〜09-02、gpt-5.4 向けに新規作成 |
| `experiments/account-management/brief.md` | 要件（context） | ワークスペースへコピー | 同上 |
| `scripts/run-experiment.mjs:102` | 修正プロンプト（短） | `harness-corrected` モード | 同上 |
| `scripts/refine-experiment.mjs:50` | 修正プロンプト（長） | `experiment:refine` | 同上 |
| `scripts/review-experiment.mjs:58-63` | レビュープロンプト | `experiment:review` | 同上 |
| `scripts/mcp/server.mjs:15,27-31` | MCP tool / resource 説明 | MCP クライアント | 同上 |
| `skills/atlas-design-system/SKILL.md` | Agent Skill（自作） | `.agents/skills/` へコピー | 同上 |
| `skills/heroui-react/SKILL.md` | Agent Skill（上流 vendored、`skills.lock.json` で ref 固定） | 同上 | 上流 heroui-inc/heroui |
| `skills/ui-writing/SKILL.md` + references | Agent Skill（自作） | 同上 | 2026-08-31〜09-02 |
| `DESIGN.md`、`design/rules.json` | 設計契約（context） | コピー / `ruleText` | 2026-08-30〜 |

引退モデル向けの化石は存在しない。全文がこの 4 日間に対象モデル向けに書かれている。

## 所見（Step 5）

集計: Group 1（過剰な steering）4 件（修正提案 2、フラグのみ 2）、Group 2（重複・単発事故ルール）2 件、Group 3（不足）1 件、Group 4（呼び出し構造）0 件。合計 7 件。

上位 3 件:
1. MCP tool 説明の不足（追加）
2. 修正プロンプトが 2 箇所で食い違う（統合）
3. レビュー出力の JSON 強制と波括弧切り出しを `--output-schema` へ置き換え

### 1. MCP tool / resource の説明が薄い

- 場所: `scripts/mcp/server.mjs:15`、`scripts/mcp/server.mjs:27-31`
- 根拠: description が 1 文。`patterns`/`examples` は `z.array(z.string())` のみで ID 形式の説明なし。返り値の形、未知 ID 時のエラー、使わない場面の記述なし。resource の description には `resource.path` がそのまま入っている
- パターン: Group 3 説明不足
- 理由: tool 呼び出しの品質は description で決まる。ID 形式（`pattern.page-layout#collection-table`、`example.account-management`）を知らないモデルは推測で呼ぶ
- 確信度: Medium
- アクション: add。`scripts/mcp/server.test.mjs` は description を検証していないので変更は安全

### 2. 修正プロンプトが 2 箇所にあり内容が食い違う

- 場所: `scripts/run-experiment.mjs:102`、`scripts/refine-experiment.mjs:50`
- 根拠: 同じ「VALIDATION.md の失敗を直す」用途で、短い版は「独自 HTML へ置き換えない」、長い版は「Atlas 契約に従う、DESIGN.md を変更しない、fake timers…」と指示集合が異なる
- パターン: Group 2 重複が乖離
- 理由: どちらの経路を通ったかで修正 Run の挙動が変わり、比較実験の再現性を損なう
- 確信度: Medium
- アクション: move。共通モジュールへ 1 本化し両スクリプトから import する

### 3. レビュー出力の JSON 強制 + 波括弧切り出し

- 場所: `scripts/review-experiment.mjs:62`、`scripts/review-experiment.mjs:12-22`
- 根拠: 「出力は次のJSONのみとします」と指示し、`parseReviewFindings` が最初の `{` から最後の `}` を切り出して `JSON.parse`。失敗時は `raw` へフォールバック。`buildReviewArgs` は `--json` を渡していないので stdout は人間向けテキストで、前置きやコードフェンスを想定した切り出しになっている
- パターン: Group 1b JSON 強制スタック
- 理由: 対象は Codex CLI であり、`codex exec --output-schema <FILE>` が最終応答の JSON Schema を受け付ける（`codex exec --help` で確認済み）。プロンプトの強制文と正規表現パーサは不要になる
- 確信度: Medium（Codex 側の schema 準拠の厳密さは未検証）
- アクション: replace-with-API-feature。`scripts/review-experiment.test.mjs` の `parseReviewFindings` テストも更新対象

### 4. `debug.test.tsx` の単発事故ルール

- 場所: `scripts/refine-experiment.mjs:50`
- 根拠: 「debug.test.tsxは残さないでください。」に理由がなく、特定 Run で残ったファイル名を指している
- パターン: Group 2 recency trap
- 理由: 別名の一時テストには効かない。理由付きの一般ルールへ言い換えるべき
- 確信度: Medium
- アクション: rewrite。なお fake timers の文は理由付きで対象モデルの実際の失敗を防いでいるため維持

### 5. 非対話実行で「Stop and ask」

- 場所: `skills/atlas-design-system/SKILL.md:12`
- 根拠: "Stop and ask for the missing business decision…"。実行は `codex exec --approve-for-me --ephemeral` で応答者がいない
- パターン: Group 1d 実行不能な指示
- 理由: 従うと Run が中断し成果物が出ない。従わないと指示が無視される前例を作る
- 確信度: Medium
- アクション: rewrite。brief.md から判断し、仮定を最終報告へ記録する形へ

### 6. heroui-react Skill の CRITICAL 密度と「docs を取得せよ」の 3 回反復

- 場所: `skills/heroui-react/SKILL.md:23-27,36,59,74,111,172-177`
- 根拠: "CRITICAL"、"DO NOT"、"MANDATORY"、"Always fetch v3 docs" が 3 箇所
- パターン: Group 1a 圧力語、Group 1c 反復
- 理由: v2/v3 混同は現行モデルでも起きる実害なので内容自体は keep-list 該当。反復と圧力語だけが過剰
- 確信度: Low
- アクション: flag。上流 ref 固定のため local 編集は vendoring を壊し `designContractSha256` も変わる。直すなら上流へ PR

### 7. heroui-react の Next.js App Router 節

- 場所: `skills/heroui-react/SKILL.md:123-170`
- 根拠: Vite プロジェクトに不要なセットアップ手順
- パターン: Group 1c 無関係 context
- 確信度: Low
- アクション: flag（同上の理由で diff 対象外）

### 8. Skill 内の事実確認（問題なし）

`atlas-design-system/SKILL.md` が参照する `pnpm design:check`、`scripts/resolve-design-contract.mjs`、`design/layout.css`、`resources` キーはすべて存在を確認した。修正不要。

### クリーン

`prompt.md`（`$skill` 表記は Codex の呼び出し構文で routing text）、`brief.md`、`ui-writing`、`DESIGN.md`、`design/rules.json` の ai-review 5 件。sampling パラメータや thinking 設定の化石なし。

### Group 4

呼び出しは run / refine / review の 3 箇所で、いずれもモデル判断が必要な処理。コードへ移す対象なし。`run.json` にトークン使用量が記録されていないため、`--json` のイベントから usage を保存することを勧める（コスト最適化の前提）。

## 適用結果

| 所見 | 実装 | テスト |
| --- | --- | --- |
| 1 | `scripts/mcp/server.mjs` の tool/resource 説明と `.describe()` | `scripts/mcp/server.test.mjs` に説明文の検証を追加 |
| 2 | `scripts/correction-prompt.mjs` を新設し run / refine から import | `scripts/correction-prompt.test.mjs` |
| 3 | `--output-schema` は Codex 固有なので不採用。プロンプトの JSON 指定は残し、`parseReviewFindings` を zod で形検証する実装に変更（プロバイダ中立） | `scripts/review-experiment.test.mjs` に不正 verdict / 複数 JSON のケースを追加 |
| 4 | `debug.test.tsx` の名指しを理由付きの一般ルールへ | 所見 2 のテストで検証 |
| 5 | `skills/atlas-design-system/SKILL.md:12` を非対話向けに書き換え。次の Run から `designContractSha256` が変わる | なし（Skill 本文） |

## 提案 diff（Step 6・監査時点の案）

High/Medium の所見 1〜5 のみ。1 所見 1 hunk。適用は未実施。

### 所見 1: `scripts/mcp/server.mjs`

```diff
-      { title: resource.name, description: resource.path, mimeType: resource.mimeType },
+      {
+        title: resource.name,
+        description: `Atlas design resource "${resource.id}" (${resource.path}). Read-only. Fetch it only when resolve_design_contract lists this id in its resources array.`,
+        mimeType: resource.mimeType,
+      },
@@
-      description: "Resolve Atlas Pattern and Example IDs to the minimum read-only resource set needed for implementation.",
+      description: [
+        "Resolve Atlas Pattern and Example IDs to the minimum read-only set of design resources needed to implement a screen.",
+        "Call this once before reading any Atlas file. It returns { version, requested, screens, resources }; resources lists the exact resource URIs to read (the shared design docs, the requested patterns and examples, and the HeroUI components each example depends on).",
+        "IDs look like \"pattern.page-layout#collection-table\" (pattern id with optional #variant) and \"example.account-management\". At least one pattern or example is required. An unknown pattern or example id, or an unknown component referenced by an example, throws an error; nothing partial is returned.",
+        "Do not call it to browse the catalog; list resources instead.",
+      ].join(" "),
       inputSchema: {
-        patterns: z.array(z.string()).default([]),
-        examples: z.array(z.string()).default([]),
+        patterns: z.array(z.string()).default([]).describe('Pattern ids from HARNESS.json designRefs, e.g. "pattern.page-layout#collection-table". Empty when the screen has no pattern.'),
+        examples: z.array(z.string()).default([]).describe('Example ids, e.g. "example.account-management". Empty when no example applies.'),
       },
```

### 所見 2: 修正プロンプトの統合

新規 `scripts/correction-prompt.mjs` を作り、両スクリプトから import する。文面は refine 側を逐語で採用する（`debug.test.tsx` の文は所見 4 で扱うためここでは触らない）。`tsconfig.app.json` と `test:run` スクリプトは存在を確認済み。

```diff
--- /dev/null
+++ scripts/correction-prompt.mjs
+export const correctionPrompt = [
+  "$atlas-design-system、$heroui-react、$ui-writingを使い、VALIDATION.mdの失敗項目、pnpm exec tsc -p tsconfig.app.json --pretty false --noUncheckedIndexedAccess、pnpm test:runで再現する失敗だけを修正してください。",
+  "各項目の証拠と修正指示を文字通り確認し、削除対象として挙がったUIは別部品へ置き換えず削除してください。",
+  "修正方法はHARNESS_RESOLVED.jsonが指すAtlas契約（screensのvariant、pattern・componentのlayout、exampleのcomposition、design/layout.cssのクラス）に従い、レイアウトを独自に再発明しないでください。",
+  "DESIGN.mdとdesign/は変更せず、既存の画面要件と機能を保ってください。",
+  "テストではHeroUI操作前にfake timersを有効化するとuserEventやDrawerの完了処理が停止するため、操作はreal timersで行い、保存完了だけwaitForで待ってください。",
+  "debug.test.tsxは残さないでください。",
+  "修正後に厳格typecheck、test:run、buildを実行してください。",
+].join("");
--- scripts/run-experiment.mjs
+import { correctionPrompt } from "./correction-prompt.mjs";
@@
-  const correctionPrompt = "VALIDATION.mdの失敗項目を確認し、...再実行してください。";
   const prompt = mode === "harness-corrected" ? correctionPrompt : basePrompt;
--- scripts/refine-experiment.mjs
+import { correctionPrompt } from "./correction-prompt.mjs";
@@
-  const prompt = "$atlas-design-system、$heroui-react、$ui-writingを使い、...buildを実行してください。";
+  const prompt = correctionPrompt;
```

### 所見 3: `--output-schema` へ置き換え

```diff
--- /dev/null
+++ design/schemas/review-findings.schema.json
+{
+  "type": "object",
+  "additionalProperties": false,
+  "required": ["findings"],
+  "properties": {
+    "findings": {
+      "type": "array",
+      "items": {
+        "type": "object",
+        "additionalProperties": false,
+        "required": ["ruleId", "verdict", "note"],
+        "properties": {
+          "ruleId": { "type": "string" },
+          "verdict": { "type": "string", "enum": ["pass", "concern"] },
+          "note": { "type": "string" }
+        }
+      }
+    }
+  }
+}
--- scripts/review-experiment.mjs
-export function parseReviewFindings(text) {
-  const start = text.indexOf("{");
-  const end = text.lastIndexOf("}");
-  ...
-}
+export function parseReviewFindings(text) {
+  try {
+    const parsed = JSON.parse(text);
+    return Array.isArray(parsed?.findings) ? parsed.findings : null;
+  } catch {
+    return null;
+  }
+}
@@ buildReviewArgs（引数に lastMessagePath を追加）
-export function buildReviewArgs({ model, images, prompt }) {
+export function buildReviewArgs({ model, images, prompt, lastMessagePath }) {
@@
+    "--output-schema", resolve(rootDir, "design", "schemas", "review-findings.schema.json"),
+    "--output-last-message", lastMessagePath,
@@ reviewRun
   const evaluationPath = resolve(outputDir, "design-evaluation.json");
+  const lastMessagePath = resolve(outputDir, "review-last-message.json");
@@
-  const result = await runCodex(buildReviewArgs({ model: run.environment.model, images, prompt }));
+  const result = await runCodex(buildReviewArgs({ model: run.environment.model, images, prompt, lastMessagePath }));
@@ prompt
     "各ルールについて verdict は pass か concern のどちらかとし、根拠を画面上の観察として1〜2文で書いてください。",
-    '出力は次のJSONのみとします: {"findings":[{"ruleId":"...","verdict":"pass|concern","note":"..."}]}',
   ].join("\n\n");
@@
-  const findings = parseReviewFindings(result.stdout);
+  const findings = parseReviewFindings(await readFile(lastMessagePath, "utf8"));
```

`scripts/review-experiment.test.mjs` の更新:

```diff
   it("可変長の-iにpromptが飲まれないよう--区切りの後にpromptを置く", () => {
     const args = buildReviewArgs({
       model: "gpt-5.4",
       images: ["/shots/a.png", "/shots/b.png"],
       prompt: "レビューしてください",
+      lastMessagePath: "/out/review-last-message.json",
     });
@@
+  it("output-schemaとoutput-last-messageを--区切りの前に渡す", () => {
+    const args = buildReviewArgs({ model: "gpt-5.4", images: [], prompt: "p", lastMessagePath: "/out/last.json" });
+    const separatorIndex = args.indexOf("--");
+    expect(args.indexOf("--output-schema")).toBeLessThan(separatorIndex);
+    expect(args[args.indexOf("--output-schema") + 1]).toMatch(/review-findings\.schema\.json$/);
+    expect(args[args.indexOf("--output-last-message") + 1]).toBe("/out/last.json");
+  });
@@ parseReviewFindings
   it("素のJSONからfindingsを取り出す", () => { ... 変更なし ... });
-  it("コードフェンスや前置き付きの出力からもfindingsを取り出す", () => { ... });
-  it("JSONが無い出力はundefinedを返す", () => {
-    expect(parseReviewFindings("画像を確認しました。特に問題ありません。")).toBeUndefined();
-  });
-  it("findings配列が無いJSONはundefinedを返す", () => {
-    expect(parseReviewFindings('{"summary":"ok"}')).toBeUndefined();
-  });
+  it("JSONとして読めない入力はnullを返す", () => {
+    expect(parseReviewFindings("画像を確認しました。")).toBeNull();
+  });
+  it("findings配列が無いJSONはnullを返す", () => {
+    expect(parseReviewFindings('{"summary":"ok"}')).toBeNull();
+  });
```

前置き付き出力のケースは削除ではなく置き換えである。schema 指定後は最終メッセージが純 JSON になるため、その前提を失ったテストは `--output-schema` の引数検証テストに役割を移す。

### 所見 4: `debug.test.tsx` ルールの一般化

```diff
--- scripts/correction-prompt.mjs（所見 2 適用後）
-  "debug.test.tsxは残さないでください。",
+  "調査用に追加した一時テストや console.log は、比較対象の成果物に混ざるため修正完了前に削除してください。",
```

### 所見 5: `skills/atlas-design-system/SKILL.md:12`

```diff
-   Stop and ask for the missing business decision when it would change the screen structure or behavior.
+   When a business decision is missing and it would change the screen structure or behavior, decide from `brief.md` and `DESIGN.md`, then record the assumption and the alternative in the final report. Runs are non-interactive; nobody can answer a question mid-run.
```

この変更は `hashHarnessContext` の対象なので、次の Run から `designContractSha256` が変わる。比較実験の baseline と harness を同じ SHA で揃え直すこと。

## 再検証（Step 7）

Run は Codex の実費がかかるため未実施。適用後は `pnpm experiment:run` で baseline / harness を同一 SHA で 1 ペア回し、`pnpm experiment:review` の findings が `raw` フォールバックへ落ちないことを確認する。
