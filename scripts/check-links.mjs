import { access, readFile, readdir } from "node:fs/promises";
import { dirname, extname, resolve } from "node:path";
import { rootDir } from "./lib.mjs";

const ignoredDirectories = new Set([".git", ".runs", "dist", "node_modules"]);

async function collectMarkdown(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && ignoredDirectories.has(entry.name)) continue;
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) files.push(...await collectMarkdown(path));
    else if (extname(entry.name) === ".md") files.push(path);
  }
  return files;
}

const failures = [];
const files = await collectMarkdown(rootDir);
for (const file of files) {
  const source = await readFile(file, "utf8");
  for (const match of source.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
    const target = match[1]?.trim();
    if (!target || target.startsWith("#") || /^[a-z]+:/i.test(target)) continue;
    const pathPart = target.replace(/^<|>$/g, "").split("#", 1)[0];
    if (!pathPart) continue;
    try {
      await access(resolve(dirname(file), decodeURIComponent(pathPart)));
    } catch {
      failures.push(`${file.slice(rootDir.length + 1)} -> ${target}`);
    }
  }
}

if (failures.length > 0) {
  console.error("Broken local Markdown links:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log(`Local link check OK: ${files.length} Markdown files`);
}
