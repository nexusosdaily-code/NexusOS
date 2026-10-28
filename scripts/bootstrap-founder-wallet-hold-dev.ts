import { readFile } from "node:fs/promises";
import { pool } from "../server/db";

if (process.env.NODE_ENV === "production") {
  console.error("Wallet-hold development bootstrap cannot run in production");
  process.exitCode=1;
  await pool.end();
} else {
  const client=await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(708709)");
    await client.query(await readFile("migrations/founder-wallet-hold.sql","utf8"));
    await client.query("COMMIT");
    console.log("Wallet-hold database execution guards ready; no funds or balances changed");
  } catch {
    await client.query("ROLLBACK");
    console.error("Wallet-hold database guard setup failed; no successful migration confirmed");
    process.exitCode=1;
  } finally {client.release();await pool.end();}
}
