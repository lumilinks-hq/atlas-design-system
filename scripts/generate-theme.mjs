import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { rootDir } from "./lib.mjs";
import { findStaleThemeFiles, renderTheme } from "./theme.mjs";

const targets = ["src/generated/theme.css", "design/theme.css"];
const tokens = JSON.parse(await readFile(resolve(rootDir, "design", "tokens.json"), "utf8"));
const theme = renderTheme(tokens);

if (process.argv.includes("--check")) {
  const files = await Promise.all(
    targets.map(async (path) => ({
      path,
      content: await readFile(resolve(rootDir, path), "utf8").catch(() => undefined),
    })),
  );
  const stale = findStaleThemeFiles(theme, files);
  if (stale.length > 0) {
    console.error(`tokens.jsonと不一致: ${stale.join(", ")}。pnpm theme:generateで再生成してください`);
    process.exit(1);
  }
  console.log("theme.cssはtokens.jsonと一致しています");
} else {
  await Promise.all(targets.map((path) => writeFile(resolve(rootDir, path), theme)));
  console.log("Generated src/generated/theme.css and design/theme.css");
}
