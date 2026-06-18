/**
 * Genesis block seeder — runs once on server startup.
 * Inserts the canonical NexusOS chain (blocks #0–#13) if they are missing.
 * Idempotent: uses ON CONFLICT DO NOTHING — safe to call on every boot.
 *
 * Canonical Genesis Block #0 (Λ = hf/c² physics):
 *   λ = 478.82 nm  (blue, AUTH / Kernel authority band)
 *   f = c/λ ≈ 6.288 × 10¹⁴ Hz   555 THz first oscillation
 *   Ψ channel: Ψ(47, 47, H)
 *   NXT coinbase: 50,000,000 NXT
 *   Mined: 2026-01-08 (first photonic ledger entry)
 */

// ── Canonical chain — all 14 historical blocks (dev DB source of truth) ──────
const CANONICAL_BLOCKS = [
  {
    blockNumber:  0,
    content:      "NexusOS wavelength blockchain genesis Lambda equals hf over c squared first photonic ledger 555 THz first oscillation AGPL-3.0",
    wavelengthNm: "478.8200",
    psiChannel:   "Ψ(47, 47, H)",
    wdm:          47,
    oam:          47,
    polarisation: "H",
    band:         "AUTH",
    energyJoules: "0.00000000000000002410",
    lambdaMassKg: "0.00000000000000000000",
    frequencyHz:  "628800000000000.0000",
    previousPsi:  null,
    nxtReward:    "50000000.00000000",
    minerAddress: "nexusos_genesis",
    txCount:      0,
    transactions: [] as any,
    minedAt:      new Date("2026-01-08T00:00:00.000Z"),
  },
  {
    blockNumber:  1,
    content:      "What the Genesis Block Represents\nBeginning of the blockchain\nIt's the first entry in the chain\nEvery other block links back to it\nNo previous hash\nNormal blocks contain a \"previous block hash\"\nGenesis block uses 0 or a fixed constant because nothing came before\nProtocol birth moment\nDefines initial parameters\nNetwork rules\nInitial supply (sometimes)\nSymbolic message (often)\nMany genesis blocks include a message to mark the moment",
    wavelengthNm: "539.2200",
    psiChannel:   "Ψ(196, 38, H)",
    wdm:          196,
    oam:          38,
    polarisation: "H",
    band:         "CORE",
    energyJoules: "0.00000000000000008286",
    lambdaMassKg: "0.00000000000000000000",
    frequencyHz:  "556969759806672.0000",
    previousPsi:  "Ψ(47, 47, H)",
    nxtReward:    "1.00000000",
    minerAddress: "Nexus",
    txCount:      0,
    transactions: [] as any,
    minedAt:      new Date("2026-04-08T05:17:28.116Z"),
  },
  {
    blockNumber:  2,
    content:      "SPECTRAL_AUDIT_BLOCK #2: 50 records proven via Lambda=hf/c2 miner=blockchain_auditor",
    wavelengthNm: "454.0000",
    psiChannel:   "Ψ(2,0,H)",
    wdm:          2,
    oam:          0,
    polarisation: "H",
    band:         "AUTH",
    energyJoules: "0.00000000000000000036",
    lambdaMassKg: "0.00000000000000000000",
    frequencyHz:  "545000000000000.0000",
    previousPsi:  null,
    nxtReward:    "1.00000000",
    minerAddress: "NXT-NEXS-OS1K-7F3A-OMEGA",
    txCount:      50,
    transactions: [] as any,
    minedAt:      new Date("2026-04-09T03:54:20.586Z"),
  },
  {
    blockNumber:  3,
    content:      "SPECTRAL_AUDIT_BLOCK[auto]: 428 records proven at λ via Λ=hf/c² | agent: blockchain_auditor | cycle: 3",
    wavelengthNm: "485.1000",
    psiChannel:   "Ψ(245, 23, V)",
    wdm:          245,
    oam:          23,
    polarisation: "V",
    band:         "CORE",
    energyJoules: "0.00000000000000001970",
    lambdaMassKg: "0.00000000000000000000",
    frequencyHz:  "619662584877853.0000",
    previousPsi:  "Ψ(2,0,H)",
    nxtReward:    "1.00000000",
    minerAddress: "NXT-NEXS-OS1K-7F3A-OMEGA",
    txCount:      428,
    transactions: [] as any,
    minedAt:      new Date("2026-04-09T03:56:57.708Z"),
  },
  {
    blockNumber:  4,
    content:      "BREAKTHROUGH_PROOF[human]: FIRST_VIDEO_IN_SPECTRUM | \"angry birds\" 25MB via CE→SE encode at λ=534.51nm Ψ(211,35,H) USER band — first multimedia spectral transmission on NexusOS chain",
    wavelengthNm: "534.5100",
    psiChannel:   "Ψ(211, 35, H)",
    wdm:          211,
    oam:          35,
    polarisation: "H",
    band:         "USER",
    energyJoules: "0.00000000000000000041",
    lambdaMassKg: "0.00000000000000000000",
    frequencyHz:  "561459289975000.0000",
    previousPsi:  "Ψ(245, 23, V)",
    nxtReward:    "1.00000000",
    minerAddress: "Nexus",
    txCount:      0,
    transactions: [] as any,
    minedAt:      new Date("2026-04-09T05:19:38.932Z"),
  },
  {
    blockNumber:  5,
    content:      "SPECTRAL_AUDIT_BLOCK[auto]: 1 records proven at λ via Λ=hf/c² | agent: blockchain_auditor | cycle: 5",
    wavelengthNm: "515.0000",
    psiChannel:   "Ψ(245, 23, V)",
    wdm:          245,
    oam:          23,
    polarisation: "V",
    band:         "CORE",
    energyJoules: "0.00000000000000001970",
    lambdaMassKg: "0.00000000000000000000",
    frequencyHz:  "582524271844660.0000",
    previousPsi:  "Ψ(211, 35, H)",
    nxtReward:    "1.00000000",
    minerAddress: "NXT-NEXS-OS1K-7F3A-OMEGA",
    txCount:      1,
    transactions: [] as any,
    minedAt:      new Date("2026-04-12T04:58:44.029Z"),
  },
  {
    blockNumber:  6,
    content:      "SPECTRAL_AUDIT_BLOCK[auto]: 4 records proven at λ via Λ=hf/c² | agent: blockchain_auditor | cycle: 6",
    wavelengthNm: "533.0000",
    psiChannel:   "Ψ(245, 23, V)",
    wdm:          245,
    oam:          23,
    polarisation: "V",
    band:         "CORE",
    energyJoules: "0.00000000000000001970",
    lambdaMassKg: "0.00000000000000000000",
    frequencyHz:  "563036585365854.0000",
    previousPsi:  "Ψ(245, 23, V)",
    nxtReward:    "1.00000000",
    minerAddress: "NXT-NEXS-OS1K-7F3A-OMEGA",
    txCount:      4,
    transactions: [] as any,
    minedAt:      new Date("2026-04-12T06:25:03.197Z"),
  },
  {
    blockNumber:  7,
    content:      "SPECTRAL_AUDIT_BLOCK[auto]: 1 records proven at λ via Λ=hf/c² | agent: blockchain_auditor | cycle: 7",
    wavelengthNm: "524.0000",
    psiChannel:   "Ψ(245, 23, V)",
    wdm:          245,
    oam:          23,
    polarisation: "V",
    band:         "CORE",
    energyJoules: "0.00000000000000001970",
    lambdaMassKg: "0.00000000000000000000",
    frequencyHz:  "572900763358779.0000",
    previousPsi:  "Ψ(245, 23, V)",
    nxtReward:    "1.00000000",
    minerAddress: "NXT-NEXS-OS1K-7F3A-OMEGA",
    txCount:      1,
    transactions: [] as any,
    minedAt:      new Date("2026-04-13T04:39:19.577Z"),
  },
  {
    blockNumber:  8,
    content:      "ENCODED WNSP Wave Channel Address  λ=554.0nm Ψ(206, 30, V) Write — CE→SE encode committed to spectral ledger",
    wavelengthNm: "500.0000",
    psiChannel:   "Ψ(196, 38, H)",
    wdm:          196,
    oam:          38,
    polarisation: "H",
    band:         "CORE",
    energyJoules: "0.00000000000000008286",
    lambdaMassKg: "0.00000000000000000000",
    frequencyHz:  "599584916000000.0000",
    previousPsi:  "Ψ(245, 23, V)",
    nxtReward:    "1.00000000",
    minerAddress: "NXT-NEXS-OS1K-7F3A-OMEGA",
    txCount:      0,
    transactions: [] as any,
    minedAt:      new Date("2026-04-15T16:27:00.000Z"),
  },
  {
    blockNumber:  9,
    content:      "ENCODED WNSP Wave Channel Address  λ=554.0nm Ψ(206, 30, V) Write — CE→SE encode committed to spectral ledger",
    wavelengthNm: "500.0000",
    psiChannel:   "Ψ(196, 38, H)",
    wdm:          196,
    oam:          38,
    polarisation: "H",
    band:         "CORE",
    energyJoules: "0.00000000000000008286",
    lambdaMassKg: "0.00000000000000000000",
    frequencyHz:  "599584916000000.0000",
    previousPsi:  "Ψ(196, 38, H)",
    nxtReward:    "1.00000000",
    minerAddress: "NXT-NEXS-OS1K-7F3A-OMEGA",
    txCount:      0,
    transactions: [] as any,
    minedAt:      new Date("2026-04-15T16:27:22.707Z"),
  },
  {
    blockNumber:  10,
    content:      "SPECTRAL_WRITE nexus_os_kernel λ=570.5nm Ψ(67, 16, V)",
    wavelengthNm: "542.0000",
    psiChannel:   "Ψ(196, 38, H)",
    wdm:          196,
    oam:          38,
    polarisation: "H",
    band:         "CORE",
    energyJoules: "0.00000000000000008286",
    lambdaMassKg: "0.00000000000000000000",
    frequencyHz:  "553688999076655.0000",
    previousPsi:  "Ψ(196, 38, H)",
    nxtReward:    "1.00000000",
    minerAddress: "NXT-NEXS-OS1K-7F3A-OMEGA",
    txCount:      0,
    transactions: [] as any,
    minedAt:      new Date("2026-04-24T08:37:16.959Z"),
  },
  {
    blockNumber:  11,
    content:      "SPECTRAL_AUDIT_BLOCK[auto]: 1 records proven at λ via Λ=hf/c² | agent: blockchain_auditor | cycle: 11",
    wavelengthNm: "542.0000",
    psiChannel:   "Ψ(245, 23, V)",
    wdm:          245,
    oam:          23,
    polarisation: "V",
    band:         "CORE",
    energyJoules: "0.00000000000000001970",
    lambdaMassKg: "0.00000000000000000000",
    frequencyHz:  "553688999076655.0000",
    previousPsi:  "Ψ(196, 38, H)",
    nxtReward:    "1.00000000",
    minerAddress: "NXT-NEXS-OS1K-7F3A-OMEGA",
    txCount:      1,
    transactions: [] as any,
    minedAt:      new Date("2026-04-28T16:47:33.022Z"),
  },
  {
    blockNumber:  12,
    content:      "SPECTRAL_AUDIT_BLOCK: 500 records proven at λ addresses via Λ=hf/c² | hashes: 13 unique wavelength bands covered | agent: blockchain_auditor",
    wavelengthNm: "435.5000",
    psiChannel:   "Ψ(245, 23, V)",
    wdm:          245,
    oam:          23,
    polarisation: "V",
    band:         "CORE",
    energyJoules: "0.00000000000000001970",
    lambdaMassKg: "0.00000000000000000000",
    frequencyHz:  "688703799080367.0000",
    previousPsi:  "Ψ(245, 23, V)",
    nxtReward:    "1.00000000",
    minerAddress: "NXT-NEXS-OS1K-7F3A-OMEGA",
    txCount:      500,
    transactions: [] as any,
    minedAt:      new Date("2026-05-05T04:25:53.821Z"),
  },
  {
    blockNumber:  13,
    content:      "SPECTRAL_AUDIT_BLOCK[auto]: 1 records proven at λ via Λ=hf/c² | agent: blockchain_auditor | cycle: 13",
    wavelengthNm: "524.0000",
    psiChannel:   "Ψ(245, 23, V)",
    wdm:          245,
    oam:          23,
    polarisation: "V",
    band:         "CORE",
    energyJoules: "0.00000000000000001970",
    lambdaMassKg: "0.00000000000000000000",
    frequencyHz:  "572900763358779.0000",
    previousPsi:  "Ψ(245, 23, V)",
    nxtReward:    "1.00000000",
    minerAddress: "NXT-NEXS-OS1K-7F3A-OMEGA",
    txCount:      1,
    transactions: [] as any,
    minedAt:      new Date("2026-05-06T05:46:09.622Z"),
  },
];

