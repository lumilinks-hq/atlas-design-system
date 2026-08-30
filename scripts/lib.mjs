import { createHash } from "node:crypto";
import { open, readdir, readFile, stat } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

export const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");

export async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const paths = [];

  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) paths.push(...(await walk(path)));
    else if (entry.isFile()) paths.push(path);
  }

  return paths;
}

export async function hashPath(path) {
  const info = await stat(path);
  const hash = createHash("sha256");

  if (info.isFile()) {
    hash.update(await readFile(path));
    return hash.digest("hex");
  }

  for (const file of await walk(path)) {
    hash.update(file.slice(path.length));
    hash.update(await readFile(file));
  }

  return hash.digest("hex");
}

export function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (!value?.startsWith("--")) continue;
    const key = value.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith("--")) args[key] = true;
    else {
      args[key] = next;
      index += 1;
    }
  }
  return args;
}

export function runCommand(command, args, options = {}) {
  return new Promise((resolveRun) => {
    const child = spawn(command, args, {
      cwd: options.cwd ?? rootDir,
      env: options.env ?? process.env,
      stdio: ["pipe", "pipe", "pipe"],
    });
    child.stdin.end();
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
      options.onStdout?.(chunk);
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
      options.onStderr?.(chunk);
    });
    child.on("error", (error) => resolveRun({ code: -1, stdout, stderr: `${stderr}${error.message}` }));
    child.on("close", (code) => resolveRun({ code: code ?? -1, stdout, stderr }));
  });
}

export async function runCommandToFiles(command, args, options) {
  const stdoutFile = await open(options.stdoutPath, "w");
  const stderrFile = await open(options.stderrPath, "w");

  return new Promise((resolveRun) => {
    const child = spawn(command, args, {
      cwd: options.cwd ?? rootDir,
      env: options.env ?? process.env,
      stdio: ["ignore", stdoutFile.fd, stderrFile.fd],
    });

    const finish = async (result) => {
      await Promise.all([stdoutFile.close(), stderrFile.close()]);
      resolveRun(result);
    };

    child.on("error", (error) => finish({ code: -1, error: error.message }));
    child.on("close", (code) => finish({ code: code ?? -1 }));
  });
}
