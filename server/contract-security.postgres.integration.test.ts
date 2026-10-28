import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir, userInfo } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import pg from "pg";
import ts from "typescript";
import * as security from "./contract-security";

// Execute the actual route bodies, not a reimplementation. Only authentication,
// VM output and external delivery are fixtures; all financial SQL runs in PostgreSQL.
const source = readFileSync(new URL("./routes.ts", import.meta.url), "utf8");
const routes = (
  source.slice(source.indexOf("  const contractActionGuard = "), source.indexOf("  // ── Contract state — public read")) +
  source.slice(source.indexOf('  app.post("/api/contracts/:id/fund"'), source.indexOf("  // ── Nexus Explorer — contract execution audit ledger"))
).replaceAll('await import("./db")', "({pool: isolatedPool})")
 .replaceAll('await import("./wnsp_vm")', "vmRuntime");

let directory: string;
let pool: pg.Pool;
let started = false;
const owner = randomUUID();
const first = randomUUID();
const second = randomUUID();
let rejectAudit = false;
let held = false;
let output: any;
let handlers: Map<string, Function[]>;
let deliveries: number[];

async function request(path: "run" | "fund", options: {
  contract?: string; slug?: string; amount?: string; id?: string; user?: string | null;
} = {}) {
  const req = {
    params: { id: options.contract ?? first, slug: options.slug ?? "first" },
    user: options.user === null ? undefined : { id: options.user ?? owner, username: "synthetic-owner" },
    body: { channel_load: 42, request_id: options.id ?? randomUUID(), amount_nxt: options.amount ?? "1" },
    is: () => true, get: () => "same-origin",
  };
  const res = {
    code: 200, body: null as any, setHeader() {},
    status(code: number) { this.code = code; return this; },
    json(body: any) { this.body = body; return this; },
  };
  const chain = handlers.get(path === "run" ? "/api/app/:slug/run" : "/api/contracts/:id/fund")!;
  async function invoke(index: number): Promise<void> {
    let next: Promise<void> | undefined;
    await chain[index](req, res, () => { next = invoke(index + 1); });
    await next;
  }
  await invoke(0);
  return res;
}

beforeAll(async () => {
  if (process.env.WNSP_PUBLISH_BUILD === "1" || process.env.NODE_ENV === "production") {
    throw new Error("Temporary PostgreSQL security tests cannot run during publishing");
  }
  directory = mkdtempSync(join(tmpdir(), "wnsp-pg-"));
  execFileSync("initdb", ["-D", join(directory, "data"), "-A", "trust", "--no-locale", "-U", userInfo().username], { stdio: "pipe" });
  // No TCP listener, private mkdtemp directory, no inherited application DB settings.
  execFileSync("pg_ctl", ["-D", join(directory, "data"), "-l", join(directory, "postgres.log"),
    "-o", `-h '' -k ${directory} -p 55439 -c max_connections=20`, "-w", "start"], { stdio: "pipe" });
  started = true;
  pool = new pg.Pool({
    host: directory, port: 55439, database: "postgres", user: userInfo().username,
    password: "", max: 8, connectionTimeoutMillis: 5_000,
  });
  await pool.query(`
    CREATE TABLE users (id uuid PRIMARY KEY, role text, spectral_band text);
    CREATE TABLE wallets (user_id uuid PRIMARY KEY REFERENCES users, balance numeric(24,8), updated_at timestamptz);
    CREATE TABLE spectral_contracts (
      id uuid PRIMARY KEY, name text, source_code text, user_id uuid REFERENCES users,
      contract_nxt_balance numeric(24,8), app_slug text UNIQUE, is_public boolean, status text
    );
    CREATE TABLE contract_state (contract_id uuid, key text, value jsonb, updated_at timestamptz, PRIMARY KEY(contract_id,key));
    CREATE TABLE blockchain_tx_pool (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), from_address text, to_address text, amount_nxt numeric(24,8),
      memo text, wavelength_nm numeric, psi_channel text, fee_paid numeric(24,8), status text, tx_type text, audit_meta jsonb
    );
    CREATE TABLE contract_executions (
      id uuid PRIMARY KEY, contract_id uuid, caller_user_id uuid, caller_address text,
      channel_load integer, output jsonb, final_registers jsonb, final_agents jsonb,
      cycle_count integer, halted boolean, truncated boolean, state_delta jsonb,
      transfer_results jsonb, subcall_results jsonb, effects_count integer, contract_name text, contract_slug text,
      chain_tx_id uuid
    );
    CREATE FUNCTION deny_test_audit() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN IF current_setting('wnsp.test_reject_audit',true)='yes' THEN
        RAISE EXCEPTION 'synthetic audit failure'; END IF; RETURN NEW; END $$;
    CREATE TRIGGER fail_audit BEFORE INSERT ON blockchain_tx_pool FOR EACH ROW EXECUTE FUNCTION deny_test_audit();
  `);
});

