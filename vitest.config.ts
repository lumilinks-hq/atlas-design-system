import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.{ts,tsx}", "scripts/**/*.test.{ts,mjs}", "packages/**/*.test.mjs"],
    setupFiles: ["./src/test/setup.ts"],
  },
});
