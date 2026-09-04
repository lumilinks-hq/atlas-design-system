import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { join, relative, resolve } from "node:path";
import { rootDir, runCommand } from "./lib.mjs";

// harness workspace は eslint-plugin-atlas を実インストールする。未公開パッケージなので
// pnpm pack した tarball を workspace 内に置き、file: 指定の devDependency として入れる
export const harnessDirName = ".harness";
const pluginDir = resolve(rootDir, "packages", "eslint-plugin-atlas");
const dependencyName = "eslint-plugin-atlas";

export function harnessLintTarballName(pluginPackage) {
  return `${pluginPackage.name}-${pluginPackage.version}.tgz`;
}

export async function packHarnessLintPlugin(workspaceDir) {
  const destination = join(workspaceDir, harnessDirName);
  await mkdir(destination, { recursive: true });

  const result = await runCommand("pnpm", ["pack", "--pack-destination", destination], {
    cwd: pluginDir,
  });
  if (result.code !== 0) {
    throw new Error(`pnpm packが失敗しました: ${result.stderr || result.stdout}`);
  }

  const pluginPackage = JSON.parse(await readFile(join(pluginDir, "package.json"), "utf8"));
  const tarballPath = join(destination, harnessLintTarballName(pluginPackage));
  await access(tarballPath);
  return tarballPath;
}

export async function addHarnessLintDependency(workspaceDir, tarballPath) {
  const packageJsonPath = join(workspaceDir, "package.json");
  const packageJson = JSON.parse(await readFile(packageJsonPath, "utf8"));
  const relativePath = relative(workspaceDir, tarballPath);
  // .harness のように . 始まりでも "./" は必要なので、区切りまで見て判定する
  const isExplicitlyRelative = relativePath.startsWith("./") || relativePath.startsWith("../");
  const specifier = `file:${isExplicitlyRelative ? relativePath : `./${relativePath}`}`;

  packageJson.devDependencies = { ...packageJson.devDependencies, [dependencyName]: specifier };
  await writeFile(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`);
  return specifier;
}
