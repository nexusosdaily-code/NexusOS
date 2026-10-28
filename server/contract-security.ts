import type { Request, Response, NextFunction } from "express";
import type { Pool, PoolClient } from "pg";

export class ContractSecurityError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

/** Money is validated as decimal text; never approve spending through parseFloat. */
export function contractAmount(value: unknown): string {
  if (typeof value !== "string" && typeof value !== "number") {
    throw new ContractSecurityError(400, "Amount must be a positive decimal");
  }
  const text = String(value);
  if (!/^(0|[1-9]\d{0,11})(\.\d{1,8})?$/.test(text)) {
    throw new ContractSecurityError(400, "Amount must have at most 8 decimal places");
  }
  const [whole, fraction = ""] = text.split(".");
  const units = BigInt(whole) * 100_000_000n + BigInt(fraction.padEnd(8, "0"));
  if (units <= 0n) throw new ContractSecurityError(400, "Amount must be greater than zero");
  return `${whole}.${fraction.padEnd(8, "0")}`;
}

export async function contractTransaction<T>(
  pool: Pick<Pool, "connect">,
  work: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SET LOCAL lock_timeout = '3s'");
    await client.query("SET LOCAL statement_timeout = '10s'");
    const result = await work(client);
    const committed = await client.query("COMMIT");
    if (committed.command !== "COMMIT") throw new Error("Contract transaction did not commit");
    return result;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

/** These limits supplement, not replace, authentication and database row locks. */
export function createContractActionGuard(now = () => Date.now()) {
  const windows = new Map<string, { start: number; count: number }>();
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: "Sign in before executing real actions" });
    if (!req.is("application/json") || req.get("Sec-Fetch-Site") === "cross-site") {
      return res.status(403).json({ error: "Use a same-site JSON request for real actions" });
    }
    const time = now();
    for (const [key, entry] of windows) {
      if (time - entry.start >= 60_000) windows.delete(key);
    }
    const key = req.user.id;
    const entry = windows.get(key) ?? { start: time, count: 0 };
    if (entry.count >= 10 || (!windows.has(key) && windows.size >= 10_000)) {
      res.setHeader("Retry-After", "60");
      return res.status(429).json({ error: "Too many contract actions; wait a minute" });
    }
    entry.count += 1;
    windows.set(key, entry);
    next();
  };
}
