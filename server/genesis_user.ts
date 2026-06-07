/**
 * Genesis user seeder — runs once on server startup.
 * Creates the Nexus admin account if no users exist.
 * Idempotent: safe to call on every boot.
 */

const GENESIS_PASSWORD = "Wnsp_nexusos2026";
const GENESIS_USERNAME = "Nexus";

export async function seedGenesisUser() {
  try {
    const { db } = await import("./db");
    const { users, wallets } = await import("@shared/schema");
    const { count, eq } = await import("drizzle-orm");
    const bcrypt = await import("bcrypt");

    const [{ value }] = await db.select({ value: count() }).from(users);

    if (Number(value) > 0) {
      // Users exist — but ensure Nexus password hash is current
      const [nexus] = await db.select().from(users).where(eq(users.username, GENESIS_USERNAME));
      if (nexus) {
        const ok = await bcrypt.default.compare(GENESIS_PASSWORD, nexus.passwordHash ?? "");
        if (!ok) {
          const newHash = await bcrypt.default.hash(GENESIS_PASSWORD, 12);
          await db.update(users).set({ passwordHash: newHash }).where(eq(users.username, GENESIS_USERNAME));
          console.log("[GENESIS USER] ✓ Nexus password hash refreshed");
        } else {
          console.log("[GENESIS USER] Users already exist — skipping seed");
        }
      }
      return;
    }

    console.log("[GENESIS USER] No users found — seeding Nexus genesis account…");

    const passwordHash = await bcrypt.default.hash("Wnsp_nexusos2026", 12);

    const [user] = await db.insert(users).values({
      username:    "Nexus",
      passwordHash,
      phoneNumber: "+61476158211",
      role:        "user",
      isVerified:  true,
      isActive:    true,
      spectralWdm: 126,
      spectralOam: 0,
      spectralPol: "H",
      spectralNm:  577.6471,
      spectralBand:"KERNEL",
    }).returning();

    // Check if wallet already exists (shouldn't, but be safe)
    const { eq } = await import("drizzle-orm");
    const existing = await db.select().from(wallets).where(eq(wallets.userId, user.id)).limit(1);
    if (!existing.length) {
      await db.insert(wallets).values({
        userId:  user.id,
        address: "NXT-NEXS-OS1K-7F3A-OMEGA",
        balance: "339698690.00000000",
      });
    }

    console.log(`[GENESIS USER] ✓ Nexus account created — Ψ(126,0,H) KERNEL band`);
    return user;
  } catch (err: any) {
    console.error("[GENESIS USER] Could not seed genesis user:", err?.message ?? err);
  }
}
