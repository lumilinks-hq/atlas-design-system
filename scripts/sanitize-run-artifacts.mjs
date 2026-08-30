import { readFile, readdir, writeFile } from "node:fs/promises";
import { extname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs, rootDir } from "./lib.mjs";

const textExtensions = new Set([".diff", ".json", ".jsonl", ".log", ".md", ".tsx", ".ts", ".css"]);

export function sanitizeText(value) {
  return value
    .replaceAll(rootDir, "<repo>")
    .replace(/\/Users\/[A-Za-z0-9._-]+/g, "<home>")
    .replace(/\/(?:private\/)?var\/folders\/[A-Za-z0-9/_-]+/g, "<tmp>")
    .replace(/sk-[A-Za-z0-9_-]{20,}/g, "<redacted-openai-key>")
    .replace(/(authorization\s*[:=]\s*["']?bearer\s+)[A-Za-z0-9._-]+/gi, "$1<redacted>");
}

export function sanitizeEventRecord(record) {
  if (record?.item?.type === "command_execution" && /\/(?:\.agents|\.codex)\/skills\//.test(record.item.command ?? "")) {
    record.item.command = "[redacted: local agent instruction read]";
    record.item.aggregated_output = "[redacted: local agent instruction]";
  }

  const visit = (value) => {
    if (typeof value === "string") return sanitizeText(value);
    if (Array.isArray(value)) return value.map(visit);
    if (value && typeof value === "object") {
      for (const [key, child] of Object.entries(value)) value[key] = visit(child);
    }
    return value;
  };

  return visit(record);
}

async function sanitizeFile(path) {
  const input = await readFile(path, "utf8");
  let output;
  if (extname(path) === ".jsonl") {
    output = input
      .split("\n")
      .map((line) => line ? JSON.stringify(sanitizeEventRecord(JSON.parse(line))) : "")
      .join("\n");
  } else {
    output = sanitizeText(input);
  }
  if (output !== input) await writeFile(path, output);
}

export async function sanitizeRunArtifacts(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) await sanitizeRunArtifacts(path);
    else if (textExtensions.has(extname(entry.name))) await sanitizeFile(path);
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
