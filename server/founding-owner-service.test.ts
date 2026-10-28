import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import type { Pool } from "pg";
import { executeOwnerGift, getOwnerRegister, isFounder, OWNER_GIFT_AMOUNT, ownerGiftSchema } from "./founding-owner-service";
import { INITIAL_OWNER_REGISTER } from "../shared/founding-owners";
import { buildOwnerCampaignSlots } from "./owner-campaign";

const actor = { id: "founder-id", role: "admin", username: "Nexus" };
const input = { recipientEmail: "recipient@example.test", publicName: "Owner 01", confirm: true };

function fixture(options: {
  recipientCount?: number; active?: boolean; missingWallet?: boolean;
  insufficient?: boolean; failAudit?: boolean; previousUser?: string;
} = {}) {
  const query = vi.fn(async (sql: string, params?: unknown[]) => {
    if (sql.includes("SELECT id, is_active FROM users")) {
      return { rows: Array.from({ length: options.recipientCount ?? 1 }, () => ({ id: "recipient", is_active: options.active ?? true })) };
    }
    if (sql.includes("SELECT t.id, w.user_id")) {
      return { rows: options.previousUser ? [{ id: "prior-transfer", user_id: options.previousUser }] : [] };
    }
    if (sql.includes("SELECT id FROM users")) return { rows: [{ id: "donor" }] };
    if (sql.includes("SELECT id, user_id FROM wallets")) {
      return { rows: [{ id: "source", user_id: "donor" }, ...(options.missingWallet ? [] : [{ id: "dest", user_id: "recipient" }])] };
    }
    if (sql.includes("balance=balance-$1")) return { rows: options.insufficient ? [] : [{ id: "source" }] };
    if (sql.includes("balance=balance+$1")) return { rows: [{ id: "dest" }] };
    if (sql.includes("INSERT INTO transactions")) return { rows: [{ id: "new-transfer" }] };
    if (sql.includes("INSERT INTO audit_logs") && options.failAudit) throw new Error("audit unavailable");
    return { rows: [] };
  });
  const release = vi.fn();
  const connect = vi.fn(async () => ({ query, release }));
  return { pool: { connect } as unknown as Pool, query, release, connect };
}

