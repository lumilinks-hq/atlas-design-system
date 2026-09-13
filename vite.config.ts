import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath, URL } from "node:url";
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { htmlMeta } from "./vite-plugins/html-meta";

const pkg = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8")) as { version: string };

function gitCommit(): string {
  try {
    return execSync("git rev-parse --short HEAD", { stdio: ["ignore", "pipe", "ignore"] }).toString().trim() || "unknown";
  } catch {
    return "unknown";
  }
}

// ビルド情報（フッターに表示）。テスト実行時は src/data/buildInfo.ts のフォールバックを使う
const buildInfo = { version: pkg.version, commit: gitCommit(), builtAt: new Date().toISOString() };

// 環境変数からのみ読む。VITE_NOINDEX が空以外なら noindex、VITE_CF_BEACON_TOKEN が空なら beacon は出さない
const env = process.env;
const htmlMetaOptions = {
  noindex: Boolean(env.VITE_NOINDEX),
  beaconToken: env.VITE_CF_BEACON_TOKEN ?? "",
};

export default defineConfig({
  define: { __BUILD_INFO__: JSON.stringify(buildInfo) },
  plugins: [react(), tailwindcss(), htmlMeta(htmlMetaOptions)],
  // 保存済みRunのstyles.cssは、生成時のworkspace（app/design/）を指す相対パスでdesign層を読む。
  // Run配下にdesignのコピーを持たない run（lint-01 など）でも解決できるよう、リポジトリのdesign/へ向ける。
  // src/styles.css の同じ指定はもともと同じファイルを指すため、この別名で挙動は変わらない
  resolve: {
    alias: [
      {
        find: /^\.\.\/design\/(component-theme|layout)\.css$/,
        replacement: fileURLToPath(new URL("./design/$1.css", import.meta.url)),
      },
    ],
  },
  build: {
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL("./index.html", import.meta.url)),
        "play-atlas": fileURLToPath(new URL("./play-atlas.html", import.meta.url)),
        "play-baseline": fileURLToPath(new URL("./play-baseline.html", import.meta.url)),
        "play-invoice-atlas": fileURLToPath(new URL("./play-invoice-atlas.html", import.meta.url)),
        "play-invoice-baseline": fileURLToPath(new URL("./play-invoice-baseline.html", import.meta.url)),
      },
      output: {
        // React本体を共有チャンクから外さないと、HeroUIと同居した1チャンクが単体予算(gzip 150KiB)を超える
        advancedChunks: {
          groups: [{ name: "react", test: /node_modules\/react(-dom)?\// }],
        },
      },
    },
  },
  server: {
    port: 4173,
  },
  preview: {
    port: 4173,
  },
});
