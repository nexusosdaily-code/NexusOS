import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir, userInfo } from "node:os";
import { join } from "node:path";
import pg from "pg";
import { waveRecipientDirectory } from "./wave-recipient-directory";

let directory = "";
let started = false;
let pool: pg.Pool;
beforeAll(async () => {
  // Dedicated disposable cluster: never read DATABASE_URL or connect to app accounts.
  directory = mkdtempSync(join(tmpdir(), "wnsp-directory-pg-"));
  execFileSync("initdb", ["-D", join(directory, "data"), "-A", "trust",
    "--no-locale", "-U", userInfo().username], { stdio: "pipe" });
  execFileSync("pg_ctl", ["-D", join(directory, "data"), "-l", join(directory, "postgres.log"),
    "-o", `-h '' -k ${directory} -p 55447`, "-w", "start"], { stdio: "pipe" });
  started = true;
  pool = new pg.Pool({ host: directory, port: 55447, database: "postgres",
    user: userInfo().username, password: "", max: 2 });
  await pool.query(`
    CREATE TABLE users (id text PRIMARY KEY, username text NOT NULL, is_active boolean DEFAULT true);
    CREATE TABLE wallets (id text PRIMARY KEY, user_id text NOT NULL);
    CREATE TABLE wnsp_registry (id text PRIMARY KEY, wnsp_uri text UNIQUE,
      registered_by text, resource_type text, resource_id text,
      is_public boolean DEFAULT true, is_canonical boolean DEFAULT false,
      created_at timestamp DEFAULT now());
    INSERT INTO users (id,username) VALUES
      ('viewer','Owner'),('family','家族'),('private','Private'),
      ('foreign','Foreign'),('wallet','Wallet user'),('no-wallet','No wallet'),
      ('inactive','Inactive'),('computed','Computed');
    UPDATE users SET is_active=false WHERE id='inactive';
    INSERT INTO wallets (id,user_id) SELECT 'w-'||id,id FROM users WHERE id<>'no-wallet';
    INSERT INTO wnsp_registry (id,wnsp_uri,registered_by,resource_type,resource_id,is_public) VALUES
      ('self','wnsp://Ψ(1,0,H)/owner','viewer','user','viewer',true),
      ('family','wnsp://Ψ(2,0,H)/家族','family','user','family',true),
      ('private','wnsp://Ψ(3,0,H)/secret','private','user','private',false),
      ('foreign','wnsp://Ψ(4,0,H)/not-theirs','foreign','user','family',true),
      ('wallet','wnsp://Ψ(5,0,H)/wallet','wallet','wallet','w-wallet',true),
      ('no-wallet','wnsp://Ψ(6,0,H)/missing','no-wallet','user','no-wallet',true),
      ('inactive','wnsp://Ψ(7,0,H)/inactive','inactive','user','inactive',true),
      ('computed','https://not-a-wave.invalid','computed','user','computed',true);
  `);
}, 30_000);
afterAll(async () => {
  await pool?.end();
  if (started) execFileSync("pg_ctl", ["-D", join(directory, "data"), "-m", "immediate",
    "-w", "stop"], { stdio: "pipe" });
  if (directory) rmSync(directory, { recursive: true, force: true });
});

describe("recipient directory PostgreSQL ownership and privacy", () => {
  it("offers only active, public, self-owned user or wallet registrations", async () => {
    const result = await waveRecipientDirectory(pool, "viewer", "");
    expect(result.recipients).toEqual([
      { username: "Wallet user", waveAddress: "wnsp://Ψ(5,0,H)/wallet" },
      { username: "家族", waveAddress: "wnsp://Ψ(2,0,H)/家族" },
    ]);
  });
  it("searches Unicode labels and full registered addresses", async () => {
    expect((await waveRecipientDirectory(pool, "viewer", "家族")).recipients).toHaveLength(1);
    expect((await waveRecipientDirectory(pool, "viewer", "Ψ(5,0,H)")).recipients[0]?.username)
      .toBe("Wallet user");
  });
  it("treats wildcard and SQL-like search as literal text", async () => {
    expect((await waveRecipientDirectory(pool, "viewer", "%")).recipients).toEqual([]);
    expect((await waveRecipientDirectory(pool, "viewer", "' OR 1=1 --")).recipients).toEqual([]);
  });
});