describe("founder-authorized owner gift", () => {
  it("never clears administrative withdrawal restrictions during startup", () => {
    const source = readFileSync(new URL("./index.ts", import.meta.url), "utf8");
    expect(source).not.toMatch(/UPDATE\s+users\s+SET\s+withdrawals_blocked\s*=\s*false/i);
  });
  it("requires both the admin role and founder identity before opening a connection", async () => {
    expect(isFounder(actor)).toBe(true);
    expect(isFounder({ role: "user", username: "Nexus" })).toBe(false);
    expect(isFounder({ role: "admin", username: "other" })).toBe(false);
    const f = fixture();
    await expect(executeOwnerGift(f.pool, { ...actor, role: "user" }, input)).rejects.toMatchObject({ status: 403 });
    expect(f.connect).not.toHaveBeenCalled();
  });

  it("requires confirmation, rejects caller-controlled amounts, and disallows public email/HTML", () => {
    expect(ownerGiftSchema.safeParse({ ...input, confirm: false }).success).toBe(false);
    expect(ownerGiftSchema.safeParse({ ...input, amount: "1" }).success).toBe(false);
    expect(ownerGiftSchema.safeParse({ ...input, publicName: input.recipientEmail }).success).toBe(false);
    expect(ownerGiftSchema.safeParse({ ...input, publicName: "<b>Owner</b>" }).success).toBe(false);
  });

  it("debits and credits exactly 500m without minting or burning, with ledger, audit and restrictions in one transaction", async () => {
    const f = fixture();
    expect(await executeOwnerGift(f.pool, actor, input)).toEqual({ ok: true, alreadyCompleted: false, transferId: "new-transfer" });
    const calls = f.query.mock.calls;
    const debit = calls.find(([sql]) => sql.includes("balance=balance-$1"))!;
    const credit = calls.find(([sql]) => sql.includes("balance=balance+$1"))!;
    expect(debit[1]).toEqual([OWNER_GIFT_AMOUNT, "source"]);
    expect(credit[1]).toEqual([OWNER_GIFT_AMOUNT, "dest"]);
    expect(debit[0]).toContain("balance-locked_balance >= $1::numeric");
    // Demonstrate the intended residual using integer 1e-8 NXT units.
    expect(50_000_097_772_700_000n - 50_000_000_000_000_000n).toBe(97_772_700_000n);
    expect(calls.some(([sql]) => sql.includes("is_active=false, withdrawals_blocked=true"))).toBe(true);
    expect(calls.some(([sql]) => sql.includes("pg_advisory_xact_lock"))).toBe(true);
    const ledger = calls.find(([sql]) => sql.includes("INSERT INTO transactions"))!;
    expect(ledger[1]?.slice(0, 3)).toEqual(["source", "dest", OWNER_GIFT_AMOUNT]);
    expect(ledger[1]?.[3]).not.toContain(input.recipientEmail);
    expect(calls.at(-1)?.[0]).toBe("COMMIT");
    expect(f.release).toHaveBeenCalledOnce();
  });

  it.each([
    { recipientCount: 0 }, { recipientCount: 2 }, { active: false },
    { missingWallet: true }, { insufficient: true }, { failAudit: true },
  ])("rolls back all changes and releases the connection on failure: %j", async (options) => {
    const f = fixture(options);
    await expect(executeOwnerGift(f.pool, actor, input)).rejects.toBeInstanceOf(Error);
    expect(f.query.mock.calls.at(-1)?.[0]).toBe("ROLLBACK");
    expect(f.query.mock.calls.some(([sql]) => sql === "COMMIT")).toBe(false);
    expect(f.release).toHaveBeenCalledOnce();
  });

  it("returns the original ledger reference on retry without another debit", async () => {
    const f = fixture({ previousUser: "recipient" });
    expect(await executeOwnerGift(f.pool, actor, input)).toEqual({ ok: true, alreadyCompleted: true, transferId: "prior-transfer" });
    expect(f.query.mock.calls.some(([sql]) => sql.includes("UPDATE wallets"))).toBe(false);
  });

  it("rejects reassignment of the same seat to another recipient", async () => {
    const f = fixture({ previousUser: "someone-else" });
    await expect(executeOwnerGift(f.pool, actor, input)).rejects.toMatchObject({ status: 409 });
    expect(f.query.mock.calls.some(([sql]) => sql.includes("UPDATE wallets"))).toBe(false);
  });
});

describe("public owner register and announcements", () => {
  it("keeps the historical register and prevents owner posts before the transfer", async () => {
    const pool = { query: vi.fn(async () => ({ rows: [] })) } as unknown as Pool;
    const register = await getOwnerRegister(pool);
    expect(register.owners).toEqual(INITIAL_OWNER_REGISTER);
    expect(register.replacementComplete).toBe(false);
    expect(() => buildOwnerCampaignSlots(register)).toThrow("await");
  });

  it("replaces only seat 1, exposes a safe name, and includes all 21 owners exactly once", async () => {
    const pool = { query: vi.fn(async () => ({ rows: [{
      id: "gift", public_name: "Owner 01", address: "NXT-RECIPIENT", spectral_band: "USER",
      joined: "2026-09-29T01:00:00Z", created_at: "2026-09-29T02:00:00Z",
    }] })) } as unknown as Pool;
    const register = await getOwnerRegister(pool);
    expect(register.owners).toHaveLength(21);
    expect(register.owners[0]).toMatchObject({ username: "Owner 01", nxt: 500_000_000, wallet: "NXT-RECIPIENT" });
    expect(register.owners.slice(1)).toEqual(INITIAL_OWNER_REGISTER.slice(1));
    expect(register.transferId).toBe("gift");
    const slots = buildOwnerCampaignSlots(register);
    const seats = slots.flatMap((slot) => [...slot.nostr.matchAll(/^Seat (\d+):/gm)].map((match) => Number(match[1])));
    expect(seats).toEqual(Array.from({ length: 21 }, (_, i) => i + 1));
    expect(slots.map((slot) => slot.id)).toEqual([28, 29, 30]);
    for (const slot of slots) {
      expect(slot.telegram.length).toBeLessThan(4096);
      expect(slot.nostr).not.toContain("@");
      expect(slot.nostr).not.toContain("Dsmart");
      expect(slot.telegram).toContain("do not establish company equity");
    }
  });
});