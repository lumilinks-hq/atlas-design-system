import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { rootDir } from "./lib.mjs";
import {
  defaultExperimentName,
  experimentPaths,
  pairWorkspaceDir,
  resolveExperimentName,
  runsRootDir,
  workspaceDir,
} from "./workspace-paths.mjs";

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

  it("実験名を渡すとその名前の下に並べる", () => {
    const env = { DESIGN_HARNESS_RUNS_DIR: "/srv/isolated/runs" };

    expect(pairWorkspaceDir("iso-check", env, "invoice-management"))
      .toBe("/srv/isolated/runs/invoice-management/iso-check");
    expect(workspaceDir("iso-check", "harness", env, "invoice-management"))
      .toBe("/srv/isolated/runs/invoice-management/iso-check/harness");
  });
});

describe("experimentPaths", () => {
  it("既定はaccount-management", () => {
    expect(defaultExperimentName).toBe("account-management");
    expect(experimentPaths().name).toBe("account-management");
    expect(experimentPaths().manifestPath).toBe("experiments/account-management/manifest.json");
  });

  it("manifestPathはrootDirからの相対パスで返す", () => {
    expect(experimentPaths("invoice-management").manifestPath)
      .toBe("experiments/invoice-management/manifest.json");
  });

  it("実験名ごとのディレクトリを組み立てる", () => {
    const paths = experimentPaths("invoice-management");

    expect(paths.dir).toBe(join(rootDir, "experiments", "invoice-management"));
    expect(paths.starterDir).toBe(join(rootDir, "experiments", "invoice-management", "starter"));
    expect(paths.briefPath).toBe(join(rootDir, "experiments", "invoice-management", "brief.md"));
    expect(paths.promptPath).toBe(join(rootDir, "experiments", "invoice-management", "prompt.md"));
    expect(paths.runsDir).toBe(join(rootDir, "experiments", "invoice-management", "runs"));
    expect(paths.publicRunsDir)
      .toBe(join(rootDir, "public", "experiments", "invoice-management", "runs"));
  });
});

describe("resolveExperimentName", () => {
  it("--experimentが無ければ既定を返す", () => {
    expect(resolveExperimentName({})).toBe("account-management");
  });

  it("--experimentで実在する実験を選べる", () => {
    expect(resolveExperimentName({ experiment: "account-management" })).toBe("account-management");
  });

  it("manifestが無い実験名はthrowする", () => {
    expect(() => resolveExperimentName({ experiment: "no-such-experiment" })).toThrow();
  });

  it("パス区切りを含む実験名はthrowする", () => {
    expect(() => resolveExperimentName({ experiment: "../design" })).toThrow();
    expect(() => resolveExperimentName({ experiment: "a/b" })).toThrow();
  });

  it("値なしの--experimentはthrowする", () => {
    expect(() => resolveExperimentName({ experiment: true })).toThrow();
  });
});
