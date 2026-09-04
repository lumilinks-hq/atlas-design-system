import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";

const importPattern = /(?:import|export)\s[^'"]*?from\s*["'](\.[^"']*)["']|import\s*\(\s*["'](\.[^"']*)["']\s*\)|import\s*["'](\.[^"']*)["']/g;
const candidateExtensions = ["", ".tsx", ".ts", "/index.tsx", "/index.ts"];

function isTestFile(path) {
  return /\.(test|spec)\.[cm]?[jt]sx?$/.test(path);
}

function resolveImport(fromFile, specifier) {
  const base = resolve(dirname(fromFile), specifier);
  for (const extension of candidateExtensions) {
    const candidate = `${base}${extension}`;
    if (/\.tsx?$/.test(candidate) && existsSync(candidate)) return candidate;
  }
  return undefined;
}

function walkSync(directory) {
  const paths = [];
  for (const entry of readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    if (entry.name === "node_modules") continue;
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) paths.push(...walkSync(path));
    else if (entry.isFile()) paths.push(path);
  }
  return paths;
}

/**
 * 画面を構成するソースを App.tsx の相対 import から辿って集める。
 * 評価器と lint が「App.tsx 1 ファイル」を前提にしないための入口。
 *
 * - app: App.tsx を先頭に、辿れた .tsx を import 順(深さ優先)で連結
 * - fixtures: fixtures.ts を先頭に、辿れた .ts モジュールを連結
 * - styles: styles.css を先頭に、src 配下の CSS を連結
 *
 * 単一 App.tsx の run では 3 つの文字列が元ファイルと一致する(保存済み評価との互換)。
 * @param {string} srcDir src ディレクトリ
 * @param {{ entryText?: string }} [overrides] ESLint processor が渡す App.tsx の未保存テキスト
 */
export function collectScreenSourcesSync(srcDir, overrides = {}) {
  const root = resolve(srcDir);
  const toName = (path) => `src/${relative(root, path).split("\\").join("/")}`;
  const entry = resolve(root, "App.tsx");
  const visited = new Set();
  const tsxFiles = [];
  const tsFiles = [];

  const visit = (path) => {
    if (visited.has(path) || isTestFile(path)) return;
    visited.add(path);
    const text = path === entry && overrides.entryText !== undefined ? overrides.entryText : readFileSync(path, "utf8");
    (path.endsWith(".tsx") ? tsxFiles : tsFiles).push({ filename: toName(path), text });
    for (const match of text.matchAll(importPattern)) {
      const target = resolveImport(path, match[1] ?? match[2] ?? match[3]);
      if (target && target.startsWith(root)) visit(target);
    }
  };
  visit(entry);

  const fixturesPath = resolve(root, "fixtures.ts");
  const fixturesFirst = [
    ...tsFiles.filter((file) => file.filename === "src/fixtures.ts"),
    ...tsFiles.filter((file) => file.filename !== "src/fixtures.ts"),
  ];
  if (existsSync(fixturesPath) && !visited.has(fixturesPath)) {
    fixturesFirst.unshift({ filename: "src/fixtures.ts", text: readFileSync(fixturesPath, "utf8") });
  }

  const stylesPath = resolve(root, "styles.css");
  const cssPaths = walkSync(root).filter((path) => path.endsWith(".css") && path !== stylesPath);
  const cssFiles = [stylesPath, ...cssPaths]
    .filter((path) => existsSync(path))
    .map((path) => ({ filename: toName(path), text: readFileSync(path, "utf8") }));

  const join = (files) => files.map((file) => file.text).join("\n");
  return { app: join(tsxFiles), fixtures: join(fixturesFirst), styles: join(cssFiles), tsxFiles, tsFiles: fixturesFirst, cssFiles };
}
