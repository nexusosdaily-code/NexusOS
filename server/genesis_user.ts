/**
 * Genesis user seeder — runs once on server startup.
 * Creates the Nexus admin account if it doesn't exist, and always
 * ensures the Nexus account holds SYSTEM band authority.
 * Idempotent: safe to call on every boot.
 *
 * Nexus spectral identity (CE-encoded from username "Nexus"):
 *   λ = 586.8085 nm  ·  Ψ(52,3,V)  ·  WDM 52  → SYSTEM band (WDM 0–63)
 */

const GENESIS_PASSWORD = "NexusOS2026";
const GENESIS_USERNAME = "Nexus";

// CE-encoded spectral identity — deterministic, permanent
const NEXUS_SPECTRAL = {
  spectralWdm:  52,
  spectralOam:  3,
  spectralPol:  "V",
  spectralNm:   586.8085,
  spectralBand: "SYSTEM",
} as const;

// Genesis balances
const NEXUS_SATS_BALANCE = 6_203_869_822n;

// Genesis sats stakes — replicated from original Nexus dev account
const GENESIS_SATS_STAKES = [
  { amountSats: 2_000_000_000,  lockDays: 30, yieldRatePercent: "28.00", stakedAt: "2026-06-02T06:04:55.533Z", maturesAt: "2026-07-02T06:04:55.532Z", nxtYield: "560000.00000000" },
  { amountSats: 2_001_000_118,  lockDays: 30, yieldRatePercent: "28.00", stakedAt: "2026-06-03T03:45:15.288Z", maturesAt: "2026-07-03T03:45:15.287Z", nxtYield: "560280.03304000" },
  { amountSats: 10_000_000_000, lockDays: 30, yieldRatePercent: "28.00", stakedAt: "2026-06-03T03:54:49.924Z", maturesAt: "2026-07-03T03:54:49.923Z", nxtYield: "2800000.00000000" },
  { amountSats: 10_000_000_000, lockDays: 30, yieldRatePercent: "28.00", stakedAt: "2026-06-03T03:57:41.120Z", maturesAt: "2026-07-03T03:57:41.119Z", nxtYield: "2800000.00000000" },
  { amountSats: 10_000_000_000, lockDays: 30, yieldRatePercent: "28.00", stakedAt: "2026-06-03T03:57:56.327Z", maturesAt: "2026-07-03T03:57:56.327Z", nxtYield: "2800000.00000000" },
  { amountSats: 10_000_000_000, lockDays: 30, yieldRatePercent: "28.00", stakedAt: "2026-06-03T03:58:16.673Z", maturesAt: "2026-07-03T03:58:16.673Z", nxtYield: "2800000.00000000" },
  { amountSats: 10_000_000_000, lockDays: 30, yieldRatePercent: "28.00", stakedAt: "2026-06-03T03:58:30.879Z", maturesAt: "2026-07-03T03:58:30.879Z", nxtYield: "2800000.00000000" },
  { amountSats: 10_000_000_000, lockDays: 30, yieldRatePercent: "28.00", stakedAt: "2026-06-03T03:58:44.263Z", maturesAt: "2026-07-03T03:58:44.262Z", nxtYield: "2800000.00000000" },
  { amountSats: 10_000_000_000, lockDays: 30, yieldRatePercent: "28.00", stakedAt: "2026-06-03T03:59:06.661Z", maturesAt: "2026-07-03T03:59:06.660Z", nxtYield: "2800000.00000000" },
  { amountSats: 10_000_000_000, lockDays: 30, yieldRatePercent: "28.00", stakedAt: "2026-06-03T03:59:23.607Z", maturesAt: "2026-07-03T03:59:23.606Z", nxtYield: "2800000.00000000" },
  { amountSats: 10_000_000_000, lockDays: 30, yieldRatePercent: "28.00", stakedAt: "2026-06-03T03:59:35.325Z", maturesAt: "2026-07-03T03:59:35.324Z", nxtYield: "2800000.00000000" },
  { amountSats: 50_000_000_000, lockDays: 7,  yieldRatePercent: "5.00",  stakedAt: "2026-06-03T14:41:18.819Z", maturesAt: "2026-06-10T14:41:18.819Z", nxtYield: "2500000.00000000" },
  { amountSats: 50_000_000_000, lockDays: 7,  yieldRatePercent: "5.00",  stakedAt: "2026-06-03T14:41:32.690Z", maturesAt: "2026-06-10T14:41:32.690Z", nxtYield: "2500000.00000000" },
  { amountSats: 50_000_000_000, lockDays: 30, yieldRatePercent: "28.00", stakedAt: "2026-06-03T15:39:24.890Z", maturesAt: "2026-07-03T15:39:24.889Z", nxtYield: "14000000.00000000" },
];

