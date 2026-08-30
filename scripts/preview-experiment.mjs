import { cp, mkdtemp, rm, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { createServer } from "vite";
import { parseArgs, rootDir } from "./lib.mjs";

const args = parseArgs(process.argv.slice(2));
const pairId = typeof args.pair === "string" ? args.pair : "mvp-05";
const mode = typeof args.mode === "string" ? args.mode : "harness-corrected";
const port = typeof args.port === "string" ? Number(args.port) : 4183;
const allowedModes = new Set(["baseline", "harness", "harness-corrected"]);

if (!allowedModes.has(mode)) throw new Error("--modeはbaseline、harness、harness-correctedから選んでください");
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("--portには有効なポート番号を指定してください");

const sourceDir = resolve(rootDir, "experiments", "account-management", "runs", pairId, mode, "source");
const starterDir = resolve(rootDir, "experiments", "account-management", "starter");
const previewDir = await mkdtemp(resolve(tmpdir(), "atlas-run-preview-"));

await cp(starterDir, previewDir, { recursive: true });
await cp(sourceDir, resolve(previewDir, "src"), { recursive: true, force: true });
await symlink(resolve(rootDir, "node_modules"), resolve(previewDir, "node_modules"), "dir");

const server = await createServer({
  root: previewDir,
  configLoader: "runner",
  server: { host: "127.0.0.1", port, strictPort: true },
});
await server.listen();

console.log(`${mode} — http://127.0.0.1:${port}/`);
console.log("終了するにはCtrl+Cを押してください");

let closing = false;
const close = async () => {
  if (closing) return;
  closing = true;
  await server.close();
  await rm(previewDir, { recursive: true, force: true });
};

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.once(signal, () => {
    close().then(() => process.exit(0));
  });
}

await new Promise(() => {});
