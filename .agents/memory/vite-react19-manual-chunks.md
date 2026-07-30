---
name: Vite React 19 manualChunks
description: Array-based manualChunks silently produces empty vendor-react chunk with React 19; function-based is required.
---

## Rule
Always use the **function-based** `manualChunks(id)` form in `vite.config.ts` for React 19 projects. The array-based form (`"vendor-react": ["react", "react-dom"]`) silently produces a 1-byte empty chunk — React gets bundled into the main entry instead.

**Why:** React 19 changed ESM internals so Rollup's chunk assignment by package name doesn't resolve correctly with the array syntax. The function form inspects actual module IDs (`id.includes("/node_modules/react/")`) and works reliably.

**How to apply:**
```js
manualChunks(id) {
  if (id.includes("/node_modules/react/") || id.includes("/node_modules/react-dom/") || id.includes("/node_modules/scheduler/")) {
    return "vendor-react";
  }
  if (id.includes("/node_modules/@radix-ui/")) return "vendor-radix";
  if (id.includes("/node_modules/lucide-react/")) return "vendor-icons";
  if (id.includes("/node_modules/recharts/") || id.includes("/node_modules/d3-")) return "vendor-charts";
  if (id.includes("/node_modules/@tanstack/react-query/")) return "vendor-query";
  if (id.includes("/node_modules/wouter/")) return "vendor-router";
}
```

**Effect of fix (measured 2026-07-30):**
- Main entry: 258KB → 83KB raw (81KB gzip → 25.5KB gzip)
- vendor-react: 0 → 193KB raw (60.5KB gzip), properly preloaded
- PageSpeed baseline was 80 mobile before fix
