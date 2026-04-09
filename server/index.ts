import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { spawn, ChildProcess } from "child_process";
import { seedGenesisBlock } from "./genesis";

const app = express();
const httpServer = createServer(app);

let flaskProcess: ChildProcess | null = null;

function startFlaskAPI() {
  if (process.env.NODE_ENV === "production") return;
  
  console.log("Starting Spectral API server on port 5001...");
  
  flaskProcess = spawn("uv", ["run", "python", "spectral_api.py"], {
    stdio: ["ignore", "pipe", "pipe"],
    detached: false,
  });

  flaskProcess.stdout?.on("data", (data) => {
    process.stdout.write(data);
  });

  flaskProcess.stderr?.on("data", (data) => {
    process.stderr.write(data);
  });

  flaskProcess.on("error", (err) => {
    console.error("Failed to start Flask API:", err.message);
  });

  flaskProcess.on("exit", (code) => {
    if (code !== 0 && code !== null) {
      console.error(`Flask API exited with code ${code}`);
    }
  });
}

function cleanupFlask() {
  if (flaskProcess && !flaskProcess.killed) {
    flaskProcess.kill("SIGTERM");
    flaskProcess = null;
  }
}

process.on("SIGINT", () => {
  cleanupFlask();
  process.exit(0);
});

process.on("SIGTERM", () => {
  cleanupFlask();
  process.exit(0);
});

process.on("exit", () => {
  cleanupFlask();
});

startFlaskAPI();

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.use(
  express.json({
    limit: "150mb",
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false, limit: "150mb" }));

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  await registerRoutes(httpServer, app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true,
    },
    () => {
      log(`serving on port ${port}`);
      // Seed genesis block after server is ready (non-blocking)
      seedGenesisBlock().catch(() => {});
    },
  );
})();
