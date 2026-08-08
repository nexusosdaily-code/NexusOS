/**
 * Single source of truth for chunk names that must have
 * <link rel="modulepreload"> tags injected by criticalChunkPreloadPlugin()
 * in vite.config.ts.
 *
 * Imported by:
 *   - vite.config.ts  → builds the CRITICAL Set used by the plugin
 *   - scripts/check-preloads.ts → drives the post-build guard
 *
 * Adding a new critical lazy route? Add its chunk name here — both the plugin
 * and the guard will pick it up automatically.
 */
export const CRITICAL_CHUNKS: readonly string[] = [
  "hub",
  "auth",
  "wallet",
  "lightning-wallet",
];
