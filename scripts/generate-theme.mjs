import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { rootDir } from "./lib.mjs";
import { renderTheme } from "./theme.mjs";

const tokens = JSON.parse(await readFile(resolve(rootDir, "design", "tokens.json"), "utf8"));
await writeFile(resolve(rootDir, "src", "generated", "theme.css"), renderTheme(tokens));
console.log("Generated src/generated/theme.css");
