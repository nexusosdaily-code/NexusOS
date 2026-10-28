import { readFile } from "node:fs/promises";
import pg from "pg";
if (process.env.NODE_ENV === "production")
  throw new Error("Wallet wave setup is development-only; production requires the approved schema flow");
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
try {
  await pool.query(await readFile("migrations/wallet-wave-communications.sql", "utf8"));
  console.log("Development wallet wave communication storage installed");
} finally { await pool.end(); }
