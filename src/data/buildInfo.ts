export type BuildInfo = { version: string; commit: string; builtAt: string };

const fallback: BuildInfo = { version: "0.0.0", commit: "unknown", builtAt: "1970-01-01T00:00:00.000Z" };

export const buildInfo: BuildInfo = typeof __BUILD_INFO__ === "undefined" ? fallback : __BUILD_INFO__;