// ── Genesis block seeder (idempotent) ─────────────────────────────────────────
export async function seedGenesisBlock() {
  try {
    const { db } = await import("./db");
    const { blockchainBlocks } = await import("@shared/schema");
    const { count } = await import("drizzle-orm");

    const [{ value }] = await db.select({ value: count() }).from(blockchainBlocks);
    if (Number(value) > 0) {
      console.log("[GENESIS] Chain already has blocks — running historical chain sync…");
      await seedHistoricalChain();
      return;
    }

    console.log("[GENESIS] Chain is empty — seeding canonical chain (14 blocks)…");
    await seedHistoricalChain();
  } catch (err: any) {
    console.error("[GENESIS] Could not seed genesis block:", err?.message ?? err);
  }
}

// ── Historical chain sync — inserts any missing blocks, safe on every boot ───
export async function seedHistoricalChain() {
  try {
    const { pool } = await import("./db");

    let inserted = 0;
    let updated  = 0;

    for (const block of CANONICAL_BLOCKS) {
      // Upsert by block_number: insert if missing, update content if genesis differs
      const result = await pool.query(
        `INSERT INTO blockchain_blocks
           (block_number, content, wavelength_nm, psi_channel, wdm, oam,
            polarisation, band, energy_joules, lambda_mass_kg, frequency_hz,
            previous_psi, nxt_reward, miner_address, tx_count, transactions, mined_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
         ON CONFLICT (block_number) DO UPDATE
           SET content      = EXCLUDED.content,
               mined_at     = EXCLUDED.mined_at,
               miner_address = EXCLUDED.miner_address
           WHERE blockchain_blocks.miner_address NOT IN ('nexusos_genesis','nexus_genesis')
              OR blockchain_blocks.block_number = 0
         RETURNING (xmax = 0) AS was_inserted`,
        [
          block.blockNumber, block.content, block.wavelengthNm, block.psiChannel,
          block.wdm, block.oam, block.polarisation, block.band,
          block.energyJoules, block.lambdaMassKg, block.frequencyHz,
          block.previousPsi, block.nxtReward, block.minerAddress,
          block.txCount, JSON.stringify(block.transactions), block.minedAt,
        ]
      );
      const wasInserted = result.rows[0]?.was_inserted;
      if (wasInserted === true)  inserted++;
      else if (wasInserted === false) updated++;
    }

    if (inserted > 0 || updated > 0) {
      console.log(`[GENESIS] ✓ Historical chain sync — ${inserted} block(s) inserted, ${updated} updated → height now ${CANONICAL_BLOCKS.length - 1}`);
    } else {
      console.log(`[GENESIS] ✓ Chain complete — all ${CANONICAL_BLOCKS.length} canonical blocks present`);
    }
  } catch (err: any) {
    console.error("[GENESIS] Historical chain sync error:", err?.message ?? err);
  }
}
