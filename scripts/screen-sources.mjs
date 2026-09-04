import { collectScreenSourcesSync } from "eslint-plugin-atlas/screen-sources";

/**
 * 画面を構成するソースを App.tsx の相対 import から辿って集める(実装は plugin 側)。
 * @param {string} srcDir
 */
export async function collectScreenSources(srcDir) {
  return collectScreenSourcesSync(srcDir);
}
