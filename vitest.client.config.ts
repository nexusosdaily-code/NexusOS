/**
 * Standalone client test config — used by `npm run test:client`.
 *
 * The client project definition is imported from vitest.shared.ts so it
 * stays in sync with the projects[client] entry in vitest.config.ts.
 * To change environment, include patterns, or setupFiles, edit vitest.shared.ts.
 */
import { defineConfig } from "vitest/config";
import { clientProjectConfig } from "./vitest.shared";

export default defineConfig(clientProjectConfig);
