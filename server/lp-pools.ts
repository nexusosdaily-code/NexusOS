/**
 * NexusOS Liquidity Pools — AMM (constant product x*y=k)
 *
 * Pools:
 *   nxt-sats   — NXT / sats (the primary swap pair)
 *   nxt-wnusd  — NXT / WNUSD (stable governance pair)
 *
 * LP token math:
 *   First provider:  lpOut = sqrt(amountA * amountB)
 *   Subsequent:      lpOut = min(amountA*totalLP/rA, amountB*totalLP/rB)
 *   Remove:          amountA = lp * rA / totalLP,  amountB = lp * rB / totalLP
 *   Swap:            amountOut = rOut * amtIn_eff / (rIn + amtIn_eff)
 *                    amtIn_eff = amtIn * (10000 - feeBps) / 10000
 */

import { db } from "./db";
import { liquidityPools, lpPositions } from "../shared/schema";
import { eq, and } from "drizzle-orm";

const TAG = "[LP]";

// ── Pool definitions ──────────────────────────────────────────────────────────
const SEED_POOLS = [
  {
    poolId:  "nxt-sats",
    name:    "NXT / Sats",
    tokenA:  "NXT",
    tokenB:  "SATS",
    feeBps:  30,
  },
  {
    poolId:  "nxt-wnusd",
    name:    "NXT / WNUSD",
    tokenA:  "NXT",
    tokenB:  "WNUSD",
    feeBps:  10,
  },
  {
    poolId:  "wsats-nxwv",
    name:    "wSATS / NXWV",
    tokenA:  "wSATS",
    tokenB:  "NXWV",
    feeBps:  20,   // 0.20% — tighter spread for native-sats pair
  },
];

// ── Seed pools on startup ─────────────────────────────────────────────────────
export async function seedPools() {
  for (const p of SEED_POOLS) {
    const existing = await db.select().from(liquidityPools).where(eq(liquidityPools.poolId, p.poolId));
    if (!existing.length) {
      await db.insert(liquidityPools).values({ ...p, reserveA: 0, reserveB: 0, totalLpTokens: 0 });
      console.log(`${TAG} Seeded pool ${p.poolId}`);
    }
  }
}

// ── Read helpers ──────────────────────────────────────────────────────────────
export async function getPools() {
  return db.select().from(liquidityPools);
}

export async function getPool(poolId: string) {
  const [pool] = await db.select().from(liquidityPools).where(eq(liquidityPools.poolId, poolId));
  return pool ?? null;
}

export async function getUserPositions(userId: string) {
  const positions = await db.select().from(lpPositions).where(eq(lpPositions.userId, userId));
  const pools     = await getPools();
  const poolMap   = Object.fromEntries(pools.map(p => [p.poolId, p]));

  return positions.map(pos => {
    const pool = poolMap[pos.poolId];
    if (!pool || pool.totalLpTokens === 0) {
      return { ...pos, valueA: 0, valueB: 0, sharePercent: "0.00", pool };
    }
    const share    = pos.lpTokens / pool.totalLpTokens;
    const valueA   = Math.floor(share * pool.reserveA);
    const valueB   = Math.floor(share * pool.reserveB);
    return { ...pos, valueA, valueB, sharePercent: (share * 100).toFixed(4), pool };
  });
}

// ── AMM math ──────────────────────────────────────────────────────────────────
function isqrt(n: number): number {
  if (n <= 0) return 0;
  return Math.floor(Math.sqrt(n));
}

function calcLpOut(amountA: number, amountB: number, reserveA: number, reserveB: number, totalLP: number): number {
  if (totalLP === 0) return isqrt(amountA * amountB);
  return Math.min(
    Math.floor(amountA * totalLP / reserveA),
    Math.floor(amountB * totalLP / reserveB),
  );
}

function calcSwapOut(amountIn: number, reserveIn: number, reserveOut: number, feeBps: number): { amountOut: number; fee: number } {
  if (reserveIn === 0 || reserveOut === 0) throw new Error("Pool has no liquidity");
  const amountInEff = Math.floor(amountIn * (10_000 - feeBps) / 10_000);
  const fee         = amountIn - amountInEff;
  const amountOut   = Math.floor(reserveOut * amountInEff / (reserveIn + amountInEff));
  if (amountOut <= 0) throw new Error("Insufficient output — try a larger amount");
  return { amountOut, fee };
}

