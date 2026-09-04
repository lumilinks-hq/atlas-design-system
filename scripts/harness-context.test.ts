import { existsSync } from "node:fs";
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

  it("writes the Atlas ESLint layer and its options so the agent can self-check with pnpm lint", async () => {
    const workspaceDir = await mkdtemp(join(tmpdir(), "atlas-harness-"));
    temporaryDirectories.push(workspaceDir);

    await syncHarnessContext(workspaceDir, "experiments/account-management/manifest.json");

    const eslintConfig = await readFile(join(workspaceDir, "eslint.config.js"), "utf8");
    expect(eslintConfig).toContain("eslint-plugin-atlas");
    expect(eslintConfig).toContain("HARNESS_LINT.json");
    expect(eslintConfig).toContain("screen: true");
    const lintOptions = JSON.parse(await readFile(join(workspaceDir, "HARNESS_LINT.json"), "utf8"));
    expect(lintOptions.tableVariant).toBe("primary");
    expect(lintOptions.approvedImports).toContain("Button");
    expect(lintOptions.componentUsage.map((entry: { implementation: string }) => entry.implementation)).toContain("Toolbar");
  });

  it("copies only the resolved design resources and strips lint rules from rules.json", async () => {
    const workspaceDir = await mkdtemp(join(tmpdir(), "atlas-harness-"));
    temporaryDirectories.push(workspaceDir);

    const result = await syncHarnessContext(workspaceDir, "experiments/account-management/manifest.json");

    for (const resource of result.resources) {
      expect(existsSync(join(workspaceDir, resource.path)), resource.path).toBe(true);
    }
    expect(existsSync(join(workspaceDir, "design/schemas"))).toBe(false);
    expect(existsSync(join(workspaceDir, "design/layout.css"))).toBe(true);
    expect(existsSync(join(workspaceDir, "design/component-theme.css"))).toBe(true);

    const rulesDocument = JSON.parse(await readFile(join(workspaceDir, "design/rules.json"), "utf8"));
    const methods = new Set(rulesDocument.rules.map((rule: { method: string }) => rule.method));
    expect(methods.has("lint")).toBe(false);
    expect(methods.has("ai-review")).toBe(true);
    expect(rulesDocument.rules.length).toBeGreaterThan(0);
  });
});
