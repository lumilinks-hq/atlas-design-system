import { resolveManifest } from "./design-catalog.mjs";

const manifestPath = process.argv[2];
if (!manifestPath) {
  console.error("Usage: node scripts/resolve-design-contract.mjs <manifest.json>");
  process.exitCode = 1;
} else {
  try {
    console.log(JSON.stringify(resolveManifest(manifestPath), null, 2));
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
