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
    environment: "node",
    include:     ["server/**/*.test.ts", "scripts/**/*.test.ts", "client/**/*.test.tsx", "client/**/*.test.ts"],
    globals:     true,
    setupFiles: ["client/src/test-setup.ts"],
    environmentMatchGlobs: [
      ["client/**/*.test.tsx", "happy-dom"],
      ["client/**/*.test.ts",  "happy-dom"],
    ],
  },
});
