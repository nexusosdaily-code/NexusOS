import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
import { metaImagesPlugin } from "./vite-plugin-meta-images";
import { CRITICAL_CHUNKS } from "./scripts/critical-chunks";

/**
 * Injects <link rel="modulepreload"> tags for the hub (homepage) and auth
 * chunks into index.html so the browser can download them in parallel with
 * the main bundle instead of waiting for it to parse first.
 */
function criticalChunkPreloadPlugin(): Plugin {
  return {
    name: "inject-critical-modulepreloads",
    enforce: "post",
    generateBundle(_, bundle) {
      const CRITICAL = new Set(CRITICAL_CHUNKS);
      const preloadTags: string[] = [];

      for (const [fileName, chunk] of Object.entries(bundle)) {
        if (chunk.type === "chunk" && CRITICAL.has(chunk.name)) {
          preloadTags.push(
            `    <link rel="modulepreload" crossorigin href="/${fileName}">`
          );
        }
      }

      if (preloadTags.length === 0) return;

      const htmlAsset = bundle["index.html"];
      if (htmlAsset && htmlAsset.type === "asset" && typeof htmlAsset.source === "string") {
        htmlAsset.source = htmlAsset.source.replace(
          /(\s*<\/head>)/,
          `\n${preloadTags.join("\n")}$1`
        );
      }
    },
  };
}

export default defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    tailwindcss(),
    metaImagesPlugin(),
    criticalChunkPreloadPlugin(),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer(),
          ),
          await import("@replit/vite-plugin-dev-banner").then((m) =>
            m.devBanner(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  css: {
    postcss: {
      plugins: [],
    },
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
    cssCodeSplit: true,
    chunkSizeWarningLimit: 500,
    rollupOptions: {
      output: {
        // Function-based manualChunks is required for React 19 — the array form silently
        // produces empty chunks because React 19 ESM internals resolve to different IDs.
        manualChunks(id) {
          // React core — must come before the generic node_modules check
          if (
            id.includes("/node_modules/react/") ||
            id.includes("/node_modules/react-dom/") ||
            id.includes("/node_modules/scheduler/")
          ) {
            return "vendor-react";
          }
          if (id.includes("/node_modules/@radix-ui/")) {
            return "vendor-radix";
          }
          if (id.includes("/node_modules/lucide-react/")) {
            return "vendor-icons";
          }
          if (
            id.includes("/node_modules/recharts/") ||
            id.includes("/node_modules/d3-") ||
            id.includes("/node_modules/victory-")
          ) {
            return "vendor-charts";
          }
          if (id.includes("/node_modules/@tanstack/react-query/")) {
            return "vendor-query";
          }
          if (id.includes("/node_modules/wouter/")) {
            return "vendor-router";
          }
        },
      },
    },
  },
  server: {
    host: "0.0.0.0",
    allowedHosts: true,
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});
