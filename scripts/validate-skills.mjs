import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { rootDir } from "./lib.mjs";

const skillFiles = [
  "skills/smarthr-ui-writing/SKILL.md",
  "skills/atlas-design-system/SKILL.md",
];

for (const relativePath of skillFiles) {
  const absolutePath = resolve(rootDir, relativePath);
  if (!existsSync(absolutePath)) throw new Error(`Missing Skill: ${relativePath}`);
  const content = readFileSync(absolutePath, "utf8");
  const frontmatter = content.match(/^---\n([\s\S]*?)\n---/);
  if (!frontmatter) throw new Error(`Missing frontmatter: ${relativePath}`);
  if (!/^name:\s*\S+/m.test(frontmatter[1])) throw new Error(`Missing Skill name: ${relativePath}`);
  if (!/^description:\s*\S+/m.test(frontmatter[1])) throw new Error(`Missing Skill description: ${relativePath}`);

  for (const match of content.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)) {
    const target = match[1];
    if (/^(https?:|#)/.test(target)) continue;
    if (!existsSync(resolve(dirname(absolutePath), target))) throw new Error(`Broken Skill link in ${relativePath}: ${target}`);
  }
}

console.log(`Skills OK: ${skillFiles.length} packages`);
