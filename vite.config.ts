import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  plugins: [react(), tailwindcss()],
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
