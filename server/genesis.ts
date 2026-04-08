/**
 * Genesis block seeder — runs once on server startup.
 * Inserts Block #0 if the blockchain table is empty.
 * Idempotent: safe to call on every boot.
 *
 * Genesis Block #0 canonical values (Λ = hf/c² physics):
 *   λ = 478.82 nm  (blue, AUTH / Kernel authority band)
 *   f = c/λ ≈ 6.2606 × 10¹⁴ Hz
 *   E = hf ≈ 4.1483 × 10⁻¹⁹ J
 *   m = E/c² ≈ 4.6152 × 10⁻³⁶ kg
 *   Ψ channel: Ψ(47, 47, H)
 *   NXT coinbase: 50,000,000 NXT (5 × 10⁷)
 */

const GENESIS = {
  blockNumber:  0,
  content:
    "NexusOS Genesis Block #0 — Λ = hf/c² — " +
    "The first photonic block in the wavelength blockchain — " +
    "Open source civilization infrastructure, AGPL-3.0 — " +
    "No binary, no IP addresses, no arbitrary fees — just physics",
  wavelengthNm: "478.8200",
  psiChannel:   "Ψ(47, 47, H)",
  wdm:          47,
  oam:          47,
  polarisation: "H",
  band:         "AUTH",
  energyJoules: "0.00000000000000000041483",
  lambdaMassKg: "0.0000000000000000000000000000000000046152",
  frequencyHz:  "626065796600000.0000",
  previousPsi:  null,
  nxtReward:    "50000000.00000000",
  minerAddress: "nexus_genesis",
  txCount:      0,
  transactions: [] as any,
};

export async function seedGenesisBlock() {
  try {
    const { db } = await import("./db");
    const { blockchainBlocks } = await import("@shared/schema");
    const { count } = await import("drizzle-orm");

    const [{ value }] = await db.select({ value: count() }).from(blockchainBlocks);
    if (Number(value) > 0) {
      console.log("[GENESIS] Chain already has blocks — skipping genesis seed");
      return;
    }

    console.log("[GENESIS] Chain is empty — inserting Genesis Block #0…");
    const [block] = await db.insert(blockchainBlocks).values(GENESIS).returning();

    console.log(
      `[GENESIS] ✓ Block #0 mined — λ=${GENESIS.wavelengthNm}nm ` +
      `${GENESIS.psiChannel} — 50M NXT coinbase — AUTH band`
    );
    return block;
  } catch (err: any) {
    // Non-fatal: log and continue. Chain can be seeded manually later.
    console.error("[GENESIS] Could not seed genesis block:", err?.message ?? err);
  }
}