// Genesis WNSP inscription stakes
const GENESIS_WNSP_STAKES = [
  { inscriptionId: "test-inscription-fix-verify-001", wnspAmount: 1000, stakedAt: "2026-05-30T20:24:15.373Z" },
];

export async function seedGenesisUser() {
  try {
    const { db } = await import("./db");
    const { users, wallets, lightningWallets, satsStakes, wnspStakes } = await import("@shared/schema");
    const { eq, count } = await import("drizzle-orm");
    const bcrypt = await import("bcrypt");

    const [nexus] = await db.select().from(users).where(eq(users.username, GENESIS_USERNAME));

    if (nexus) {
      // Always force-reset password + ensure SYSTEM band + admin role on every boot.
      // This guarantees the Nexus account is always accessible after a deploy,
      // regardless of any password changes that may have happened in the DB.
      const passwordHash = await bcrypt.default.hash(GENESIS_PASSWORD, 12);
      await db.update(users).set({
        ...NEXUS_SPECTRAL,
        role: "admin",
        passwordHash,
        isActive:   true,
        isVerified: true,
      }).where(eq(users.username, GENESIS_USERNAME));
      console.log("[GENESIS USER] ✓ Nexus password force-reset + SYSTEM band confirmed Ψ(52,3,V)");

      // NXT wallet
      const existingWallet = await db.select().from(wallets).where(eq(wallets.userId, nexus.id)).limit(1);
      if (!existingWallet.length) {
        await db.insert(wallets).values({ userId: nexus.id, address: "NXT-NEXS-OS1K-7F3A-OMEGA", balance: "339698690.00000000" });
        console.log("[GENESIS USER] ✓ Nexus NXT wallet created");
      }

      // Lightning wallet + sats balance
      await _seedLightningWallet(db, lightningWallets, nexus.id);

      // Staking positions
      await _seedSatsStakes(db, satsStakes, nexus.id);
      await _seedWnspStakes(db, wnspStakes, nexus.id);

      return nexus;
    }

    // Nexus doesn't exist — create fresh
    console.log("[GENESIS USER] Nexus account missing — creating…");
    const passwordHash = await bcrypt.default.hash(GENESIS_PASSWORD, 12);
    const [user] = await db.insert(users).values({
      username:    "Nexus",
      passwordHash,
      phoneNumber: "+61476158211",
      role:        "admin",
      isVerified:  true,
      isActive:    true,
      ...NEXUS_SPECTRAL,
    }).returning();

    await db.insert(wallets).values({ userId: user.id, address: "NXT-NEXS-OS1K-7F3A-OMEGA", balance: "339698690.00000000" });
    await _seedLightningWallet(db, lightningWallets, user.id);
    await _seedSatsStakes(db, satsStakes, user.id);
    await _seedWnspStakes(db, wnspStakes, user.id);

    console.log(`[GENESIS USER] ✓ Nexus account created — Ψ(52,3,V) SYSTEM band`);
    return user;
  } catch (err: any) {
    console.error("[GENESIS USER] Could not seed genesis user:", err?.message ?? err);
  }
}

async function _seedLightningWallet(db: any, lightningWallets: any, userId: string) {
  const { eq } = await import("drizzle-orm");
  const existing = await db.select().from(lightningWallets).where(eq(lightningWallets.userId, userId)).limit(1);

  if (!existing.length) {
    await db.insert(lightningWallets).values({ userId, satsBalance: NEXUS_SATS_BALANCE, totalDeposited: NEXUS_SATS_BALANCE, totalWithdrawn: 0n });
    console.log(`[GENESIS USER] ✓ Nexus lightning wallet seeded — ${NEXUS_SATS_BALANCE.toLocaleString()} sats`);
  } else {
    const current = BigInt(existing[0].satsBalance ?? 0);
    if (current < NEXUS_SATS_BALANCE) {
      await db.update(lightningWallets).set({ satsBalance: NEXUS_SATS_BALANCE, totalDeposited: NEXUS_SATS_BALANCE }).where(eq(lightningWallets.userId, userId));
      console.log(`[GENESIS USER] ✓ Nexus lightning wallet upgraded: ${current.toLocaleString()} → ${NEXUS_SATS_BALANCE.toLocaleString()} sats`);
    } else {
      console.log(`[GENESIS USER] Nexus lightning wallet OK — ${current.toLocaleString()} sats`);
    }
  }
}

