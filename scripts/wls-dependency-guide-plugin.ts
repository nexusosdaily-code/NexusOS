import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import type { Plugin } from "vite";

const fileName = "wavelengthscript-dependencies.html";
const canonical = fileURLToPath(new URL(`../public/${fileName}`, import.meta.url));

/** Serve and emit this one generated guide, never expose the repository public directory. */
export function dependencyGuidePlugin(source = canonical): Plugin {
  return {
    name: "wls-dependency-guide",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if ((req.method !== "GET" && req.method !== "HEAD") ||
            req.url?.split("?")[0] !== `/${fileName}`) return next();
        void readFile(source).then(content => {
          res.statusCode = 200;
          res.setHeader("Content-Type", "text/html; charset=utf-8");
          res.setHeader("Cache-Control", "no-store");
          res.setHeader("Content-Length", content.length);
          res.end(req.method === "HEAD" ? undefined : content);
        }).catch(next);
      });
    },
    async generateBundle() {
      // A missing guide fails the build rather than silently emitting a broken link.
      this.emitFile({ type: "asset", fileName, source: await readFile(source) });
    },
  };
}
