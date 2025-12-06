import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { pushToGitHub } from "./github";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  app.post('/api/github/push', async (req, res) => {
    try {
      const { owner, repo, branch = 'main', message = 'Update from NexusOS' } = req.body;
      
      if (!owner || !repo) {
        return res.status(400).json({ error: 'owner and repo are required' });
      }
      
      const result = await pushToGitHub(owner, repo, branch, message);
      res.json(result);
    } catch (error: any) {
      console.error('GitHub push error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  return httpServer;
}
