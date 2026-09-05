import { readFile, stat } from "node:fs/promises";
import { userInfo } from "node:os";
import { relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs, rootDir, usernamePattern, walk } from "./lib.mjs";
import { experimentPaths, resolveExperimentName } from "./workspace-paths.mjs";

const excludedSegments = new Set([
  ".git",
  ".runs",
  "coverage",
  "dist",
  "node_modules",
  "playwright-report",
  "test-results",
]);
const textExtensions = /\.(?:css|diff|html|js|json|jsonl|md|mjs|ts|tsx|txt|yml|yaml)$/;
const intentionalFixtures = new Set([
  "scripts/audit-public-data.test.ts",
  "scripts/sanitize-run-artifacts.test.ts",
]);
/**
 * 公開ページが読む成果物。実験とpairを指定できるようにし、既定は掲載中のRunに合わせる。
 * @param {string} experiment
 * @param {string} pairId
 */
function listRequiredArtifacts(experiment, pairId) {
  const runs = `experiments/${experiment}/runs/${pairId}`;
  const shots = `public/experiments/${experiment}/runs/${pairId}`;
  return [
    `${runs}/comparison.json`,
    `${runs}/baseline/design-evaluation.json`,
    `${runs}/harness/design-evaluation.json`,
    `${runs}/harness-corrected/design-evaluation.json`,
    `${shots}/baseline.png`,
    `${shots}/harness-corrected.png`,
    `${shots}/harness-corrected-invalid-email.png`,
  ];
}

/**
 * 検査対象のユーザー名を決める。ATLAS_AUDIT_USERNAMESの指定は常に含める。
 * CIの実行ユーザー名はrunnerなど一般語になり、run.jsonの"runner"を誤検出するため含めない。
 * @param {{ env?: Record<string, string | undefined>, username?: string }} [options]
 * @returns {string[]}
 */
export function resolveAuditUsernames(options = {}) {
  const { env = process.env, username = userInfo().username } = options;
  const names = [];
  if (!env.CI && typeof username === "string") names.push(username);
  for (const name of (env.ATLAS_AUDIT_USERNAMES ?? "").split(",")) names.push(name.trim());
  return [...new Set(names)].filter((name) => name.length >= 3);
}

const defaultUsernames = resolveAuditUsernames();

/**
 * 公開してはいけない文字列を検出する。
 * @param {string} value
 * @param {string} [path]
 * @param {{ usernames?: string[] }} [options]
 */
export function auditText(value, path = "", options = {}) {
  const findings = [];
  const usernames = options.usernames ?? defaultUsernames;
  const rules = [
    ["local-user-path", /\/Users\/(?!example(?:\/|\b))[A-Za-z0-9._-]+/g],
    ["local-temp-path", /\/(?:private\/)?var\/folders\/[A-Za-z0-9/_-]+/g],
    ["private-host", /https?:\/\/[^\s/]*(?:\.internal|\.local)(?=[:/\s]|$)/gi],
    ["github-token", /\b(?:ghp_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,})\b/g],
    ["slack-token", /\bxox[baprs]-[A-Za-z0-9-]{20,}\b/g],
    ["bearer-secret", /authorization\s*[:=]\s*["']?bearer\s+(?!<redacted>)[A-Za-z0-9._-]{12,}/gi],
  ];
  if (!intentionalFixtures.has(path)) {
    rules.push(["openai-key", /\bsk-[A-Za-z0-9_-]{20,}\b/g]);
    for (const name of usernames) {
      rules.push(["local-user-name", usernamePattern(name)]);
    }
  }

  for (const [id, pattern] of intentionalFixtures.has(path) ? [] : rules) {
    for (const match of value.matchAll(pattern)) {
      findings.push({ id, match: match[0] });
    }
  }

  if (/experiments\/[^/]+\/(?:starter\/src|runs\/[^/]+\/[^/]+\/source)\/fixtures\.tsx?$/.test(path)) {
    for (const match of value.matchAll(/[A-Z0-9._%+-]+@([A-Z0-9.-]+\.[A-Z]{2,})/gi)) {
      if (match[1]?.toLowerCase() !== "example.com") findings.push({ id: "non-fixture-email", match: match[0] });
    }
  }
  return findings;
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const args = parseArgs(process.argv.slice(2));
  const experiment = resolveExperimentName(args);
  const pairId = typeof args.pair === "string" ? args.pair : "mvp-11";
  const requiredArtifacts = listRequiredArtifacts(experimentPaths(experiment).name, pairId);
  const files = (await walk(rootDir)).filter((absolutePath) => {
    const path = relative(rootDir, absolutePath);
    return !path.split("/").some((segment) => excludedSegments.has(segment)) && textExtensions.test(path);
  });
  const findings = [];
  for (const absolutePath of files) {
    const path = relative(rootDir, absolutePath);
    const value = await readFile(absolutePath, "utf8");
    for (const finding of auditText(value, path)) findings.push({ path, ...finding });
  }

  for (const path of requiredArtifacts) {
    try {
      if ((await stat(resolve(rootDir, path))).size === 0) findings.push({ path, id: "empty-required-artifact", match: "" });
    } catch {
      findings.push({ path, id: "missing-required-artifact", match: "" });
    }
  }

  if (findings.length > 0) {
    throw new Error(`Public data audit failed\n${findings.map((finding) => `${finding.path}: ${finding.id} ${finding.match}`).join("\n")}`);
  }

  console.log(`Public data audit OK: ${files.length} text files, ${requiredArtifacts.length} required artifacts`);
}