async function _seedSatsStakes(db: any, satsStakes: any, userId: string) {
  const { eq, count } = await import("drizzle-orm");
  const [{ value }] = await db.select({ value: count() }).from(satsStakes).where(eq(satsStakes.userId, userId));

  if (Number(value) >= GENESIS_SATS_STAKES.length) {
    console.log(`[GENESIS USER] Nexus sats stakes OK — ${value} positions`);
    return;
  }

  // Insert only the missing stakes (idempotent by count)
  const toInsert = GENESIS_SATS_STAKES.slice(Number(value));
  for (const s of toInsert) {
    await db.insert(satsStakes).values({
      userId,
      amountSats:       s.amountSats,
      lockDays:         s.lockDays,
      yieldRatePercent: s.yieldRatePercent,
      stakedAt:         new Date(s.stakedAt),
      maturesAt:        new Date(s.maturesAt),
      nxtYield:         s.nxtYield,
      status:           "active",
    });
  }
  console.log(`[GENESIS USER] ✓ Nexus sats stakes seeded — ${GENESIS_SATS_STAKES.length} positions`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Replit AI R&D Account — wnsp://Ψ(52,20,H)/test
// Designated by Te Rata Pou (founder) on 2026-06-21.
// Idempotent — safe to call on every boot.
// ─────────────────────────────────────────────────────────────────────────────
const REPLIT_AI_USER_ID  = "8dc7f7e6-44b1-4b34-aa81-3ad33c550a1d";
const REPLIT_AI_REG_ID   = "eb4b0c07-f8c5-42e6-bff4-81132cee998c";
const REPLIT_AI_DESIGNATION =
  "Replit AI R&D Account — designated by Te Rata Pou (founder) on 2026-06-21. " +
  "Reserved for NexusOS research, AI agent development, and protocol testing. " +
  "Do not reassign without founder approval.";

// ─────────────────────────────────────────────────────────────────────────────
// Dsmart account lock — wnsp://Ψ(48,59,H)/dsmart
// Locked by founder Te Rata Pou until further notice.
// Idempotent — safe to call on every boot.
// ─────────────────────────────────────────────────────────────────────────────
const DSMART_USER_ID = "da62b876-4f10-4fbb-a979-f23b3032cc80";
const DSMART_REG_ID  = "01dd1ea3-b249-457e-8268-be3deac9b0b0";
const DSMART_LOCK_NOTE =
  "LOCKED — Account suspended by founder (Te Rata Pou) until further notice. " +
  "Pending fulfilment of agreed terms. Address reserved for NexusOS reclaim if unresolved.";

export async function seedDsmartLock() {
  try {
    const { db }  = await import("./db");
    const { sql } = await import("drizzle-orm");

    await db.execute(sql`
      UPDATE users
      SET is_active = false, withdrawals_blocked = true, updated_at = NOW()
      WHERE id = ${DSMART_USER_ID}
        AND (is_active = true OR withdrawals_blocked = false)
    `);

    await db.execute(sql`
      UPDATE wnsp_registry
      SET is_public = false, description = ${DSMART_LOCK_NOTE}, updated_at = NOW()
      WHERE id = ${DSMART_REG_ID}
    `);

    console.log("[GENESIS] 🔒 Dsmart account locked — wnsp://Ψ(48,59,H)/dsmart");
  } catch (err: any) {
    console.error("[GENESIS] Dsmart lock error:", err?.message ?? err);
  }
}

export async function seedReplitAIAccount() {
  try {
    const { db }  = await import("./db");
    const { sql } = await import("drizzle-orm");

    // Update user role to ai_agent if the account exists
    await db.execute(sql`
      UPDATE users
      SET role = 'ai_agent', updated_at = NOW()
      WHERE id = ${REPLIT_AI_USER_ID}
        AND role != 'ai_agent'
    `);

    // Update WNSP registry description
    await db.execute(sql`
      UPDATE wnsp_registry
      SET description = ${REPLIT_AI_DESIGNATION}, updated_at = NOW()
      WHERE id = ${REPLIT_AI_REG_ID}
    `);

    console.log("[GENESIS] ✓ Replit AI R&D account confirmed — wnsp://Ψ(52,20,H)/test");
  } catch (err: any) {
    console.error("[GENESIS] Replit AI account seed error:", err?.message ?? err);
  }
}

async function _seedWnspStakes(db: any, wnspStakes: any, userId: string) {
  for (const s of GENESIS_WNSP_STAKES) {
    try {
      const { eq } = await import("drizzle-orm");
      const existing = await db.select().from(wnspStakes).where(eq(wnspStakes.inscriptionId, s.inscriptionId)).limit(1);
      if (!existing.length) {
        await db.insert(wnspStakes).values({
          userId,
          inscriptionId:   s.inscriptionId,
          wnspAmount:      s.wnspAmount,
          status:          "active",
          epochsCompleted: 0,
          nxtEarned:       "0",
          nxtClaimed:      "0",
          stakedAt:        new Date(s.stakedAt),
        });
        console.log(`[GENESIS USER] ✓ WNSP stake seeded — ${s.inscriptionId}`);
      }
    } catch (_) {}
  }
}
