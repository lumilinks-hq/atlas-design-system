import { createHash } from "node:crypto";
import { open, readdir, readFile, stat } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

export const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/**
 * 文字列をそのままの並びで照合する正規表現へ埋め込めるようエスケープする。
 * @param {string} value
 * @returns {string}
 */
export function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** ハッシュ計算で無視するディレクトリ名。run-experiment.mjsのcp filterと同じ基準。 */
export const unhashedDirectories = new Set(["node_modules", ".git"]);

/**
 * ディレクトリ配下のファイルを絶対パスで列挙する。
 * @param {string} directory
 * @param {{ exclude?: Set<string> }} [options] excludeに一致する名前のディレクトリへは降りない。
 * @returns {Promise<string[]>}
 */
export async function walk(directory, options = {}) {
  const entries = await readdir(directory, { withFileTypes: true });
  const paths = [];

  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) {
      if (options.exclude?.has(entry.name)) continue;
      paths.push(...(await walk(path, options)));
    } else if (entry.isFile()) paths.push(path);
  }

  return paths;
}

/**
 * ファイルまたはディレクトリのsha256を返す。ディレクトリではnode_modulesと.gitを除く。
 * @param {string} target
 * @returns {Promise<string>}
 */
export async function hashPath(target) {
  const path = resolve(target);
  const info = await stat(path);
  const hash = createHash("sha256");

  if (info.isFile()) {
    hash.update(await readFile(path));
    return hash.digest("hex");
  }

  for (const file of await walk(path, { exclude: unhashedDirectories })) {
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
    let timedOut = false;
    const timeout = options.timeoutMs
      ? setTimeout(() => {
          timedOut = true;
          child.kill("SIGTERM");
        }, options.timeoutMs)
      : undefined;
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
      options.onStdout?.(chunk);
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
      options.onStderr?.(chunk);
    });
    child.on("error", (error) => {
      if (timeout) clearTimeout(timeout);
      resolveRun({ code: -1, stdout, stderr: `${stderr}${error.message}` });
    });
    child.on("close", (code) => {
      if (timeout) clearTimeout(timeout);
      resolveRun({
        code: timedOut ? 124 : code ?? -1,
        stdout,
        stderr: timedOut ? `${stderr}\nTimed out after ${options.timeoutMs}ms\n` : stderr,
      });
    });
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

/**
 * ユーザー名そのものと、_ や . を - に置き換えた形(Claude Code の projects ディレクトリ名など)に一致する
 * @param {string} username
 */
export function usernamePattern(username) {
  const variants = [...new Set([username, username.replace(/[._]/g, "-")])];
  return new RegExp(`\\b(?:${variants.map(escapeRegExp).join("|")})\\b`, "g");
}

