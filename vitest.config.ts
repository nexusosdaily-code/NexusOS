import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@shared": path.resolve(__dirname, "shared"),
      "@":       path.resolve(__dirname, "client", "src"),
    },
  },
  test: {
    globals: true,
    include: [
      "server/**/*.test.ts",
      "scripts/**/*.test.ts",
      "client/**/*.test.tsx",
      "client/**/*.test.ts",
    ],
    environmentMatchGlobs: [
      ["client/**/*.test.tsx", "happy-dom"],
      ["client/**/*.test.ts",  "happy-dom"],
    ],
    // @testing-library/jest-dom/vitest only extends `expect` — safe in node too.
    setupFiles: ["client/src/__tests__/setup.ts"],
  },
});
