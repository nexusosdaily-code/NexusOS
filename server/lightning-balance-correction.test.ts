import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import type { Pool } from "pg";
import { applyApprovedCorrection, correctionApprovalSchema, inspectCorrection } from "./lightning-balance-correction";

const userId = "11111111-1111-4111-8111-111111111111";
const approvalId = "22222222-2222-4222-8222-222222222222";
const plan = {
  correctionKey: "historical-incident",
  userId, snapshotHash: "a".repeat(64),
  target: { satsBalance: "961", totalDeposited: "49961", totalWithdrawn: "0" },
  reason: "Independently reviewed phantom deposit correction",
  evidence: {
    deposits: "provider-deposit-review", withdrawals: "provider-withdrawal-review",
    otherActivity: "all-other-activity-review", priorApprovals: "founder-approval-review",
  },
  expiresAt: "2099-01-01T00:00:00.000Z",
};

function fixture(options: { role?: string; username?: string; missingApproval?: boolean;
  used?: boolean; auditFail?: boolean; ledgerFail?: boolean; noUpdate?: boolean } = {}) {
  let wallet = { id: 1, user_id: userId, sats_balance: "800", total_deposited: "49800",
    total_withdrawn: "0", updated_at: "2026-10-05 00:00:00" };
  let ledger: string[] = [];
  let details = { ...plan };
  const query = vi.fn(async (sql: string, params?: any[]) => {
    if (sql.includes("SELECT a.details")) return { rows: options.missingApproval ? [] : [{
      details, resource_id: userId, user_id: approvalId,
      role: options.role ?? "admin", username: options.username ?? "Nexus",
    }] };
    if (sql.includes("SELECT id FROM audit_logs")) return { rows: options.used ? [{ id: "used" }] : [] };
    if (sql.includes("SELECT id, user_id, sats_balance")) return { rows: [wallet] };
    if (sql.includes("SELECT id, is_active")) return { rows: [{ id: userId, is_active: false, withdrawals_blocked: true }] };
    if (sql.includes("row_to_json")) return { rows: ledger.map(record => ({ record })) };
    if (sql.includes("UPDATE lightning_wallets")) return { rows: options.noUpdate ? [] : [{ id: 1 }] };
    if (sql.includes("INSERT INTO lightning_transactions") && options.ledgerFail) throw new Error("ledger failure");
    if (sql.includes("INSERT INTO audit_logs") && options.auditFail) throw new Error("audit failure");
    return { rows: [] };
  });
  const release = vi.fn();
  const pool = { connect: vi.fn(async () => ({ query, release })) } as unknown as Pool;
  return { pool, query, release,
    setApproval: (value: typeof plan) => { details = value; },
    changeWallet: () => { wallet = { ...wallet, total_withdrawn: "1" }; },
    changeLedger: () => { ledger = ['{"id":1,"amount_sats":1,"status":"completed"}']; },
  };
}

async function reviewed(options: Parameters<typeof fixture>[0] = {}) {
  const f = fixture(options);
  const inspected = await inspectCorrection(f.pool, userId);
  f.setApproval({ ...plan, snapshotHash: inspected.snapshotHash });
  f.query.mockClear();
  return f;
}

