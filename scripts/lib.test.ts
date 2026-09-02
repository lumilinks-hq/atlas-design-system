import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { hashPath } from "./lib.mjs";

let directory = "";

beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), "atlas-lib-"));
  await writeFile(join(directory, "a.txt"), "alpha");
  await mkdir(join(directory, "node_modules", "vitest"), { recursive: true });
  await writeFile(join(directory, "node_modules", "x.txt"), "one");
  await writeFile(join(directory, "node_modules", "vitest", "results.json"), '{"run":1}');
  await mkdir(join(directory, ".git"), { recursive: true });
  await writeFile(join(directory, ".git", "y"), "one");
  await mkdir(join(directory, "src", "node_modules"), { recursive: true });
  await writeFile(join(directory, "src", "app.ts"), "export const value = 1;");
  await writeFile(join(directory, "src", "node_modules", "z.txt"), "one");
});

afterEach(async () => {
  await rm(directory, { recursive: true, force: true });
});

describe("hashPath", () => {
  it("ignores node_modules and .git contents", async () => {
    const before = await hashPath(directory);

    await writeFile(join(directory, "node_modules", "x.txt"), "two");
    await writeFile(join(directory, "node_modules", "vitest", "results.json"), '{"run":2}');
    await writeFile(join(directory, ".git", "y"), "two");
    await writeFile(join(directory, "src", "node_modules", "z.txt"), "two");

    expect(await hashPath(directory)).toBe(before);
  });

  it("changes when a tracked file changes", async () => {
    const before = await hashPath(directory);

    await writeFile(join(directory, "a.txt"), "beta");

    expect(await hashPath(directory)).not.toBe(before);
  });

  it("returns the same hash for relative and absolute paths", async () => {
    expect(await hashPath(relative(process.cwd(), directory))).toBe(await hashPath(directory));
  });
});
