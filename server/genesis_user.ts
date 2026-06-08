/**
 * Genesis user seeder — runs once on server startup.
 * Creates the Nexus admin account if it doesn't exist, and always
 * ensures the Nexus account holds SYSTEM band authority.
 * Idempotent: safe to call on every boot.
 *
 * Nexus spectral identity (CE-encoded from username "Nexus"):
 *   λ = 586.8085 nm  ·  Ψ(52,3,V)  ·  WDM 52  → SYSTEM band (WDM 0–63)
 */

const GENESIS_PASSWORD = "Wnsp_nexusos2026";
const GENESIS_USERNAME = "Nexus";

// CE-encoded spectral identity for "Nexus" — deterministic, permanent
const NEXUS_SPECTRAL = {
  spectralWdm:  52,
  spectralOam:  3,
  spectralPol:  "V",
  spectralNm:   586.8085,
  spectralBand: "SYSTEM",   // WDM 52 < 64 → SYSTEM (sovereign/constitutional authority)
} as const;

export async function seedGenesisUser() {
  try {
    const { db } = await import("./db");
    const { users, wallets } = await import("@shared/schema");
    const { eq } = await import("drizzle-orm");
    const bcrypt = await import("bcrypt");

    const [nexus] = await db.select().from(users).where(eq(users.username, GENESIS_USERNAME));

    if (nexus) {
      // Always ensure Nexus holds SYSTEM band — upgrade if needed
      const needsBandUpgrade = nexus.spectralBand !== "SYSTEM" || nexus.spectralWdm !== NEXUS_SPECTRAL.spectralWdm;
      const needsPasswordRefresh = !(await bcrypt.default.compare(GENESIS_PASSWORD, nexus.passwordHash ?? ""));

      if (needsBandUpgrade || needsPasswordRefresh) {
        const updates: Record<string, any> = { ...NEXUS_SPECTRAL, role: "admin" };
        if (needsPasswordRefresh) {
          updates.passwordHash = await bcrypt.default.hash(GENESIS_PASSWORD, 12);
        }
        await db.update(users).set(updates).where(eq(users.username, GENESIS_USERNAME));
        if (needsBandUpgrade)  console.log("[GENESIS USER] ✓ Nexus upgraded → SYSTEM band Ψ(52,3,V)");
        if (needsPasswordRefresh) console.log("[GENESIS USER] ✓ Nexus password hash refreshed");
      } else {
        console.log("[GENESIS USER] Nexus account OK — SYSTEM band confirmed");
      }

      // Ensure wallet exists
      const existing = await db.select().from(wallets).where(eq(wallets.userId, nexus.id)).limit(1);
      if (!existing.length) {
        await db.insert(wallets).values({
          userId:  nexus.id,
          address: "NXT-NEXS-OS1K-7F3A-OMEGA",
          balance: "339698690.00000000",
        });
        console.log("[GENESIS USER] ✓ Nexus wallet created");
      }
      return nexus;
    }

    // Nexus doesn't exist yet — create with full SYSTEM authority
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

    // Create wallet
    const existing = await db.select().from(wallets).where(eq(wallets.userId, user.id)).limit(1);
    if (!existing.length) {
      await db.insert(wallets).values({
        userId:  user.id,
        address: "NXT-NEXS-OS1K-7F3A-OMEGA",
        balance: "339698690.00000000",
      });
    }

    console.log(`[GENESIS USER] ✓ Nexus account created — Ψ(52,3,V) SYSTEM band`);
    return user;
  } catch (err: any) {
    console.error("[GENESIS USER] Could not seed genesis user:", err?.message ?? err);
  }
}
