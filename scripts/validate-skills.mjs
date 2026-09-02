import Ajv2020 from "ajv/dist/2020.js";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { rootDir, walk } from "./lib.mjs";
import { readSkillMetadata, readSkillsLock, resolveAgentSkills } from "./skill-catalog.mjs";

const skillsLock = readSkillsLock();
const skillsLockSchema = JSON.parse(readFileSync(resolve(rootDir, "skills", "skills-lock.schema.json"), "utf8"));
const validateLock = new Ajv2020({ allErrors: true, strict: true }).compile(skillsLockSchema);
if (!validateLock(skillsLock)) {
  throw new Error(`skills.lock.json: ${validateLock.errors?.map((error) => error.message).join(", ")}`);
}

const skillNames = Object.keys(skillsLock.skills);
const resolvedSkills = resolveAgentSkills(skillNames);

for (const { path: relativePath } of resolvedSkills) {
  const absolutePath = resolve(rootDir, relativePath, "SKILL.md");
  const { content } = readSkillMetadata(relativePath);

  for (const match of content.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)) {
    const target = match[1];
    if (/^(https?:|#)/.test(target)) continue;
    if (!existsSync(resolve(dirname(absolutePath), target))) throw new Error(`Broken Skill link in ${relativePath}: ${target}`);
  }
}

const manifestFiles = (await walk(resolve(rootDir, "experiments")))
  .filter((path) => path.endsWith("/manifest.json"));
for (const manifestFile of manifestFiles) {
  const manifest = JSON.parse(readFileSync(manifestFile, "utf8"));
  for (const condition of Object.values(manifest.conditions ?? {})) {
    resolveAgentSkills(condition.agentSkills ?? []);
  }
}

console.log(`Skills OK: ${resolvedSkills.length} packages, ${manifestFiles.length} manifest`);
