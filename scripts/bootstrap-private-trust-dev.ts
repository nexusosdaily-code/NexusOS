import { readFile } from "node:fs/promises";
import { pool } from "../server/db";

if (process.env.NODE_ENV === "production") {
  console.error("Private trust development bootstrap cannot run in production");
  process.exitCode=1;
  await pool.end();
} else {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(708708)");
    await client.query(await readFile("migrations/private-trust.sql","utf8"));
    await client.query("COMMIT");
    console.log("Private trust development schema ready; independent identity, approved storage and encryption still required");
  } catch {
    await client.query("ROLLBACK");
    console.error("Private trust schema bootstrap failed; no successful migration was confirmed");
    process.exitCode=1;
  } finally { client.release(); await pool.end(); }
}
