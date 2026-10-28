import { and, eq, gte, sql } from "drizzle-orm";
import { lightningWallets, wallets } from "../shared/schema";

/** Arithmetic is evaluated on the locked/current row, never a JS snapshot. */
export async function changeLegacySats(db: any, userId: string, delta: number, totals: { deposited?: number; withdrawn?: number } = {}) {
  if (!Number.isSafeInteger(delta) || !Number.isSafeInteger(totals.deposited ?? 0) || !Number.isSafeInteger(totals.withdrawn ?? 0)) {
    throw new Error("Sats must be safe integers");
  }
  const [row] = await db.update(lightningWallets).set({
    satsBalance: sql`${lightningWallets.satsBalance} + ${delta}`,
    totalDeposited: sql`${lightningWallets.totalDeposited} + ${totals.deposited ?? 0}`,
    totalWithdrawn: sql`${lightningWallets.totalWithdrawn} + ${totals.withdrawn ?? 0}`,
    updatedAt: new Date(),
  }).where(and(eq(lightningWallets.userId, userId),
    ...(delta < 0 ? [gte(lightningWallets.satsBalance, -delta)] : []),
  )).returning();
  if (!row) throw new Error("Insufficient available sats or missing wallet");
  return row;
}

// Swaps/collateral operations must guard their other ledger leg too.
export async function changeLegacyNxt(db: any, userId: string, delta: number) {
  if (!Number.isFinite(delta) || Math.abs(delta) > 999_999_999_999) throw new Error("Invalid NXT amount");
  const amount = delta.toFixed(8);
  const [row] = await db.update(wallets).set({
    balance: sql`${wallets.balance} + ${amount}::numeric`,
    updatedAt: new Date(),
  }).where(and(eq(wallets.userId, userId), ...(delta < 0 ? [gte(wallets.balance, (-delta).toFixed(8))] : []))).returning();
  if (!row) throw new Error("Insufficient NXT balance or missing wallet");
  return row;
}
