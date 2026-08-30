import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs, rootDir } from "./lib.mjs";

const requiredStates = [
  "default",
  "drawer-open",
  "invalid-seat-count",
  "unauthorized",
  "loading",
  "success",
  "failure",
];

function result(id, status, evidence) {
  return { id, status, evidence };
}

function countMatches(value, pattern) {
  return [...value.matchAll(pattern)].length;
}

export function evaluateSource({ app, styles }) {
  const source = `${app}\n${styles}`;
  const nativePrimitives = [
    ["button", /<button\b/g],
    ["table", /<table\b/g],
    ["select", /<select\b/g],
    ["number input", /<input\b[^>]*type=["']number["']/g],
    ["custom dialog", /role=["']dialog["']/g],
  ]
    .map(([name, pattern]) => [name, countMatches(app, pattern)])
    .filter(([, count]) => count > 0);
  const rawColorCount = countMatches(styles, /#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\(/g);
  const missingStates = requiredStates.filter((state) => !source.includes(state));
  const hasFormLabel = /<label\b|<Label\b|aria-label=/.test(app);
  const hasPermissionGuard = /(viewer|CS Viewer)/i.test(app) && /(canEdit|isViewer|role\s*===?)/.test(app);
  const hasSeatGuard = /(usedSeats|利用席数)/.test(app) && /(>=|<|min=|isSeatCount)/.test(app);
  const hasLoadingGuard = /(isSaving|isLoading)/.test(app) && /(disabled|isDisabled)/.test(app);
  const hasRetry = /(failure|失敗)/i.test(app) && /(retry|再試行)/i.test(app);
  const hasConfirmation = /<AlertDialog\.Root(?:\s|>)/.test(app) && /<AlertDialog\.Trigger(?:\s|>)/.test(app);
  const hasManagedDrawer = /<Drawer\.Root(?:\s|>)/.test(app) && /<Drawer\.Trigger\b[^>]*className=["'][^"']*button/.test(app);
  const hasNarrowLayout = /@media[^{]*(max-width|max-inline-size)/.test(styles) && /(overflow-x|grid-template-columns)/.test(styles);
  const hasRecoveryCopy = /(failure|失敗|エラー|できません)/i.test(app) && /(再試行|保持|確認)/.test(app);
  const hasStatusCopy = /(契約中|利用中|招待中|success|failure)/.test(app);

  return [
    result(
      "component.approved",
      nativePrimitives.length === 0 ? "passed" : "failed",
      nativePrimitives.length === 0
        ? ["契約対象の独自HTML部品は検出されませんでした"]
        : nativePrimitives.map(([name, count]) => `${name}: ${count}件`),
    ),
    result(
      "token.no-raw-color",
      rawColorCount === 0 ? "passed" : "failed",
      [rawColorCount === 0 ? "raw colorなし" : `raw color: ${rawColorCount}件`],
    ),
    result("a11y.control-name", "review", ["実ブラウザのaccessibility treeで確認する"]),
    result("a11y.form-label", hasFormLabel ? "passed" : "failed", [hasFormLabel ? "視覚ラベルまたはaria-labelあり" : "入力ラベルを確認できません"]),
    result("a11y.error-recovery", hasRecoveryCopy ? "passed" : "failed", [hasRecoveryCopy ? "原因または回復方法の文言あり" : "回復方法の文言が不足しています"]),
    result("a11y.color-only", hasStatusCopy ? "passed" : "failed", [hasStatusCopy ? "状態名を文字で表示" : "状態を示す文字が不足しています"]),
    result("business.permission", hasPermissionGuard ? "passed" : "failed", [hasPermissionGuard ? "Viewerの権限制御あり" : "Viewerの権限制御を確認できません"]),
    result("business.seat-limit", hasSeatGuard ? "passed" : "failed", [hasSeatGuard ? "利用席数を使う制約あり" : "席数の業務制約を確認できません"]),
    result("state.complete", missingStates.length === 0 ? "passed" : "failed", [missingStates.length === 0 ? "必須7状態あり" : `不足: ${missingStates.join(", ")}`]),
    result("layout.grouping", "review", ["スクリーンショットをblind reviewする"]),
    result("layout.narrow", hasNarrowLayout ? "passed" : "failed", [hasNarrowLayout ? "狭幅向けmedia queryと再配置あり" : "狭幅向け再配置を確認できません"]),
    result("state.loading", hasLoadingGuard ? "passed" : "failed", [hasLoadingGuard ? "保存中のdisabled制御あり" : "二重送信防止を確認できません"]),
    result("state.failure", hasRetry ? "passed" : "failed", [hasRetry ? "失敗後の再試行経路あり" : "再試行経路を確認できません"]),
    result("color.semantic", "review", ["semantic colorの意味はblind reviewする"]),
    result("action.confirmation", hasConfirmation ? "passed" : "failed", [hasConfirmation ? "HeroUI AlertDialog.Triggerから確認画面を開く" : "HeroUI AlertDialog.Triggerを確認できません"]),
    result("a11y.focus-management", hasManagedDrawer ? "passed" : "failed", [hasManagedDrawer ? "Drawer.Triggerに主要Buttonの視覚スタイルあり" : "Drawer.Triggerの構造または主要Buttonの視覚スタイルを確認できません"]),
  ];
}

function toMarkdown(evaluation, rulesById) {
  const lines = [
    "# Design validation",
    "",
    `自動判定: ${evaluation.summary.passed} passed / ${evaluation.summary.failed} failed / ${evaluation.summary.review} review`,
    "",
  ];
  for (const finding of evaluation.rules.filter((item) => item.status === "failed")) {
    const rule = rulesById.get(finding.id);
    lines.push(`## FAIL ${finding.id}: ${rule?.title ?? finding.id}`, "", ...finding.evidence.map((item) => `- ${item}`));
    if (rule?.fix) lines.push(`- 修正: ${rule.fix}`);
    lines.push("");
  }
  return `${lines.join("\n")}\n`;
}

export async function evaluateRun({ pairId, mode }) {
  const workspaceDir = resolve(rootDir, ".runs", "account-management", pairId, mode);
  const outputDir = resolve(rootDir, "experiments", "account-management", "runs", pairId, mode);
  const [app, styles, rulesDocument] = await Promise.all([
    readFile(resolve(workspaceDir, "src", "App.tsx"), "utf8"),
    readFile(resolve(workspaceDir, "src", "styles.css"), "utf8"),
    readFile(resolve(rootDir, "design", "rules.json"), "utf8").then(JSON.parse),
  ]);
  const rules = evaluateSource({ app, styles });
  const summary = {
    passed: rules.filter((item) => item.status === "passed").length,
    failed: rules.filter((item) => item.status === "failed").length,
    review: rules.filter((item) => item.status === "review").length,
  };
  const evaluation = { pairId, mode, summary, rules };
  const rulesById = new Map(rulesDocument.rules.map((rule) => [rule.id, rule]));
  await writeFile(resolve(outputDir, "design-evaluation.json"), `${JSON.stringify(evaluation, null, 2)}\n`);
  await writeFile(resolve(workspaceDir, "VALIDATION.md"), toMarkdown(evaluation, rulesById));

  const runPath = resolve(outputDir, "run.json");
  const run = JSON.parse(await readFile(runPath, "utf8"));
  run.checks = run.checks.filter((check) => check.name !== "design-rules");
  run.checks.push({ name: "design-rules", status: summary.failed === 0 ? "passed" : "failed", exitCode: summary.failed === 0 ? 0 : 1 });
  if (!run.artifacts.includes("design-evaluation.json")) run.artifacts.push("design-evaluation.json");
  await writeFile(runPath, `${JSON.stringify(run, null, 2)}\n`);
  return evaluation;
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const args = parseArgs(process.argv.slice(2));
  if (typeof args.pair !== "string" || typeof args.mode !== "string") throw new Error("--pairと--modeを指定してください");
  const evaluation = await evaluateRun({ pairId: args.pair, mode: args.mode });
  console.log(`${args.mode}: ${evaluation.summary.passed} passed / ${evaluation.summary.failed} failed / ${evaluation.summary.review} review`);
}
