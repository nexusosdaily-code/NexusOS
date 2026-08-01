import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { alias, clientProjectConfig } from "./vitest.shared";

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
          setupFiles: ["client/src/__tests__/setup.ts"],
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
