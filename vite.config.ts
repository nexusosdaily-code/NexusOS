import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
import { metaImagesPlugin } from "./vite-plugin-meta-images";
import { CRITICAL_CHUNKS } from "./scripts/critical-chunks";

/**
 * Enforces gzip size limits on the entry chunk and vendor-react chunk.
 * Runs as a Vite `closeBundle` hook so the check fires whether the build is
 * invoked via `npm run build` or directly via `vite build`.
 */
function bundleSizeCheckPlugin(): Plugin {
  return {
    name: "bundle-size-check",
    apply: "build",
    async closeBundle() {
      const { checkBundleSize } = await import(
        "./scripts/check-bundle-size.js"
      );
      await checkBundleSize();
    },
  };
}

/**
 * Strips `@supports (color:color-mix(in lab,red,red)) { … }` blocks from
 * every CSS asset in the bundle.
 *
 * Tailwind v4 emits these blocks so modern browsers receive `color-mix()`
 * values instead of the pre-computed hex fallback.  The fallbacks are
 * visually identical (they are the same colour at the same opacity), so
 * targeting modern-only is an acceptable trade-off for a ~37% smaller CSS
 * file.
 *
 * The removal uses a brace-depth counter rather than a regex so it handles
 * any amount of nesting inside the block correctly.
 */
