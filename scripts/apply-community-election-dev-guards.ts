import { readFile } from "node:fs/promises";
import pg from "pg";

// Invoked only by development post-merge setup, never build or app startup.
if (process.env.NODE_ENV === "production")
  throw new Error("Community election setup is development-only; use the approved publish schema flow for production");
const pool = new pg.Pool({connectionString:process.env.DATABASE_URL});
try {
  await pool.query(await readFile("migrations/community-election-continuity.sql","utf8"));
  console.log("Development community election continuity constraints installed");
} finally { await pool.end(); }
