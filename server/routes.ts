import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";

const SPECTRAL_API_URL = "http://127.0.0.1:5001";

async function proxyToSpectralAPI(req: Request, res: Response, endpoint: string) {
  try {
    const url = `${SPECTRAL_API_URL}${endpoint}`;
    const options: RequestInit = {
      method: req.method,
      headers: {
        "Content-Type": "application/json",
      },
    };

    if (req.method === "POST" && req.body) {
      options.body = JSON.stringify(req.body);
    }

    const response = await fetch(url, options);
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error: any) {
    console.error(`Spectral API proxy error: ${error.message}`);
    res.status(503).json({
      error: "Spectral API unavailable",
      message: "The encoding service is not running. Please start the Spectral API.",
      details: error.message,
    });
  }
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Spectral API proxy routes
  app.get("/api/spectral/health", (req, res) => {
    proxyToSpectralAPI(req, res, "/api/spectral/health");
  });

  app.get("/api/spectral/constants", (req, res) => {
    proxyToSpectralAPI(req, res, "/api/spectral/constants");
  });

  app.get("/api/spectral/capacity", (req, res) => {
    proxyToSpectralAPI(req, res, "/api/spectral/capacity");
  });

  app.post("/api/spectral/encode", (req, res) => {
    proxyToSpectralAPI(req, res, "/api/spectral/encode");
  });

  app.post("/api/spectral/char-to-wavelength", (req, res) => {
    proxyToSpectralAPI(req, res, "/api/spectral/char-to-wavelength");
  });

  app.post("/api/spectral/wavelength-to-frequency", (req, res) => {
    proxyToSpectralAPI(req, res, "/api/spectral/wavelength-to-frequency");
  });

  // use storage to perform CRUD operations on the storage interface
  // e.g. storage.insertUser(user) or storage.getUserByUsername(username)

  return httpServer;
}
