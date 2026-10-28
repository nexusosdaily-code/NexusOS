import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["server/p2p-live-video.browser.test.ts"],
    fileParallelism: false,
    hookTimeout: 30_000,
  },
});
