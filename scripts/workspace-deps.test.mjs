import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { addHarnessLintDependency, harnessLintTarballName } from "./workspace-deps.mjs";

let workspace;

afterEach(async () => {
  if (workspace) await rm(workspace, { recursive: true, force: true });
  workspace = undefined;
});

async function createWorkspace(packageJson) {
  workspace = await mkdtemp(join(tmpdir(), "atlas-workspace-deps-"));
  await writeFile(join(workspace, "package.json"), `${JSON.stringify(packageJson, null, 2)}\n`);
  return workspace;
}

async function readPackageJson(dir) {
  return JSON.parse(await readFile(join(dir, "package.json"), "utf8"));
}

describe("harnessLintTarballName", () => {
  it("プラグインのnameとversionからtarball名を組み立てる", () => {
    expect(harnessLintTarballName({ name: "eslint-plugin-atlas", version: "0.1.0" }))
      .toBe("eslint-plugin-atlas-0.1.0.tgz");
  });
});

describe("addHarnessLintDependency", () => {
  it("devDependenciesにworkspace相対のfile:指定を追加する", async () => {
    const dir = await createWorkspace({ name: "w", devDependencies: { eslint: "10.9.1" } });

    await addHarnessLintDependency(dir, join(dir, ".harness", "eslint-plugin-atlas-0.1.0.tgz"));

    expect((await readPackageJson(dir)).devDependencies).toEqual({
      eslint: "10.9.1",
      "eslint-plugin-atlas": "file:./.harness/eslint-plugin-atlas-0.1.0.tgz",
    });
  });

  it("dependenciesなど他のフィールドを壊さない", async () => {
    const dir = await createWorkspace({
      name: "w",
      scripts: { lint: "eslint ." },
      dependencies: { react: "19.2.8" },
    });

    await addHarnessLintDependency(dir, join(dir, ".harness", "eslint-plugin-atlas-0.1.0.tgz"));
    const result = await readPackageJson(dir);

    expect(result.scripts).toEqual({ lint: "eslint ." });
    expect(result.dependencies).toEqual({ react: "19.2.8" });
  });

  it("2回呼んでも重複せず同じ内容になる(harness-correctedのコピー後も安全)", async () => {
    const dir = await createWorkspace({ name: "w", devDependencies: { eslint: "10.9.1" } });
    const tarball = join(dir, ".harness", "eslint-plugin-atlas-0.1.0.tgz");

    await addHarnessLintDependency(dir, tarball);
    const first = await readFile(join(dir, "package.json"), "utf8");
    await addHarnessLintDependency(dir, tarball);

    expect(await readFile(join(dir, "package.json"), "utf8")).toBe(first);
  });

  it("devDependenciesが無いpackage.jsonでも追加できる", async () => {
    const dir = await createWorkspace({ name: "w" });

    await addHarnessLintDependency(dir, join(dir, ".harness", "eslint-plugin-atlas-0.1.0.tgz"));

    expect((await readPackageJson(dir)).devDependencies).toEqual({
      "eslint-plugin-atlas": "file:./.harness/eslint-plugin-atlas-0.1.0.tgz",
    });
  });

  it("末尾に改行のあるJSONを書く", async () => {
    const dir = await createWorkspace({ name: "w" });

    await addHarnessLintDependency(dir, join(dir, ".harness", "eslint-plugin-atlas-0.1.0.tgz"));

    expect(await readFile(join(dir, "package.json"), "utf8")).toMatch(/\n$/);
  });
});
