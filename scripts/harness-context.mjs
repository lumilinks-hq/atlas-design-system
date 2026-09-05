import { createHash } from "node:crypto";
import { cp, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { buildAtlasLintOptions } from "eslint-plugin-atlas/options";
import { primaryExampleResource, publicDesignResourceText, resolveManifest } from "./design-catalog.mjs";
import { hashPath, rootDir } from "./lib.mjs";

// workspace の eslint.config.js。starter の土台に Atlas ルールを重ねる。
// options は HARNESS_LINT.json から読むので、設定ファイル自体は契約に依存しない
const workspaceEslintConfig = `import { readFileSync } from "node:fs";
import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import { atlasConfigs } from "eslint-plugin-atlas";

// Atlas の設計契約から生成した lint options。手で編集しない
const atlasOptions = JSON.parse(readFileSync(new URL("./HARNESS_LINT.json", import.meta.url), "utf8"));

export default tseslint.config(
  { ignores: ["dist", "node_modules", ".agents"] },
  // CSS も lint 対象に入るため、JS/TS 向けの推奨ルールはファイル種別を限定して適用する
  {
    files: ["**/*.{js,mjs,cjs,ts,tsx}"],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: { parserOptions: { tsconfigRootDir: import.meta.dirname } },
  },
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: { ecmaVersion: 2023, globals: globals.browser },
  },
  // design/ 配下の CSS はトークン定義そのものなので対象外。生成物の src/ だけを検査する
  // screen: true で App.tsx から import で辿れる画面全体に存在判定をかける(複数ファイル分割でも誤検知しない)
  ...atlasConfigs({ options: atlasOptions, tsxFiles: ["src/**/*.tsx"], cssFiles: ["src/**/*.css"], screen: true }),
);
`;

export function buildWorkspaceLintOptions(resolvedContract) {
  const exampleResource = primaryExampleResource(resolvedContract);
  return buildAtlasLintOptions({
    componentsDir: resolve(rootDir, "design", "components"),
    examplePath: resolve(rootDir, exampleResource.path),
  });
}

export async function syncHarnessContext(workspaceDir, manifestPath) {
  const resolvedContract = resolveManifest(manifestPath);
  const manifestAbsolutePath = resolve(rootDir, manifestPath);

  await cp(resolve(rootDir, "DESIGN.md"), resolve(workspaceDir, "DESIGN.md"), { force: true });
  // design/ は丸ごとではなく、manifest から解決した資源だけを渡す。
  // rules.json の lint ルールと example の evaluation は採点条件なので publicDesignResourceText で外す
  for (const resource of resolvedContract.resources) {
    if (resource.path === "DESIGN.md") continue;
    const target = resolve(workspaceDir, resource.path);
    await mkdir(dirname(target), { recursive: true });
    const raw = await readFile(resolve(rootDir, resource.path), "utf8").catch(() => undefined);
    const text = raw === undefined ? undefined : publicDesignResourceText(resource.path, raw);
    if (text !== undefined && text !== raw) await writeFile(target, text);
    else await cp(resolve(rootDir, resource.path), target, { force: true });
  }
  await cp(manifestAbsolutePath, resolve(workspaceDir, "HARNESS.json"), { force: true });
  const workspaceContract = {
    ...resolvedContract,
    agentSkills: resolvedContract.agentSkills.map((skill) => ({
      name: skill.name,
      path: `.agents/skills/${skill.name}`,
    })),
  };
  await writeFile(
    resolve(workspaceDir, "HARNESS_RESOLVED.json"),
    `${JSON.stringify(workspaceContract, null, 2)}\n`,
  );
  await writeFile(
    resolve(workspaceDir, "HARNESS_LINT.json"),
    `${JSON.stringify(buildWorkspaceLintOptions(resolvedContract), null, 2)}\n`,
  );
  await writeFile(resolve(workspaceDir, "eslint.config.js"), workspaceEslintConfig);

  const skillsDirectory = resolve(workspaceDir, ".agents", "skills");
  await mkdir(skillsDirectory, { recursive: true });
  for (const skill of resolvedContract.agentSkills) {
    await cp(resolve(rootDir, skill.path), resolve(skillsDirectory, skill.name), {
      recursive: true,
      force: true,
    });
  }

  return workspaceContract;
}

export async function hashHarnessContext(manifestPath) {
  const resolvedContract = resolveManifest(manifestPath);
  const hash = createHash("sha256");
  const paths = [
    "DESIGN.md",
    "design",
    manifestPath,
    "skills/skills.lock.json",
    ...resolvedContract.agentSkills.map((skill) => skill.path),
  ];

  for (const path of paths) {
    hash.update(path);
    hash.update(await hashPath(resolve(rootDir, path)));
  }
  return hash.digest("hex");
}
