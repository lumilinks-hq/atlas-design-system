import { createHash } from "node:crypto";
import { cp, mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { resolveManifest } from "./design-catalog.mjs";
import { hashPath, rootDir } from "./lib.mjs";

export async function syncHarnessContext(workspaceDir, manifestPath) {
  const resolvedContract = resolveManifest(manifestPath);
  const manifestAbsolutePath = resolve(rootDir, manifestPath);

  await cp(resolve(rootDir, "DESIGN.md"), resolve(workspaceDir, "DESIGN.md"), { force: true });
  await cp(resolve(rootDir, "design"), resolve(workspaceDir, "design"), {
    recursive: true,
    force: true,
  });
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