describe("one-time authorized Lightning correction", () => {
  it("never embeds or runs an account balance repair on startup", () => {
    const source = readFileSync(new URL("./index.ts", import.meta.url), "utf8");
    expect(source).not.toMatch(/UPDATE\s+lightning_wallets/i);
    expect(source).not.toMatch(/UPDATE\s+users\s+SET\s+withdrawals_blocked\s*=\s*false/i);
    expect(source).not.toContain("da62b876-4f10-4fbb-a979-f23b3032cc80");
    expect(source).toMatch(/async function runStartupMigrations\(\) \{\s*if \(process\.env\.NODE_ENV !== "development"\) return;/);
    expect(source).not.toMatch(/import.*from ["'].*lightning-balance-correction/);
  });
  it("inspection is consistently read-only and never issues DDL or DML", async () => {
    const f = fixture();
    const result = await inspectCorrection(f.pool, userId);
    expect(result.snapshotHash).toMatch(/^[a-f0-9]{64}$/);
    expect(f.query.mock.calls[0][0]).toBe("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
    expect(f.query.mock.calls.some(([sql]) => /\b(UPDATE|INSERT|DELETE|CREATE|ALTER)\b/.test(sql))).toBe(false);
    expect(f.release).toHaveBeenCalledOnce();
  });
  it.each([
    { role: "user" }, { username: "other" }, { missingApproval: true },
  ])("rejects missing or unauthorized prior approval: %j", async options => {
    const f = fixture(options);
    await expect(applyApprovedCorrection(f.pool, approvalId, plan.correctionKey)).rejects.toThrow("founder-admin approval");
    expect(f.query.mock.calls.some(([sql]) => sql.includes("UPDATE lightning_wallets"))).toBe(false);
    expect(f.query).toHaveBeenLastCalledWith("ROLLBACK");
  });
  it("rejects absent explicit confirmation before connecting", async () => {
    const f = fixture();
    await expect(applyApprovedCorrection(f.pool, approvalId, "")).rejects.toThrow("confirmation required");
    expect(f.pool.connect).not.toHaveBeenCalled();
  });
  it("rejects a mismatched correction key", async () => {
    const f = await reviewed();
    await expect(applyApprovedCorrection(f.pool, approvalId, "other-incident")).rejects.toThrow("does not match");
  });
  it.each(["wallet", "ledger"])("refuses stale approval after newer %s activity", async activity => {
    const f = await reviewed();
    if (activity === "wallet") f.changeWallet(); else f.changeLedger();
    await expect(applyApprovedCorrection(f.pool, approvalId, plan.correctionKey)).rejects.toThrow("activity changed");
    expect(f.query.mock.calls.some(([sql]) => sql.includes("UPDATE lightning_wallets"))).toBe(false);
  });
  it("rejects expired approvals", async () => {
    const f = fixture();
    f.setApproval({ ...plan, expiresAt: "2000-01-01T00:00:00.000Z" });
    await expect(applyApprovedCorrection(f.pool, approvalId, plan.correctionKey)).rejects.toThrow("expired");
  });
  it("applies once with table locks, a signed ledger adjustment and atomic audit", async () => {
    const f = await reviewed();
    expect(await applyApprovedCorrection(f.pool, approvalId, plan.correctionKey)).toEqual({ status: "applied", balanceDelta: "161" });
    const sqls = f.query.mock.calls.map(([sql]) => sql);
    expect(sqls[0]).toBe("BEGIN");
    expect(sqls[2]).toContain("IN SHARE ROW EXCLUSIVE MODE");
    expect(sqls[2]).toContain("lightning_transactions");
    expect(f.query.mock.calls.find(([sql]) => sql.includes("INSERT INTO lightning_transactions"))?.[1]?.[1]).toBe("161");
    const audit = f.query.mock.calls.find(([sql]) => sql.includes("INSERT INTO audit_logs"))!;
    expect(JSON.parse(audit[1]![3])).toMatchObject({
      approvalId, before: { sats_balance: "800" }, after: plan.target,
      restrictionsUnchanged: { is_active: false, withdrawals_blocked: true },
    });
    expect(sqls.some(sql => /UPDATE\s+users/i.test(sql))).toBe(false);
    expect(sqls.at(-1)).toBe("COMMIT");
  });
  it("makes retries a no-op even after newer activity", async () => {
    const f = await reviewed({ used: true });
    f.changeWallet();
    expect(await applyApprovedCorrection(f.pool, approvalId, plan.correctionKey)).toEqual({ status: "already_applied" });
    expect(f.query.mock.calls.some(([sql]) => /\b(UPDATE|INSERT)\b/.test(sql))).toBe(false);
  });
  it.each([{ auditFail: true }, { ledgerFail: true }, { noUpdate: true }])("rolls back failed writes: %j", async options => {
    const f = await reviewed(options);
    await expect(applyApprovedCorrection(f.pool, approvalId, plan.correctionKey)).rejects.toThrow();
    expect(f.query).toHaveBeenLastCalledWith("ROLLBACK");
    expect(f.query.mock.calls.some(([sql]) => sql === "COMMIT")).toBe(false);
    expect(f.release).toHaveBeenCalledTimes(2);
  });
  it("rejects numeric amounts, overflow, negative balances and missing evidence", () => {
    for (const invalid of [961, "-1", "1.5", "9223372036854775808"]) {
      expect(correctionApprovalSchema.safeParse({ ...plan, target: { ...plan.target, satsBalance: invalid } }).success).toBe(false);
    }
    expect(correctionApprovalSchema.safeParse({ ...plan, evidence: {} }).success).toBe(false);
    expect(correctionApprovalSchema.safeParse({ ...plan, withdrawalsBlocked: false }).success).toBe(false);
  });
  it("retains bigint precision and supports downward corrections", async () => {
    const f = fixture();
    const { snapshotHash } = await inspectCorrection(f.pool, userId);
    f.setApproval({ ...plan, snapshotHash, target: { ...plan.target, satsBalance: "799", totalDeposited: "9007199254740993" } });
    expect(await applyApprovedCorrection(f.pool, approvalId, plan.correctionKey)).toMatchObject({ balanceDelta: "-1" });
    expect(f.query.mock.calls.find(([sql]) => sql.includes("UPDATE lightning_wallets"))?.[1]?.[1]).toBe("9007199254740993");
  });
});