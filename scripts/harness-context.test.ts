import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { syncHarnessContext } from "./harness-context.mjs";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((path) => rm(path, { recursive: true, force: true })));
});

describe("syncHarnessContext", () => {
  it("copies the resolved design contract and required Agent Skills", async () => {
    const workspaceDir = await mkdtemp(join(tmpdir(), "atlas-harness-"));
    temporaryDirectories.push(workspaceDir);

    const result = await syncHarnessContext(
      workspaceDir,
      "experiments/account-management/manifest.json",
    );

    expect(result.agentSkills.map((skill) => skill.name)).toEqual([
      "atlas-design-system",
      "heroui-react",
      "ui-writing",
    ]);
    await expect(readFile(join(workspaceDir, "HARNESS.json"), "utf8")).resolves.toContain(
      '"agentSkills"',
    );
    const resolvedContext = await readFile(join(workspaceDir, "HARNESS_RESOLVED.json"), "utf8");
    expect(resolvedContext).toContain('"component.table"');
    expect(resolvedContext).toContain('".agents/skills/heroui-react"');
    await expect(
      readFile(join(workspaceDir, ".agents/skills/heroui-react/SKILL.md"), "utf8"),
    ).resolves.toContain("name: heroui-react");
    await expect(
      readFile(join(workspaceDir, ".agents/skills/ui-writing/SKILL.md"), "utf8"),
    ).resolves.toContain("name: ui-writing");
  });
});
