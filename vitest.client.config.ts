import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@shared": path.resolve(__dirname, "shared"),
      "@": path.resolve(__dirname, "client", "src"),
    },
  },
  test: {
    environment: "happy-dom",
    include: ["client/**/*.test.tsx", "client/**/*.test.ts"],
    globals: true,
    setupFiles: ["client/src/test-setup.ts"],
  },
});
