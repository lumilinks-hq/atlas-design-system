import { describe, expect, it } from "vitest";
import { auditText } from "./audit-public-data.mjs";

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
});
