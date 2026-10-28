import { generateDrizzleJson, generateMigration } from "drizzle-kit/api";
import pg from "pg";
import * as schema from "../shared/schema";

// Development post-merge only. Never run from build, app startup or production.
if (process.env.NODE_ENV === "production")
  throw new Error("Community election bootstrap is development-only");
if (!process.env.DATABASE_URL) throw new Error("Development database is required");

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const client = await pool.connect();
try {
  await client.query("BEGIN");
  await client.query("SELECT pg_advisory_xact_lock(hashtext('community-election-dev-bootstrap'))");
  const current = generateDrizzleJson(schema);
  const communityTables = Object.values(current.tables).filter(
    table => table.name.startsWith("community_") && table.name !== "community_mints",
  );
  const result = await client.query<{ table_name: string }>(
    "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = ANY($1::text[])",
    [communityTables.map(table => table.name)],
  );
  const existing = new Set(result.rows.map(row => row.table_name));
  const missing = new Set(communityTables.filter(table => !existing.has(table.name)).map(table => table.name));
  if (missing.size) {
    // Pretend all existing definitions are already current: this bootstrap
    // creates missing tables only, never changes or drops an existing table.
    const prior = structuredClone(current);
    for (const [key, table] of Object.entries(prior.tables)) {
      if (missing.has(table.name)) delete prior.tables[key];
    }
    const statements = await generateMigration(prior, current);
    for (const statement of statements) {
      const table = statement.match(/^CREATE TABLE "([^"]+)"/)?.[1]
        ?? statement.match(/^ALTER TABLE "([^"]+)" ADD CONSTRAINT .* FOREIGN KEY /)?.[1]
        ?? statement.match(/^CREATE (?:UNIQUE )?INDEX "[^"]+" ON "([^"]+)"/)?.[1];
      if (!table || !missing.has(table))
        throw new Error("Bootstrap refused a statement outside missing community tables");
    }
    for (const statement of statements) await client.query(statement);
    console.log(`Created ${missing.size} missing development community election tables`);
  } else {
    console.log("Development community election tables already exist");
  }
  await client.query("COMMIT");
} catch (error) {
  await client.query("ROLLBACK");
  throw error;
} finally {
  client.release();
  await pool.end();
}
