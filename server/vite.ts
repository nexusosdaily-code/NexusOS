import { type Express } from "express";
import { createServer as createViteServer, createLogger } from "vite";
import { type Server } from "http";
import viteConfig from "../vite.config";
import fs from "fs";
import path from "path";
import { nanoid } from "nanoid";
import { injectMeta, buildVideosPageMeta, buildVideoDetailPageMeta, injectCustomMeta } from "./seo-meta";
import { storage } from "./storage";

const viteLogger = createLogger();

export async function setupVite(server: Server, app: Express) {
  const serverOptions = {
    middlewareMode: true,
    hmr: false as const,
    allowedHosts: true as const,
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
      },
    },
    server: serverOptions,
    appType: "custom",
  });

  app.use(vite.middlewares);

  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      const clientTemplate = path.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html",
      );

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`,
      );
      const host     = req.hostname || (req.headers.host as string) || "";
      const pathname = req.originalUrl.split("?")[0] || "/";
      const transformed = await vite.transformIndexHtml(url, template);

      let page: string;
      const videoDetailMatch = pathname.match(/^\/videos\/(\d+)$/);
      if (pathname === "/videos") {
        try {
          const videos = await storage.getTelegramVideos(20);
          const meta   = buildVideosPageMeta(videos);
          page = injectCustomMeta(transformed, meta);
        } catch {
          page = injectMeta(transformed, host, pathname);
        }
      } else if (videoDetailMatch) {
        try {
          const video = await storage.getTelegramVideo(Number(videoDetailMatch[1]));
          page = video
            ? injectCustomMeta(transformed, buildVideoDetailPageMeta(video))
            : injectMeta(transformed, host, pathname);
        } catch {
          page = injectMeta(transformed, host, pathname);
        }
      } else {
        page = injectMeta(transformed, host, pathname);
      }

      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}
