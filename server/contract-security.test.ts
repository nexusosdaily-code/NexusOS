import { describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import ts from "typescript";
import * as security from "./contract-security";
import { assertVmSource, assertBrowserInstructions, VM_MAX_SOURCE_LENGTH, BROWSER_VM_MAX_INSTRUCTIONS } from "../shared/vm-security";

// Exercise the real handlers without importing routes.ts's live services or database.
const source = readFileSync(new URL("./routes.ts", import.meta.url), "utf8");
const executionRoute = source.slice(source.indexOf("  const contractActionGuard = "), source.indexOf("  // ── Contract state — public read"));
const fundingRoute = source.slice(source.indexOf('  app.post("/api/contracts/:id/fund"'), source.indexOf("  // ── Nexus Explorer — contract execution audit ledger"));

function fixture() {
  const state = { contract: 1, wallet: 2, writes: 0, transfers: 0, requests: [] as string[] };
  let snapshot = { ...state, requests: [...state.requests] };
  let unlock: (() => void) | undefined;
  let tail = Promise.resolve();
  const queries: string[] = [];
  const failAudit = { value: false };
  const held = { value: false };
  const databasePool = {
    connect: async () => {
      // Simulate PostgreSQL's per-contract row lock with serial connections.
      const previous = tail;
      tail = new Promise<void>(resolve => { unlock = resolve; });
      const release = unlock!;
      await previous;
      return {
        release,
        query: async (sql: string, params: any[] = []) => {
          queries.push(sql);
          if (sql === "BEGIN") snapshot = { ...state, requests: [...state.requests] };
          if (sql === "ROLLBACK") Object.assign(state, snapshot, { requests: [...snapshot.requests] });
          if (sql.includes("FROM spectral_contracts")) return { rows: [{ id: "contract", name: "demo", user_id: "owner", contract_nxt_balance: state.contract.toFixed(8), source_code: "demo", owner_role: "user" }] };
          if (sql.includes("SELECT id FROM contract_executions")) return { rows: state.requests.includes(params[0]) ? [{ id: params[0] }] : [] };
          if (sql.includes("SELECT key, value")) return { rows: [] };
          if (sql.includes("INSERT INTO contract_state")) state.writes++;
          if (sql.includes("UPDATE wallets")) {
            if (state.wallet < Number(params[0])) return { rows: [] };
            state.wallet -= Number(params[0]); return { rows: [{ balance: state.wallet.toFixed(8) }] };
          }
          if (sql.includes("UPDATE spectral_contracts SET contract_nxt_balance")) {
            const amount = Number(params[0]);
            if (sql.includes("balance-$1")) {
              if (state.contract < amount) return { rows: [] };
              state.contract -= amount;
            } else state.contract += amount;
            return { rows: [{ contract_nxt_balance: state.contract.toFixed(8) }] };
          }
          if (sql.includes("INSERT INTO contract_executions")) {
            state.requests.push(params[16]); return { rows: [{ id: params[16] }] };
          }
          if (sql.includes("INSERT INTO blockchain_tx_pool")) {
            if (failAudit.value) throw new Error("synthetic audit failure");
            if (sql.includes("'contract_xfer'")) state.transfers++;
            return { rows: [{ id: randomUUID() }] };
          }
          return { rows: [], command: sql === "COMMIT" ? "COMMIT" : "" };
        },
      };
    },
  };
  const result = {
    effects: [{ type: "XFER_NXT", amount: "1", to: "recipient" }],
    stateDelta: { hello: "world" }, output: [], registers: [], agents: [],
    cycleCount: 3, halted: true, truncated: false,
  };
  const vmRuntime = { runToHalt: vi.fn(() => result), ceEncode: () => ({ nm: 520, psi: "Ψ(1,1,H)" }), fireEffects: vi.fn(async () => {}) };
  const handlers = new Map<string, Function[]>();
  const dependencies = {
    ...security, databaseFakePool: databasePool, vmRuntime,
    app: { post: (url: string, ...fns: Function[]) => handlers.set(url, fns) },
    authenticate: (req: any, res: any, next: Function) => req.user ? next() : res.status(401).json({ error: "Sign in" }),
    isValidUUID: (value: unknown) => typeof value === "string" && /^[0-9a-f-]{36}$/i.test(value),
    REPLIT_AI_USER_ID: "ai",
    SafetyUnavailable: class extends Error {},
    requireSafetyPermit: vi.fn(),
    assertUserOutgoingAllowed: async () => {
      if (held.value) throw Object.assign(new Error("Wallet held"), { code: "FOUNDER_WALLET_LOCKED" });
    },
  };
  const isolated = (executionRoute + fundingRoute)
    .replaceAll('await import("./db")', "({pool: databaseFakePool})")
    .replaceAll('await import("./wnsp_vm")', "vmRuntime");
  const js = ts.transpileModule(isolated, { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText;
  new Function(...Object.keys(dependencies), js)(...Object.values(dependencies));
  async function request(path = "/api/app/:slug/run", user: string | null = "owner", body: any = {}) {
    const req = {
      params: { slug: "demo", id: randomUUID() },
      user: user ? { id: user, username: user } : undefined,
      body: { channel_load: 42, request_id: randomUUID(), amount_nxt: "1", ...body },
      is: () => true, get: () => "same-origin",
    };
    const res = { code: 200, body: null as any, status(n: number) { this.code = n; return this; }, json(data: any) { this.body = data; return this; }, setHeader() {} };
    const chain = handlers.get(path)!;
    const invoke = async (index: number): Promise<any> => {
      let continued: Promise<any> | undefined;
      await chain[index](req, res, () => { continued = invoke(index + 1); });
      await continued;
    };
    await invoke(0);
    return res;
  }
  return { request, state, queries, failAudit, held, vmRuntime, result };
}

describe("contract action security (isolated; no real wallets)", () => {
  it("requires authentication, ownership and a unique request before effects", async () => {
    const f = fixture();
    expect((await f.request(undefined, null)).code).toBe(401);
    expect((await f.request(undefined, "visitor")).code).toBe(403);
    expect((await f.request(undefined, "owner", { request_id: "bad" })).code).toBe(400);
    expect(f.state).toMatchObject({ contract: 1, writes: 0, transfers: 0 });
    expect(f.vmRuntime.fireEffects).not.toHaveBeenCalled();
  });
  it("rechecks wallet holds on server execution", async () => {
    const f = fixture(); f.held.value = true;
    expect((await f.request()).code).toBe(423);
    expect(f.vmRuntime.runToHalt).not.toHaveBeenCalled();
  });
  it("does not overspend on concurrent requests and locks the contract row", async () => {
    const f = fixture();
    const responses = await Promise.all([f.request(), f.request()]);
    expect(responses.map(r => r.code).sort()).toEqual([200, 409]);
    expect(f.state).toMatchObject({ contract: 0, transfers: 1, writes: 1 });
    expect(f.queries.some(q => q.includes("FOR UPDATE OF c"))).toBe(true);
    expect(f.vmRuntime.fireEffects).toHaveBeenCalledTimes(1);
  });
  it("does not repeat an execution with the same request id", async () => {
    const f = fixture(); const request_id = randomUUID();
    expect((await f.request(undefined, "owner", { request_id })).code).toBe(200);
    expect((await f.request(undefined, "owner", { request_id })).code).toBe(409);
    expect(f.state.transfers).toBe(1);
    expect(f.vmRuntime.fireEffects).toHaveBeenCalledTimes(1);
  });
  it("rolls state and balance back if the audit cannot be recorded", async () => {
    const f = fixture(); f.failAudit.value = true;
    expect((await f.request()).code).toBe(500);
    expect(f.state).toMatchObject({ contract: 1, writes: 0, transfers: 0, requests: [] });
    expect(f.vmRuntime.fireEffects).not.toHaveBeenCalled();
  });
  it("does not silently ignore unsupported sats transfers", async () => {
    const f = fixture(); f.result.effects[0].type = "XFER_SATS";
    expect((await f.request()).code).toBe(422);
    expect(f.state.writes).toBe(0);
  });
  it("atomically funds a contract and rolls the debit back on audit failure", async () => {
    const f = fixture(); f.failAudit.value = true;
    expect((await f.request("/api/contracts/:id/fund")).code).toBe(500);
    expect(f.state).toMatchObject({ wallet: 2, contract: 1 });
    f.failAudit.value = false;
    expect((await f.request("/api/contracts/:id/fund")).code).toBe(200);
    expect(f.state).toMatchObject({ wallet: 1, contract: 2 });
    expect(f.queries.some(q => q.includes("user_id=$2 FOR UPDATE"))).toBe(true);
  });
  it("does not overspend the funder's wallet with concurrent funding", async () => {
    const f = fixture();
    const requests = Array.from({ length: 3 }, () => f.request("/api/contracts/:id/fund"));
    expect((await Promise.all(requests)).map(r => r.code).sort()).toEqual([200, 200, 409]);
    expect(f.state).toMatchObject({ wallet: 0, contract: 3 });
  });
});

describe("decimal and resource limits", () => {
  it("rejects cross-site or non-JSON actions, then rate-limits authenticated actions", () => {
    let time = 0;
    const guard = security.createContractActionGuard(() => time);
    const res: any = { status: vi.fn().mockReturnThis(), json: vi.fn(), setHeader: vi.fn() };
    const next = vi.fn();
    const req: any = { user: { id: "owner" }, is: () => false, get: () => "same-origin" };
    guard(req, res, next); expect(res.status).toHaveBeenLastCalledWith(403);
    req.is = () => true; req.get = () => "cross-site";
    guard(req, res, next); expect(res.status).toHaveBeenLastCalledWith(403);
    req.get = () => "same-origin";
    for (let i = 0; i < 11; i++) guard(req, res, next);
    expect(next).toHaveBeenCalledTimes(10);
    expect(res.status).toHaveBeenLastCalledWith(429);
    time = 60_000; guard(req, res, next);
    expect(next).toHaveBeenCalledTimes(11);
  });
  it.each(["NaN", "Infinity", "-1", "1e5", "0", "0.000000001", "1junk", {}, null, Infinity])("rejects invalid monetary input %s", value => {
    expect(() => security.contractAmount(value)).toThrow();
  });
  it("preserves one smallest unit and exact eight-decimal amounts", () => {
    expect(security.contractAmount("0.00000001")).toBe("0.00000001");
    expect(security.contractAmount("999999999999.12345678")).toBe("999999999999.12345678");
  });
  it("rejects oversized source and browser instruction arrays", () => {
    expect(() => assertVmSource("x".repeat(VM_MAX_SOURCE_LENGTH + 1))).toThrow();
    expect(() => assertVmSource({})).toThrow();
    expect(() => assertVmSource("x".repeat(VM_MAX_SOURCE_LENGTH))).not.toThrow();
    expect(() => assertBrowserInstructions(new Array(BROWSER_VM_MAX_INSTRUCTIONS + 1))).toThrow();
  });
});
