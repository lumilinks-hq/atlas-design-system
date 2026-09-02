import { gzipSync } from "node:zlib";
import { readFile, readdir, stat } from "node:fs/promises";
import { resolve } from "node:path";
import { rootDir } from "./lib.mjs";

const distDir = resolve(rootDir, "dist");
const assetsDir = resolve(distDir, "assets");
const entries = await readdir(assetsDir);
const sourceAssets = entries.filter((name) => name.endsWith(".js") || name.endsWith(".css"));
const limits = { js: 150 * 1024, css: 200 * 1024 };
const failures = [];

for (const name of sourceAssets) {
  const content = await readFile(resolve(assetsDir, name));
  const gzipBytes = gzipSync(content).byteLength;
  const type = name.endsWith(".js") ? "js" : "css";
  if (gzipBytes > limits[type]) failures.push(`${name}: gzip ${Math.ceil(gzipBytes / 1024)} KiB`);
}

let totalBytes = 0;
for (const name of entries) totalBytes += (await stat(resolve(assetsDir, name))).size;
if (totalBytes > 22 * 1024 * 1024) failures.push(`assets total: ${Math.ceil(totalBytes / 1024 / 1024)} MiB`);

if (failures.length > 0) {
  console.error("Bundle budget exceeded:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log(`Bundle budget OK: ${sourceAssets.length} JS/CSS assets, ${Math.ceil(totalBytes / 1024 / 1024)} MiB including offline fonts`);
}
