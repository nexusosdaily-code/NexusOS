/**
 * Shared Vitest client-project definition.
 *
 * Both vitest.config.ts (projects[client]) and vitest.client.config.ts
 * import this object so the two commands — `npm run test:all` and
 * `npm run test:client` — always run against the same environment,
 * include patterns, and setup files.  Edit here; both configs stay in sync.
 */
import react from "@vitejs/plugin-react";
import path from "path";

export const alias = {
  "@shared": path.resolve(__dirname, "shared"),
  "@": path.resolve(__dirname, "client", "src"),
};

export const clientProjectConfig = {
  plugins: [react()],
  resolve: { alias },
  test: {
    name: "client",
    globals: true,
    environment: "happy-dom" as const,
    include: [
      "client/**/*.test.tsx",
      "client/**/*.test.ts",
    ],
    setupFiles: ["client/src/__tests__/setup.ts"],
  },
};
