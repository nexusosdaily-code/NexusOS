import type { Request, Response } from "express";
import type { Pool } from "pg";
import { assertUserOutgoingAllowed } from "./founder-wallet-lock";

/** A debit boundary, not an authentication or URL-policy substitute. */
export function createSpectralBundleHandler(pool: Pick<Pool,"query">) {
  return async (req: Request, res: Response) => {
    try {
      if (!req.user?.id) return res.status(401).json({error:"Sign-in required"});
      const userId=req.user.id;
      // Check before imports, price requests or any asset/position mutation.
      await assertUserOutgoingAllowed(userId,pool);
      const {db}=await import("./db");
      const {spectralBundles,wallets,wnusdPositions,wnusdTransactions}=await import("@shared/schema");
      const {eq}=await import("drizzle-orm");
      const {randomUUID}=await import("node:crypto");
      const nxtAmount=parseFloat(req.body.nxtAmount ?? "0");
      const runesAmount=parseInt(String(req.body.runesAmount ?? "0"),10);
      const satsAmount=parseInt(String(req.body.satsAmount ?? "0"),10);
      if (![nxtAmount,runesAmount,satsAmount].every(Number.isFinite) || nxtAmount<0 || runesAmount<0 || satsAmount<0) {
        return res.status(400).json({error:"Amounts must be finite and non-negative"});
      }
      if (nxtAmount===0 && runesAmount===0 && satsAmount===0) return res.status(400).json({error:"Bundle must contain at least one asset"});
      let btcUsd=66_000;
      try {
        const pr=await fetch("https://api.coindesk.com/v1/bpi/currentprice/USD.json");
        if (pr.ok) {const pd=await pr.json() as any;btcUsd=pd.bpi?.USD?.rate_float ?? btcUsd;}
      } catch {}
      const [wallet]=await db.select().from(wallets).where(eq(wallets.userId,userId));
      if (!wallet) return res.status(400).json({error:"NXT wallet not found"});
      const walletBal=parseFloat(wallet.balance);
      if (nxtAmount>0 && walletBal<nxtAmount) return res.status(400).json({error:`Insufficient NXT balance (have ${walletBal.toFixed(2)}, need ${nxtAmount})`});
      const totalSatsEq=Math.round(nxtAmount*1_000+runesAmount*1_000+satsAmount);
      const totalUsd=totalSatsEq*(btcUsd/100_000_000),colRatio=1.5,wnusdMinted=totalUsd/colRatio;
      if (wnusdMinted<0.000001) return res.status(400).json({error:"Bundle value too small to mint WNUSD"});
      const user=req.user!;
      const psiChannel=`Ψ(${(user as any).spectralWdm ?? 0},${(user as any).spectralOam ?? 0},${(user as any).spectralPol ?? "H"})`;
      const bundle=await db.transaction(async tx=>{
        // Recheck at execution; database triggers also reject a concurrent
        // relock or any direct debit/creation that bypasses this handler.
        await assertUserOutgoingAllowed(userId,pool);
        if (nxtAmount>0) await tx.update(wallets)
          .set({balance:(walletBal-nxtAmount).toFixed(8),updatedAt:new Date()})
          .where(eq(wallets.id,wallet.id));
        const bundleId=randomUUID(),posId=randomUUID();
        const [created]=await tx.insert(spectralBundles).values({
          id:bundleId,userId,nxtLocked:nxtAmount.toFixed(8),runesLocked:runesAmount,satsLocked:satsAmount,
          totalSatsEq,totalUsdValue:totalUsd.toFixed(2),wnusdMinted:wnusdMinted.toFixed(8),
          colRatioPct:(colRatio*100).toFixed(2),btcUsdAtMint:btcUsd.toFixed(2),psiChannel,status:"active",
        }).returning();
        await tx.insert(wnusdPositions).values({
          id:posId,userId,collateralSats:totalSatsEq,nxtFeeSent:"0",wnusdMinted:wnusdMinted.toFixed(8),
          colRatioPct:(colRatio*100).toFixed(2),btcUsdAtMint:btcUsd.toFixed(2),status:"active",
        });
        await tx.insert(wnusdTransactions).values({
          id:randomUUID(),userId,positionId:posId,type:"mint",satsDelta:totalSatsEq,
          wnusdDelta:wnusdMinted.toFixed(8),nxtFee:"0",colRatioPct:(colRatio*100).toFixed(2),btcUsdAtTime:btcUsd.toFixed(2),
        });
        return created;
      });
      // Never report success before the debit/position transaction commits.
      return res.json({ok:true,bundle,wnusdMinted:wnusdMinted.toFixed(6),psiChannel});
    } catch (error:any) {
      if (error.status===423 || error.message==="FOUNDER_WALLET_LOCKED") {
        return res.status(423).json({error:"This wallet is locked by Nexus",code:"FOUNDER_WALLET_LOCKED"});
      }
      return res.status(503).json({error:"Bundle creation unavailable; no successful result confirmed"});
    }
  };
}
