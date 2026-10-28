import express, { type RequestHandler, type ErrorRequestHandler } from "express";
import { authenticate } from "./auth";
import { trustEvidenceUploadsEnabled } from "./governance/private-trust-security";

/** Authenticate and bound uploads before any global body parser can see evidence. */
export const privateTrustInputBoundary: RequestHandler[] = [
  (req,res,next)=>{
    res.set({"Cache-Control":"no-store, private","X-Content-Type-Options":"nosniff"});
    if (!/^Bearer\s+\S+$/.test(req.headers.authorization ?? "")) {
      res.status(401).json({error:"Authenticated bearer session required"});
      return;
    }
    next();
  },
  authenticate,
  (req,res,next)=>{
    if (req.method === "POST" && /^\/[^/]+\/evidence\/?$/.test(req.path) && !trustEvidenceUploadsEnabled()) {
      res.status(503).json({error:"Private evidence uploads are deliberately disabled"});
      return;
    }
    next();
  },
  async (req,res,next)=>{
    try {
      const {pool} = await import("./db");
      const {rows} = await pool.query(
        `INSERT INTO private_trust_request_windows(user_id,requests,expires_at)
         VALUES($1,1,now()+interval '1 minute')
         ON CONFLICT(user_id) DO UPDATE SET
           requests=CASE WHEN private_trust_request_windows.expires_at<=now() THEN 1
             ELSE LEAST(private_trust_request_windows.requests+1,61) END,
           expires_at=CASE WHEN private_trust_request_windows.expires_at<=now()
             THEN now()+interval '1 minute' ELSE private_trust_request_windows.expires_at END
         RETURNING requests`,[req.user!.id]);
      if (rows[0].requests>60) {
        res.set("Retry-After","60");
        res.status(429).json({error:"Private workspace request limit reached; retry after one minute"});
        return;
      }
      next();
    } catch {
      res.status(503).json({error:"Private workspace request protection is unavailable"});
    }
  },
  express.json({limit:"7mb"}),
];
export const privateTrustInputError: ErrorRequestHandler = (_error,_req,res,_next)=>{
  const tooLarge = _error?.type === "entity.too.large";
  res.set("Cache-Control","no-store, private");
  res.status(tooLarge ? 413 : 400).json({error:tooLarge ? "Private upload is too large" : "Invalid private workspace request"});
};
