---
name: drizzle-kit push TTY prompt workaround
description: When db:push fails with "Interactive prompts require a TTY terminal" for a simple additive column, apply the equivalent SQL directly instead
---

`npm run db:push` (drizzle-kit push) can hit `Error: Interactive prompts require a TTY terminal` even for a plain new column addition — its columnsResolver sometimes still asks "is this a rename?" and there's no non-interactive flag that skips it (`--force` only auto-approves data-loss statements, not resolver prompts).

**Why:** The Replit agent shell has no TTY, so any drizzle-kit prompt (rename disambiguation, etc.) hard-fails rather than falling back to a default answer.

**How to apply:** For a simple, unambiguous additive change (new column, new index, no renames/no data loss), skip `db:push` and apply the equivalent `ALTER TABLE ... ADD COLUMN IF NOT EXISTS ...` / `CREATE INDEX IF NOT EXISTS ...` directly via `executeSql` against the dev database, matching exactly what Drizzle would have generated from the schema diff. Keep `shared/schema.ts` in sync so future `db:push` runs see the schema as already applied (no diff, no prompt). Only fall back to this for safe additive DDL — never for renames or destructive changes.