function dropColorMixSupportsPlugin(): Plugin {
  const MARKER = "@supports (color:color-mix(in lab,red,red)){";

  function strip(css: string): string {
    let out = "";
    let i = 0;
    while (i < css.length) {
      const idx = css.indexOf(MARKER, i);
      if (idx === -1) {
        out += css.slice(i);
        break;
      }
      // Keep everything before the @supports block.
      out += css.slice(i, idx);
      // Skip over the block using brace depth counting.
      let depth = 0;
      let j = idx;
      while (j < css.length) {
        if (css[j] === "{") depth++;
        else if (css[j] === "}") {
          depth--;
          if (depth === 0) { j++; break; }
        }
        j++;
      }
      i = j;
    }
    return out;
  }

  return {
    name: "drop-color-mix-supports",
    apply: "build",
    enforce: "post",
    generateBundle(_, bundle) {
      for (const asset of Object.values(bundle)) {
        if (
          asset.type === "asset" &&
          typeof asset.source === "string" &&
          (asset.fileName as string).endsWith(".css")
        ) {
          asset.source = strip(asset.source);
        }
      }
    },
  };
}
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

      // Preload the main CSS bundle so the browser fetches it in parallel with
      // the JS modules instead of discovering it only after the entry chunk
      // executes.  The main CSS is the hashed "index-*.css" asset — page-split
      // CSS chunks (e.g. "secure-docx-*.css") are skipped because they are only
      // needed when those pages are visited.
      for (const [fileName, asset] of Object.entries(bundle)) {
        if (
          asset.type === "asset" &&
          fileName.endsWith(".css") &&
          /^assets\/index-/.test(fileName)
        ) {
          preloadTags.unshift(
            `    <link rel="preload" as="style" href="/${fileName}">`
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
    dropColorMixSupportsPlugin(),
    deduplicateGradientStopsPlugin(),
    criticalChunkPreloadPlugin(),
    bundleSizeCheckPlugin(),
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

/**
 * Deduplicates the `--tw-gradient-via-stops` and the trailing
 * `--tw-gradient-stops:var(--tw-gradient-via-stops)` declarations that
 * Tailwind v4 inlines into every `via-*` utility class.
 *
 * Each via-* rule currently looks like:
 *   .via-COLOR{ --tw-gradient-via:VAL;
 *               --tw-gradient-via-stops:LONG_REPEATED_VAL;
 *               --tw-gradient-stops:var(--tw-gradient-via-stops) }
 *
 * The last two declarations are always identical (183 + 43 chars).  We split
 * each rule so the unique colour part stays per-class and the repeated tail
 * is emitted once as a combined selector rule, saving ~8 KB uncompressed.
 */
function deduplicateViaStopsPlugin(): Plugin {
  const VIA_STOPS =
    "--tw-gradient-via-stops:var(--tw-gradient-position)," +
    "var(--tw-gradient-from)var(--tw-gradient-from-position)," +
    "var(--tw-gradient-via)var(--tw-gradient-via-position)," +
    "var(--tw-gradient-to)var(--tw-gradient-to-position)";
  const VIA_STOPS_SUFFIX = ";" + VIA_STOPS + ";--tw-gradient-stops:var(--tw-gradient-via-stops)";

  function dedupe(css: string): string {
    const collected: string[] = [];
    let result = "";
    let i = 0;

    while (i < css.length) {
      // Find next opening brace at nesting depth 0 (may be inside @layer).
      // We scan for the pattern: SELECTOR{...} where declaration ends with VIA_STOPS_SUFFIX
      const open = css.indexOf("{", i);
      if (open === -1) { result += css.slice(i); break; }

      // Get everything up to the brace as potential selector.
      const selector = css.slice(i, open);

      // Find matching close brace (depth 1 because we stop at first }).
      const close = css.indexOf("}", open);
      if (close === -1) { result += css.slice(i); break; }

      const body = css.slice(open + 1, close);

      // Only rewrite rules whose body ends with our known repeated suffix.
      if (body.endsWith(VIA_STOPS_SUFFIX) && !selector.includes("@")) {
        const uniqueDecl = body.slice(0, body.length - VIA_STOPS_SUFFIX.length);
        // Keep the unique declaration in its own rule.
        result += selector + "{" + uniqueDecl + "}";
        // Collect selector for the combined via-stops rule.
        collected.push(selector.trim());
        i = close + 1;
      } else {
        result += css.slice(i, close + 1);
        i = close + 1;
      }
    }

    if (collected.length > 0) {
      result +=
        collected.join(",") +
        "{" + VIA_STOPS + ";--tw-gradient-stops:var(--tw-gradient-via-stops)}";
    }
    return result;
  }

  return {
    name: "deduplicate-via-stops",
    apply: "build",
    enforce: "post",
    generateBundle(_, bundle) {
      for (const asset of Object.values(bundle)) {
        if (
          asset.type === "asset" &&
          typeof asset.source === "string" &&
          (asset.fileName as string).endsWith(".css")
        ) {
          asset.source = dedupe(asset.source);
        }
      }
    },
  };
}

/**
 * Deduplicates the `--tw-gradient-stops: var(...)` declaration that Tailwind
 * v4 emits as a standalone rule for every opacity-modifier gradient class
 * (`from-amber-500/20`, `to-blue-900/10`, etc.).
 *
 * The declaration body is always identical.  Instead of N individual rules:
 *   `.from-amber-500\/10{--tw-gradient-stops:var(…)}`
 *   `.from-amber-500\/20{--tw-gradient-stops:var(…)}`
 *   …
 * we emit one combined rule:
 *   `.from-amber-500\/10,.from-amber-500\/20,…{--tw-gradient-stops:var(…)}`
 *
 * This saves ~25 KB of uncompressed CSS without any visual change.
 */
function deduplicateGradientStopsPlugin(): Plugin {
  const STOPS_DECL =
    "--tw-gradient-stops:var(--tw-gradient-via-stops,var(--tw-gradient-position)," +
    "var(--tw-gradient-from)var(--tw-gradient-from-position)," +
    "var(--tw-gradient-to)var(--tw-gradient-to-position))";

  function dedupe(css: string): string {
    const collected: string[] = [];
    // Match rules whose ENTIRE body is the stops declaration.
    // Selector must not contain '@' (skip at-rules), and must be a class selector.
    const re = new RegExp(
      "(\\.(?:[^{@}])+)\\{" + STOPS_DECL.replace(/[()[\]]/g, "\\$&") + "\\}",
      "g"
    );
    const stripped = css.replace(re, (_, selector: string) => {
      collected.push(selector.trim());
      return "";
    });

    if (collected.length === 0) return css;
    return stripped + collected.join(",") + "{" + STOPS_DECL + "}";
  }

  return {
    name: "deduplicate-gradient-stops",
    apply: "build",
    enforce: "post",
    generateBundle(_, bundle) {
      for (const asset of Object.values(bundle)) {
        if (
          asset.type === "asset" &&
          typeof asset.source === "string" &&
          (asset.fileName as string).endsWith(".css")
        ) {
          asset.source = dedupe(asset.source);
        }
      }
    },
  };
}
