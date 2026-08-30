import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL("./index.html", import.meta.url)),
        "play-atlas": fileURLToPath(new URL("./play-atlas.html", import.meta.url)),
        "play-baseline": fileURLToPath(new URL("./play-baseline.html", import.meta.url)),
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
