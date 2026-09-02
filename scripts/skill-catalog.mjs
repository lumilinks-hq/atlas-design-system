import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { rootDir } from "./lib.mjs";

export function readSkillMetadata(relativePath) {
  const skillFile = resolve(rootDir, relativePath, "SKILL.md");
  if (!existsSync(skillFile)) throw new Error(`Missing Skill: ${relativePath}/SKILL.md`);

  const content = readFileSync(skillFile, "utf8");
  const frontmatter = content.match(/^---\n([\s\S]*?)\n---/);
  if (!frontmatter) throw new Error(`Missing frontmatter: ${relativePath}/SKILL.md`);

  const name = frontmatter[1].match(/^name:\s*["']?([^"'\n]+)["']?$/m)?.[1]?.trim();
  const description = frontmatter[1].match(/^description:\s*["']?([^"'\n]+)["']?$/m)?.[1]?.trim();
  const version = frontmatter[1].match(/^\s+version:\s*["']?([^"'\n]+)["']?$/m)?.[1]?.trim();
  if (!name) throw new Error(`Missing Skill name: ${relativePath}/SKILL.md`);
  if (!description) throw new Error(`Missing Skill description: ${relativePath}/SKILL.md`);

  return { name, description, version, content, skillFile };
}

export function readSkillsLock() {
  return JSON.parse(readFileSync(resolve(rootDir, "skills", "skills.lock.json"), "utf8"));
}

export function resolveAgentSkills(names) {
  const lock = readSkillsLock();
  return names.map((name) => {
    const entry = lock.skills?.[name];
    if (!entry) throw new Error(`Unknown Agent Skill: ${name}`);
    const metadata = readSkillMetadata(entry.path);
    if (metadata.name !== name) {
      throw new Error(`Skill name mismatch: ${entry.path} declares ${metadata.name}, expected ${name}`);
    }
    if (entry.upstreamVersion && metadata.version !== entry.upstreamVersion) {
      throw new Error(`Skill version mismatch: ${name} declares ${metadata.version ?? "none"}, expected ${entry.upstreamVersion}`);
    }
    return { name, path: entry.path };
  });
}