afterAll(async () => {
  await pool?.end();
  if (started) execFileSync("pg_ctl", ["-D", join(directory, "data"), "-m", "immediate", "-w", "stop"], { stdio: "pipe" });
  if (directory) rmSync(directory, { recursive: true, force: true });
});

beforeEach(async () => {
  await pool.query("TRUNCATE contract_executions, contract_state, blockchain_tx_pool, spectral_contracts, wallets, users");
  await pool.query("INSERT INTO users VALUES ($1,'user','VISIBLE')", [owner]);
  await pool.query("INSERT INTO wallets VALUES ($1,1.00000001,now())", [owner]);
  for (const [id, slug] of [[first, "first"], [second, "second"]]) {
    await pool.query("INSERT INTO spectral_contracts VALUES ($1,$2,'synthetic',$3,1.00000001,$2,true,'deployed')", [id, slug, owner]);
  }
  held = rejectAudit = false;
  deliveries = [];
  output = {
    effects: [{ type: "XFER_NXT", amount: "1", to: "synthetic-recipient" }],
    stateDelta: { marker: "test" }, output: [], registers: [], agents: [],
    cycleCount: 1, halted: true, truncated: false,
  };
  handlers = new Map();
  const dependencies = {
    ...security, isolatedPool: pool,
    // Inject failure using a real PostgreSQL trigger within the real transaction.
    contractTransaction: (p: pg.Pool, work: (c: pg.PoolClient) => Promise<any>) =>
      security.contractTransaction(p, async client => {
        if (rejectAudit) await client.query("SET LOCAL wnsp.test_reject_audit='yes'");
        return work(client);
      }),
    vmRuntime: {
      runToHalt: () => output, ceEncode: () => ({ nm: 520, psi: "synthetic-address" }),
      fireEffects: async () => {
        // Separate connection must see the execution row: delivery follows COMMIT.
        const { rows } = await pool.query("SELECT count(*)::int AS count FROM contract_executions");
        deliveries.push(rows[0].count);
      },
    },
    app: { post: (path: string, ...fns: Function[]) => handlers.set(path, fns) },
    authenticate: (req: any, res: any, next: Function) => req.user ? next() : res.status(401).json({ error: "Sign in" }),
    isValidUUID: (id: unknown) => typeof id === "string" && /^[0-9a-f-]{36}$/i.test(id),
    REPLIT_AI_USER_ID: "synthetic-ai", SafetyUnavailable: class extends Error {},
    requireSafetyPermit: vi.fn(),
    assertUserOutgoingAllowed: async () => {
      if (held) throw Object.assign(new Error("Synthetic wallet hold"), { code: "FOUNDER_WALLET_LOCKED" });
    },
  };
  const js = ts.transpileModule(routes, { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText;
  new Function(...Object.keys(dependencies), js)(...Object.values(dependencies));
});

describe("actual financial routes on private temporary PostgreSQL", () => {
  it("serializes concurrent executions without overspending", async () => {
    const results = await Promise.all([request("run"), request("run")]);
    expect(pool.totalCount).toBeGreaterThanOrEqual(2);
    expect(results.map(r => r.code).sort()).toEqual([200, 409]);
    expect((await pool.query("SELECT contract_nxt_balance FROM spectral_contracts WHERE id=$1", [first])).rows[0].contract_nxt_balance).toBe("0.00000001");
    await vi.waitFor(() => expect(deliveries).toEqual([1]));
  });
  it("commits a repeated execution ID only once", async () => {
    const id = randomUUID();
    expect((await Promise.all([request("run", { id }), request("run", { id })])).map(r => r.code).sort()).toEqual([200, 409]);
    expect((await pool.query("SELECT count(*)::int AS count FROM contract_executions")).rows[0].count).toBe(1);
  });
  it("protects one wallet when two different contracts are funded concurrently", async () => {
    const results = await Promise.all([request("fund"), request("fund", { contract: second })]);
    expect(results.map(r => r.code).sort()).toEqual([200, 409]);
    expect((await pool.query("SELECT balance FROM wallets")).rows[0].balance).toBe("0.00000001");
    expect((await pool.query("SELECT sum(contract_nxt_balance)::text AS total FROM spectral_contracts")).rows[0].total).toBe("3.00000002");
  });
  it("serializes funding the same contract and preserves exact decimals", async () => {
    const results = await Promise.all([request("fund", { amount: "0.50000000" }), request("fund", { amount: "0.50000001" })]);
    expect(results.map(r => r.code)).toEqual([200, 200]);
    expect((await pool.query("SELECT balance FROM wallets")).rows[0].balance).toBe("0.00000000");
    expect((await pool.query("SELECT contract_nxt_balance FROM spectral_contracts WHERE id=$1", [first])).rows[0].contract_nxt_balance).toBe("2.00000002");
  });
  it("rolls back state, debit and queued effects when execution audit fails", async () => {
    rejectAudit = true;
    expect((await request("run")).code).toBe(500);
    expect((await pool.query("SELECT contract_nxt_balance FROM spectral_contracts WHERE id=$1", [first])).rows[0].contract_nxt_balance).toBe("1.00000001");
    for (const table of ["contract_state", "contract_executions", "blockchain_tx_pool"]) {
      expect((await pool.query(`SELECT count(*)::int AS count FROM ${table}`)).rows[0].count).toBe(0);
    }
    expect(deliveries).toEqual([]);
  });
  it("rolls back both sides of funding when its audit fails", async () => {
    rejectAudit = true;
    expect((await request("fund")).code).toBe(500);
    expect((await pool.query("SELECT balance FROM wallets")).rows[0].balance).toBe("1.00000001");
    expect((await pool.query("SELECT contract_nxt_balance FROM spectral_contracts WHERE id=$1", [first])).rows[0].contract_nxt_balance).toBe("1.00000001");
  });
  it("rejects unsigned, other-owner, held-wallet and unsupported-sats actions without writes", async () => {
    expect((await request("run", { user: null })).code).toBe(401);
    expect((await request("run", { user: randomUUID() })).code).toBe(403);
    held = true;
    expect((await request("run")).code).toBe(423);
    held = false;
    output.effects = [{ type: "XFER_SATS", amount: "1", to: "synthetic-recipient" }];
    expect((await request("run")).code).toBe(422);
    expect((await pool.query("SELECT count(*)::int AS count FROM contract_executions")).rows[0].count).toBe(0);
    expect(deliveries).toEqual([]);
  });
  it("does not report success when PostgreSQL COMMIT rolls back an aborted transaction", async () => {
    await expect(security.contractTransaction(pool, async client => {
      await client.query("UPDATE wallets SET balance=0");
      try { await client.query("SELECT * FROM nonexistent_security_fixture"); } catch { /* model a caught nested SQL failure */ }
      return "must not be returned";
    })).rejects.toThrow();
    expect((await pool.query("SELECT balance FROM wallets")).rows[0].balance).toBe("1.00000001");
  });
});
