import { defineConfig } from "vitest/config";

// Creates its own socket-only temporary PostgreSQL cluster; never uses DATABASE_URL.
// Deliberately separate from both publishing and the existing database project.
export default defineConfig({
  test: {
    environment: "node",
    include: ["server/contract-security.postgres.integration.test.ts"],
    fileParallelism: false,
    testTimeout: 15_000,
    hookTimeout: 60_000,
  },
});
