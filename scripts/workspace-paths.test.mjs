import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { rootDir } from "./lib.mjs";
import { pairWorkspaceDir, runsRootDir, workspaceDir } from "./workspace-paths.mjs";

// env は常に明示して渡す。実行者のシェルに DESIGN_HARNESS_RUNS_DIR があってもテストが揺れないようにする
describe("runsRootDir", () => {
  it("既定ではホーム配下のキャッシュディレクトリを返す", () => {
    expect(runsRootDir({})).toBe(join(homedir(), ".cache", "design-harness", "runs"));
  });

  it("DESIGN_HARNESS_RUNS_DIRで上書きできる", () => {
    expect(runsRootDir({ DESIGN_HARNESS_RUNS_DIR: "/srv/isolated/runs" })).toBe("/srv/isolated/runs");
  });

  it("相対パスは絶対パスへ正規化する", () => {
    expect(runsRootDir({ DESIGN_HARNESS_RUNS_DIR: "../design-harness-runs" }))
      .toBe(resolve(process.cwd(), "../design-harness-runs"));
  });

  it("リポジトリ内を指すとthrowする", () => {
    expect(() => runsRootDir({ DESIGN_HARNESS_RUNS_DIR: rootDir })).toThrow();
    expect(() => runsRootDir({ DESIGN_HARNESS_RUNS_DIR: join(rootDir, ".runs") })).toThrow();
  });

  it("リポジトリ名で始まるだけの兄弟ディレクトリはthrowしない", () => {
    expect(runsRootDir({ DESIGN_HARNESS_RUNS_DIR: `${rootDir}-runs` })).toBe(`${rootDir}-runs`);
  });
});

describe("pairWorkspaceDir / workspaceDir", () => {
  it("pairとmodeを実験名の下に並べる", () => {
    const env = { DESIGN_HARNESS_RUNS_DIR: "/srv/isolated/runs" };

    expect(pairWorkspaceDir("iso-check", env)).toBe("/srv/isolated/runs/account-management/iso-check");
    expect(workspaceDir("iso-check", "harness", env))
      .toBe("/srv/isolated/runs/account-management/iso-check/harness");
  });

  it("workspaceDirはpairWorkspaceDirの直下にある", () => {
    const env = {};

    expect(workspaceDir("p", "baseline", env)).toBe(join(pairWorkspaceDir("p", env), "baseline"));
  });
});
