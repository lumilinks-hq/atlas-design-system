import { readFile, readdir, writeFile } from "node:fs/promises";
import { userInfo } from "node:os";
import { extname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs, rootDir, usernamePattern } from "./lib.mjs";
import { runsRootDir } from "./workspace-paths.mjs";

const textExtensions = new Set([".diff", ".json", ".jsonl", ".log", ".md", ".tsx", ".ts", ".css"]);

/**
 * マスク対象のOSユーザー名を決める。対象がなければnullを返す。
 * CIの実行ユーザー名はrunnerなど一般語になり、run.jsonの"runner"を壊すため適用しない。
 * @param {{ env?: Record<string, string | undefined>, username?: string }} [options]
 * @returns {string | null}
 */
export function resolveMaskedUsername(options = {}) {
  const { env = process.env, username = userInfo().username } = options;
  if (env.CI) return null;
  if (typeof username !== "string" || username.length < 3) return null;
  return username;
}

/**
 * 端末固有のパス、秘密情報らしい文字列、OSユーザー名を置き換える。
 * @param {string} value
 * @param {{ env?: Record<string, string | undefined>, username?: string }} [options]
 * @returns {string}
 */
export function sanitizeText(value, options = {}) {
  // workspaceはホーム配下にあるので、<home>より先に<workspace>へ畳む
  const output = value
    .replaceAll(rootDir, "<repo>")
    .replaceAll(runsRootDir(options.env), "<workspace>")
    .replace(/\/Users\/[A-Za-z0-9._-]+/g, "<home>")
    .replace(/\/(?:private\/)?var\/folders\/[A-Za-z0-9/_-]+/g, "<tmp>")
    .replace(/sk-[A-Za-z0-9_-]{20,}/g, "<redacted-openai-key>")
    .replace(/(authorization\s*[:=]\s*["']?bearer\s+)[A-Za-z0-9._-]+/gi, "$1<redacted>");

  const username = resolveMaskedUsername(options);
  if (!username) return output;
  return output.replace(usernamePattern(username), "<user>");
}


/**
 * イベント1件をsanitizeする。
 * @param {unknown} record
 * @param {{ env?: Record<string, string | undefined>, username?: string }} [options]
 */
export function sanitizeEventRecord(record, options = {}) {
  if (record?.item?.type === "command_execution" && /\/(?:\.agents|\.codex|\.claude)\/skills\//.test(record.item.command ?? "")) {
    record.item.command = "[redacted: local agent instruction read]";
    record.item.aggregated_output = "[redacted: local agent instruction]";
  }

  const visit = (value) => {
    if (typeof value === "string") return sanitizeText(value, options);
    if (Array.isArray(value)) return value.map(visit);
    if (value && typeof value === "object") {
      for (const [key, child] of Object.entries(value)) value[key] = visit(child);
    }
    return value;
  };

  return visit(record);
}

async function sanitizeFile(path, options) {
  const input = await readFile(path, "utf8");
  let output;
  if (extname(path) === ".jsonl") {
    output = input
      .split("\n")
      .map((line) => line ? JSON.stringify(sanitizeEventRecord(JSON.parse(line), options)) : "")
      .join("\n");
  } else {
    output = sanitizeText(input, options);
  }
  if (output !== input) await writeFile(path, output);
}

/**
 * ディレクトリ配下のテキスト成果物をsanitizeする。
 * @param {string} directory
 * @param {{ env?: Record<string, string | undefined>, username?: string }} [options]
 */
export async function sanitizeRunArtifacts(directory, options = {}) {
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) await sanitizeRunArtifacts(path, options);
    else if (textExtensions.has(extname(entry.name))) await sanitizeFile(path, options);
  }
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const args = parseArgs(process.argv.slice(2));
  if (typeof args.pair !== "string") throw new Error("--pairを指定してください");
  const directory = resolve(rootDir, "experiments", "account-management", "runs", args.pair);
  await sanitizeRunArtifacts(directory);
  console.log(`Sanitized: experiments/account-management/runs/${args.pair}`);
}
