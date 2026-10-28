import { defineConfig } from "vitest/config";
export default defineConfig({
  test:{environment:"node",include:["server/wave-vault.postgres.integration.test.ts",
    "server/wave-recipient-directory.postgres.integration.test.ts"],fileParallelism:false,testTimeout:30_000,hookTimeout:60_000},
});
