import { describe, expect, it } from "vitest";
import { auditText, resolveAuditUsernames } from "./audit-public-data.mjs";

describe("public data audit", () => {
  it("detects local paths and credentials", () => {
    const findings = auditText(
      "/Users/private-user/project github_pat_abcdefghijklmnopqrstuvwxyz Authorization: Bearer secret.token.value",
      "README.md",
    );

    expect(findings.map((finding) => finding.id)).toEqual([
      "local-user-path",
      "github-token",
      "bearer-secret",
    ]);
  });

  it("allows sanitized placeholders and fixture domains", () => {
    expect(auditText("<repo> <home> Authorization: Bearer <redacted> aoi@example.com", "experiments/account-management/brief.md")).toEqual([]);
  });

  it("detects the local OS user name", () => {
    const findings = auditText("drwxr-xr-x@ 3 testuser staff", "experiments/a/events.jsonl", {
      usernames: ["testuser"],
    });

    expect(findings).toEqual([{ id: "local-user-name", match: "testuser" }]);
  });

  it("matches the user name on word boundaries only", () => {
    expect(auditText("testuserx", "README.md", { usernames: ["testuser"] })).toEqual([]);
  });

  it("区切り文字を-に置き換えた形のユーザー名も検出する", () => {
    expect(auditText("projects/-Users-test-user-works", "x.jsonl", { usernames: ["test_user"] })).toEqual([
      { id: "local-user-name", match: "test-user" },
    ]);
  });

  it("skips the user name rule on CI and for short names", () => {
    expect(resolveAuditUsernames({ env: { CI: "true" }, username: "runner" })).toEqual([]);
    expect(resolveAuditUsernames({ env: {}, username: "ab" })).toEqual([]);
    expect(resolveAuditUsernames({ env: {}, username: "testuser" })).toEqual(["testuser"]);
  });

  it("audits the extra names listed in ATLAS_AUDIT_USERNAMES", () => {
    expect(
      resolveAuditUsernames({ env: { ATLAS_AUDIT_USERNAMES: "alice, bob, xy" }, username: "carol" }),
    ).toEqual(["carol", "alice", "bob"]);
    expect(
      resolveAuditUsernames({ env: { CI: "true", ATLAS_AUDIT_USERNAMES: "alice" }, username: "runner" }),
    ).toEqual(["alice"]);
  });

  it("leaves the user name rule off for intentional fixtures", () => {
    expect(auditText("testuser", "scripts/audit-public-data.test.ts", { usernames: ["testuser"] })).toEqual([]);
  });
});
