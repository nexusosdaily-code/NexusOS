import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { alias, clientProjectConfig } from "./vitest.shared";
import { databaseTestFiles } from "./vitest.database";

export default defineConfig({
  plugins: [react()],
  resolve: { alias },
  test: {
    globals: true,
    // @vitest-environment directives in individual files always take precedence
    // over the project-level environment below, so legacy tests that carry
    // `// @vitest-environment jsdom` continue to work unchanged.
    projects: [
      // ── server & scripts ─────────────────────────────────────────────────
      {
        plugins: [react()],
        resolve: { alias },
        test: {
          name: "server",
          globals: true,
          environment: "node",
          include: [
            "server/**/*.test.ts",
            "scripts/**/*.test.ts",
          ],
          exclude: databaseTestFiles,
          setupFiles: ["client/src/__tests__/setup.ts"],
        },
      },
      {
        resolve: { alias },
        test: {
          name: "database",
          globals: true,
          environment: "node",
          include: databaseTestFiles,
          // These suites share the service's database-wide advisory lock.
          // Run files serially, while retaining concurrent requests inside tests.
          fileParallelism: false,
          testTimeout: 30_000,
          hookTimeout: 60_000,
          setupFiles: ["scripts/database-test-setup.ts"],
        },
      },
      // ── client (browser-like) ────────────────────────────────────────────
      // Any new *.test.ts / *.test.tsx file added under client/ automatically
      // runs in happy-dom; no inline `@vitest-environment` directive needed.
      // Definition lives in vitest.shared.ts — shared with vitest.client.config.ts.
      clientProjectConfig,
    ],
  },
});