// ── Add liquidity ─────────────────────────────────────────────────────────────
export async function addLiquidity(
  userId: string,
  poolId: string,
  amountA: number,
  amountB: number,
): Promise<{ lpTokens: number; pool: typeof liquidityPools.$inferSelect }> {
  const pool = await getPool(poolId);
  if (!pool) throw new Error(`Pool ${poolId} not found`);
  if (amountA <= 0 || amountB <= 0) throw new Error("Amounts must be positive");

  const lpOut = calcLpOut(amountA, amountB, pool.reserveA, pool.reserveB, pool.totalLpTokens);
  if (lpOut <= 0) throw new Error("LP tokens would be zero — amounts too small");

  // Update pool reserves
  const [updatedPool] = await db.update(liquidityPools)
    .set({
      reserveA:      pool.reserveA + amountA,
      reserveB:      pool.reserveB + amountB,
      totalLpTokens: pool.totalLpTokens + lpOut,
    })
    .where(eq(liquidityPools.poolId, poolId))
    .returning();

  // Upsert LP position
  const [existing] = await db.select().from(lpPositions)
    .where(and(eq(lpPositions.userId, userId), eq(lpPositions.poolId, poolId)));

  if (existing) {
    await db.update(lpPositions).set({
      lpTokens:   existing.lpTokens + lpOut,
      depositedA: existing.depositedA + amountA,
      depositedB: existing.depositedB + amountB,
      updatedAt:  new Date(),
    }).where(eq(lpPositions.id, existing.id));
  } else {
    await db.insert(lpPositions).values({
      userId, poolId,
      lpTokens: lpOut, depositedA: amountA, depositedB: amountB,
    });
  }

  console.log(`${TAG} addLiquidity userId=${userId} pool=${poolId} A=${amountA} B=${amountB} lp=${lpOut}`);
  return { lpTokens: lpOut, pool: updatedPool };
}

// ── Remove liquidity ──────────────────────────────────────────────────────────
export async function removeLiquidity(
  userId: string,
  poolId: string,
  lpTokens: number,
): Promise<{ amountA: number; amountB: number }> {
  const pool = await getPool(poolId);
  if (!pool) throw new Error(`Pool ${poolId} not found`);
  if (pool.totalLpTokens === 0) throw new Error("Pool is empty");

  const [pos] = await db.select().from(lpPositions)
    .where(and(eq(lpPositions.userId, userId), eq(lpPositions.poolId, poolId)));
  if (!pos) throw new Error("No LP position found");
  if (pos.lpTokens < lpTokens) throw new Error("Insufficient LP tokens");

  const amountA = Math.floor(lpTokens * pool.reserveA / pool.totalLpTokens);
  const amountB = Math.floor(lpTokens * pool.reserveB / pool.totalLpTokens);

  await db.update(liquidityPools).set({
    reserveA:      pool.reserveA - amountA,
    reserveB:      pool.reserveB - amountB,
    totalLpTokens: pool.totalLpTokens - lpTokens,
  }).where(eq(liquidityPools.poolId, poolId));

  const newLp = pos.lpTokens - lpTokens;
  if (newLp <= 0) {
    await db.delete(lpPositions).where(eq(lpPositions.id, pos.id));
  } else {
    await db.update(lpPositions).set({
      lpTokens: newLp,
      updatedAt: new Date(),
    }).where(eq(lpPositions.id, pos.id));
  }

  console.log(`${TAG} removeLiquidity userId=${userId} pool=${poolId} lp=${lpTokens} A=${amountA} B=${amountB}`);
  return { amountA, amountB };
}

// ── Swap ──────────────────────────────────────────────────────────────────────
export async function swap(
  poolId: string,
  tokenIn: "A" | "B",
  amountIn: number,
): Promise<{ amountOut: number; fee: number; priceImpactPct: number }> {
  const pool = await getPool(poolId);
  if (!pool) throw new Error(`Pool ${poolId} not found`);
  if (amountIn <= 0) throw new Error("amountIn must be positive");

  const [rIn, rOut] = tokenIn === "A"
    ? [pool.reserveA, pool.reserveB]
    : [pool.reserveB, pool.reserveA];

  const { amountOut, fee } = calcSwapOut(amountIn, rIn, rOut, pool.feeBps);

  const priceImpactPct = amountIn / (rIn + amountIn) * 100;

  const newRIn  = rIn + amountIn;
  const newROut = rOut - amountOut;
  const [newA, newB] = tokenIn === "A"
    ? [newRIn, newROut]
    : [newROut, newRIn];

  await db.update(liquidityPools).set({
    reserveA:    newA,
    reserveB:    newB,
    totalFeesA:  pool.totalFeesA + (tokenIn === "A" ? fee : 0),
  }).where(eq(liquidityPools.poolId, poolId));

  return { amountOut, fee, priceImpactPct: parseFloat(priceImpactPct.toFixed(2)) };
}

// ── Quote (read-only) ─────────────────────────────────────────────────────────
export async function quoteSwap(
  poolId: string,
  tokenIn: "A" | "B",
  amountIn: number,
): Promise<{ amountOut: number; fee: number; priceImpactPct: number; rate: number }> {
  const pool = await getPool(poolId);
  if (!pool) throw new Error(`Pool ${poolId} not found`);

  const [rIn, rOut] = tokenIn === "A"
    ? [pool.reserveA, pool.reserveB]
    : [pool.reserveB, pool.reserveA];

  if (rIn === 0 || rOut === 0) return { amountOut: 0, fee: 0, priceImpactPct: 0, rate: 0 };

  const { amountOut, fee } = calcSwapOut(amountIn, rIn, rOut, pool.feeBps);
  const priceImpactPct = amountIn / (rIn + amountIn) * 100;
  const rate = amountOut / amountIn;

  return { amountOut, fee, priceImpactPct: parseFloat(priceImpactPct.toFixed(2)), rate };
}
