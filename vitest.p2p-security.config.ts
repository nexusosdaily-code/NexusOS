import { defineConfig } from "vitest/config";
import { alias } from "./vitest.shared";
export default defineConfig({
  resolve: { alias },
  test: {
    // A missed module mock must fail, never connect to application money.
    env: { DATABASE_URL: "postgresql://isolated_fixture:isolated_fixture@127.0.0.1:1/forbidden" },
    environment: "node", include: ["server/p2p-commerce.postgres.integration.test.ts", "server/legacy-wallet.postgres.integration.test.ts",
      "server/withdrawal-reconciliation.postgres.integration.test.ts",
      "server/btc-withdrawal-attempt.postgres.integration.test.ts"],
    fileParallelism: false, testTimeout: 20_000, hookTimeout: 60_000,
  },
});
