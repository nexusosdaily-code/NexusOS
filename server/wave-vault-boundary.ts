import express,{type RequestHandler,type ErrorRequestHandler} from "express";
import { authenticate } from "./auth";
import { storage } from "./storage";
import { WAVE_VAULT_LIMITS } from "../shared/wave-vault";
export const waveVaultInputBoundary:RequestHandler[]=[
  authenticate,
  async(req,res,next)=>{
    try{
      if(!await storage.checkRateLimit(req.user!.id,"wave_vault_requests",120,60_000)){
        res.set("Retry-After","60");res.status(429).json({error:"Private file request limit reached; retry in one minute"});return;
      }
      next();
    }catch{res.status(503).json({error:"Private file request protection is unavailable"});}
  },
  (req,res,next)=>{
    res.set({"Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff"});
    if(req.headers["content-encoding"]&&req.headers["content-encoding"]!=="identity"){
      res.status(415).json({error:"Compressed private file requests are not accepted"});return;
    }
    if(req.method==="PUT") {
      const length=req.headers["content-length"];
      if(!req.is("application/octet-stream")){res.status(415).json({error:"Send the original file bytes as application/octet-stream"});return;}
      if(length&&(!/^\d+$/.test(length)||Number(length)>WAVE_VAULT_LIMITS.maxFileBytes)){
        res.status(413).json({error:"Private file exceeds 256 MiB"});return;
      }
      next();return;
    }
    if(["POST","PATCH"].includes(req.method)&&!req.is("application/json")){
      res.status(415).json({error:"File metadata must be JSON"});return;
    }
    next();
  },
  express.json({limit:"12kb",inflate:false}),
];
export const waveVaultInputError:ErrorRequestHandler=(error,_req,res,_next)=>{
  res.set("Cache-Control","private, no-store");
  res.status(error?.type==="entity.too.large"?413:400).json({error:"Invalid or oversized private file request"});
};
