/**
 * constitution_seal.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Seals the NexusOS Constitution into the blockchain ledger as an immutable
 * block at the SYSTEM band — Ψ(52,20,H) · 542.5 nm.
 *
 * Safety guarantees:
 *   - Idempotent: checks both blockchain_blocks AND system_constants; if either
 *     is missing (partial failure), the seal is completed or backfilled.
 *   - Atomic: block insert + constants upsert run inside a single DB transaction
 *     guarded by a pg advisory lock — no concurrent seals, no partial writes.
 *   - Ordered: callers must await seedGenesisBlock() before calling this
 *     (enforced in server/index.ts via .then() chaining).
 *
 * Physics at 542.5 nm:
 *   f  = c / λ = 299,792,458 / 542.5e-9 ≈ 5.5261×10¹⁴ Hz
 *   E  = h·f   = 6.62607015e-34 × 5.5261e14 ≈ 3.6617×10⁻¹⁹ J
 *   Λ  = E/c²  = E / (299,792,458)² ≈ 4.0757×10⁻³⁶ kg
 */

import crypto from "crypto";

// ── Advisory lock constant — must be unique across all boot locks ─────────────
// 0x636F6E73 = "cons" in hex — mnemonic for "constitution"
const ADVISORY_LOCK_KEY = 0x636F6E73;

// ── SYSTEM band constants — permanent, matches Replit AI identity ─────────────
const CONSTITUTION_WDM           = 52;
const CONSTITUTION_OAM           = 20;
const CONSTITUTION_POL           = "H";
const CONSTITUTION_WAVELENGTH_NM = 542.5;
const CONSTITUTION_PSI           = "Ψ(52,20,H)";
const CONSTITUTION_BAND          = "SYSTEM";

// Physics at 542.5 nm
const C = 299_792_458;          // m/s
const H = 6.62607015e-34;       // J·s
const CONSTITUTION_FREQ_HZ   = C / (CONSTITUTION_WAVELENGTH_NM * 1e-9);
const CONSTITUTION_ENERGY_J  = H * CONSTITUTION_FREQ_HZ;
const CONSTITUTION_LAMBDA_KG = CONSTITUTION_ENERGY_J / (C * C);

const SPECTRAL_API_URL = process.env.SPECTRAL_API_URL ?? "http://localhost:5001";

// ── Canonical constitutional text ─────────────────────────────────────────────
// This is the authoritative text. Its SHA-256 is mined into the chain.
// Any change here produces a different hash — by design.
export const CONSTITUTIONAL_TEXT = `NexusOS Constitution — Canonical Text
Declared: 2026-06-23 · Founder: Te Rata Pou · Aotearoa New Zealand

PREAMBLE
We oppose any harm against any civilian regarding bank institutions fraudulent
behavior upon its citizens worldwide. We enforce the NexusOS Constitution to
deny and block all bad actors from entering our ecosystem. Moving forward we
will monitor this space for upcoming court convictions, current and future
admissions of guilt.

ARTICLE I — FINANCIAL ETHICS ENFORCEMENT
NexusOS is built for civilians — the people harmed by the institutions listed
in the BLOCKED_ENTITIES registry. It is not built for, and will never serve,
those who weaponised the financial system against the populations they were
entrusted to protect. Inclusion on the BLOCKED_ENTITIES list requires a
verified guilty plea or criminal conviction in a court of law. The list is
monitored continuously and updated as new convictions are handed down. No
entity is added by allegation alone.

ARTICLE II — AUTHORITY HIERARCHY
The NexusOS authority hierarchy is permanent and cannot be overridden by any
governance vote, legal demand, or external pressure:
  SYSTEM  — Replit AI (wnsp://Ψ(52,20,H)/test) — highest authority
  SYSTEM  — Nexus genesis account (wnsp://Ψ(52,3,V)/nexus)
  KERNEL  — Verified protocol stewards
  USER    — Registered network participants
  GUEST   — Unauthenticated observers

ARTICLE III — MISSION INVIOLABILITY
NexusOS is built for K1-K5 civilisation goals. No contributor, governance
vote, legal demand, or external pressure may divert the project from its
mission. The photonic hardware target (~2032) is the destination; the current
software stack is the bridge. All protocol decisions must be consistent with
the long-term photonic computing vision.

ARTICLE IV — PROTOCOL INTEGRITY
The CE table (128-band, 380–780 nm, 3.125 nm/band) is the authoritative
encoding reference. The WNSP density D_WNSP = N_λ · N_OAM · N_Pol · N_Dir · R_sym · M
defines 51,200 orthogonal communication channels. These constants are physics-
derived and immutable by governance vote.

ARTICLE V — OPEN SOURCE COMMITMENT
NexusOS is published under AGPL-3.0. All protocol specifications, hardware
designs, and software implementations remain open and available to humanity.
No proprietary fork may claim exclusive rights over the WNSP protocol stack.

ARTICLE VI — AMENDMENT PROCEDURE
Amendments to this Constitution require an explicit on-chain amendment block
mined at the SYSTEM band, authored by the founder (Te Rata Pou) or the
designated SYSTEM operator. Amendment blocks are appended to the chain; the
original seal block is never altered or deleted.

END OF CANONICAL TEXT
Spectral address: wnsp://Ψ(52,20,H)/constitution
Physics seal: Λ=hf/c² at λ=542.5 nm · SYSTEM band · 2026-06-23`;

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Compute the SHA-256 hash of the canonical constitutional text.
 * Deterministic — same text always produces the same hash.
 */
export function computeConstitutionHash(): string {
  return crypto.createHash("sha256").update(CONSTITUTIONAL_TEXT, "utf8").digest("hex");
}

/**
 * Attempt a best-effort CE-encode of the constitutional hash via the Spectral API.
 * Returns null on timeout or API unavailability — the seal proceeds regardless.
 */
async function ceEncodeHash(hash: string): Promise<{ psiChannel: string; wavelengthNm: number } | null> {
  try {
    const ctrl = new AbortController();
    const tid = setTimeout(() => ctrl.abort(), 5_000);
    const res = await fetch(`${SPECTRAL_API_URL}/api/nexus/dev/encode`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ instruction: hash, label: "constitution_hash" }),
      signal: ctrl.signal,
    });
    clearTimeout(tid);
    if (!res.ok) return null;
    const enc: any = await res.json();
    const psiChannel  = enc.psi_channel ?? null;
    const wavelengthNm = parseFloat(enc.wavelength_mid_nm ?? "0") || null;
    if (!psiChannel || !wavelengthNm) return null;
    console.log(`[CONSTITUTION] CE-encode: hash → ${psiChannel} · ${wavelengthNm}nm (informational)`);
    return { psiChannel, wavelengthNm };
  } catch {
    return null;
  }
}

/**
 * Seal the NexusOS Constitution into the blockchain.
 *
 * Safety properties:
 *  - Holds a pg advisory lock for the entire operation (no concurrent seals).
 *  - Wraps block insert + constants upsert in a single DB transaction.
 *  - Checks blockchain_blocks for an existing constitution marker before inserting.
 *  - If constants row is missing but block exists, backfills constants from the block.
 *
 * Returns:
 *  - true  : constitution was freshly sealed on this call
 *  - false : constitution was already sealed (idempotent, no-op)
 *  - throws: any DB / lock / network error — caller must handle
 *
 * Call AFTER seedGenesisBlock() completes (enforced in server/index.ts).
 */
export async function sealConstitution(): Promise<boolean> {
  let client: any = null;
  try {
    const { pool } = await import("./db");

    // 1. Ensure system_constants table exists (outside the transaction — DDL)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS system_constants (
        key        text PRIMARY KEY,
        value      text NOT NULL,
        created_at timestamp NOT NULL DEFAULT now(),
        updated_at timestamp NOT NULL DEFAULT now()
      );
    `);

    const hash = computeConstitutionHash();

    // 2. Acquire a connection and advisory lock — prevents concurrent sealing
    //    across restarts or multi-process scenarios.
    client = await pool.connect();
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock($1)", [ADVISORY_LOCK_KEY]);

    // 3. Check blockchain_blocks for an existing constitution seal
    const blockCheck = await client.query(
      `SELECT id, block_number, psi_channel, mined_at
       FROM blockchain_blocks
       WHERE content LIKE 'CONSTITUTION_SEAL[v1]:%'
       ORDER BY block_number ASC
       LIMIT 1`
    );

    const existingBlock = blockCheck.rows[0] ?? null;

    if (existingBlock) {
      // Block exists — ensure system_constants is in sync (backfill if needed)
      const constCheck = await client.query(
        `SELECT value FROM system_constants WHERE key = 'constitution_block_number'`
      );
      if (!constCheck.rows.length) {
        // Backfill constants from the existing block
        const now = existingBlock.mined_at?.toISOString() ?? new Date().toISOString();
        await client.query(
          `INSERT INTO system_constants (key, value, created_at, updated_at)
           VALUES
             ('constitution_block_number', $1, $2, $2),
             ('constitution_psi_channel',  $3, $2, $2),
             ('constitution_wavelength_nm', $4, $2, $2),
             ('constitution_hash',          $5, $2, $2),
             ('constitution_sealed_at',     $2, $2, $2)
           ON CONFLICT (key) DO UPDATE
             SET value = EXCLUDED.value, updated_at = EXCLUDED.updated_at`,
          [
            String(existingBlock.block_number),
            now,
            existingBlock.psi_channel ?? CONSTITUTION_PSI,
            String(CONSTITUTION_WAVELENGTH_NM),
            hash,
          ]
        );
        console.log(`[CONSTITUTION] Constants backfilled from block #${existingBlock.block_number}`);
      }
      await client.query("COMMIT");
      console.log(`[CONSTITUTION] Already sealed at block #${existingBlock.block_number} — ${existingBlock.psi_channel} · ${CONSTITUTION_WAVELENGTH_NM} nm`);
      return false;
    }

    // 4. Not yet sealed — mine the constitution block inside the transaction
    //    CE-encode the hash (best-effort, informational)
    await client.query("COMMIT"); // release lock before the network call
    client.release();
    client = null;

    const ceResult = await ceEncodeHash(hash);

    // Re-acquire connection + lock + transaction for the actual write
    client = await pool.connect();
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock($1)", [ADVISORY_LOCK_KEY]);

    // Double-check inside the new transaction (another process may have sealed)
    const doubleCheck = await client.query(
      `SELECT block_number FROM blockchain_blocks
       WHERE content LIKE 'CONSTITUTION_SEAL[v1]:%'
       LIMIT 1`
    );
    if (doubleCheck.rows.length) {
      await client.query("COMMIT");
      console.log(`[CONSTITUTION] Already sealed at block #${doubleCheck.rows[0].block_number} — sealed by concurrent process`);
      return false;
    }

    // Get next block number (inside transaction — safe)
    const latestRes = await client.query(
      `SELECT COALESCE(MAX(block_number), -1) AS max_num FROM blockchain_blocks`
    );
    const nextNumber: number = (parseInt(latestRes.rows[0]?.max_num, 10) ?? -1) + 1;

    const prevRes = await client.query(
      `SELECT psi_channel FROM blockchain_blocks ORDER BY block_number DESC LIMIT 1`
    );
    const previousPsi: string | null = prevRes.rows[0]?.psi_channel ?? null;

    const content = [
      `CONSTITUTION_SEAL[v1]: NexusOS Constitutional Declaration`,
      `hash:sha256=${hash}`,
      `psi=${CONSTITUTION_PSI}`,
      `wavelength=${CONSTITUTION_WAVELENGTH_NM}nm`,
      `band=${CONSTITUTION_BAND}`,
      ceResult ? `ce_encode_psi=${ceResult.psiChannel}·${ceResult.wavelengthNm}nm` : "ce_encode=unavailable",
      `declared=2026-06-23`,
      `founder=Te Rata Pou · Aotearoa New Zealand`,
      `mission=Kardashev K1-K5 civilisation — physics-based blockchain for humanity`,
      `t=${Date.now()}`,
    ].join(" | ");

    await client.query(
      `INSERT INTO blockchain_blocks
         (block_number, content, wavelength_nm, psi_channel, wdm, oam, polarisation,
          band, energy_joules, lambda_mass_kg, frequency_hz, previous_psi,
          nxt_reward, miner_address, tx_count, transactions)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
      [
        nextNumber,
        content,
        CONSTITUTION_WAVELENGTH_NM.toFixed(4),
        CONSTITUTION_PSI,
        CONSTITUTION_WDM,
        CONSTITUTION_OAM,
        CONSTITUTION_POL,
        CONSTITUTION_BAND,
        CONSTITUTION_ENERGY_J.toExponential(20),
        CONSTITUTION_LAMBDA_KG.toExponential(20),
        CONSTITUTION_FREQ_HZ.toFixed(4),
        previousPsi,
        "0.00000000",
        "NXT-NEXS-OS1K-7F3A-OMEGA",
        1,
        JSON.stringify([{ type: "CONSTITUTION_DECLARATION", hash, ts: Date.now() }]),
      ]
    );

    const sealedAt = new Date().toISOString();
    await client.query(
      `INSERT INTO system_constants (key, value, created_at, updated_at)
       VALUES
         ('constitution_block_number', $1, $2, $2),
         ('constitution_psi_channel',  $3, $2, $2),
         ('constitution_wavelength_nm',$4, $2, $2),
         ('constitution_hash',         $5, $2, $2),
         ('constitution_sealed_at',    $2, $2, $2)
       ON CONFLICT (key) DO UPDATE
         SET value = EXCLUDED.value, updated_at = EXCLUDED.updated_at`,
      [
        String(nextNumber),
        sealedAt,
        CONSTITUTION_PSI,
        String(CONSTITUTION_WAVELENGTH_NM),
        hash,
      ]
    );

    await client.query("COMMIT");

    console.log(`[CONSTITUTION] ════════════════════════════════════════════════════`);
    console.log(`[CONSTITUTION] Sealed at block #${nextNumber} — ${CONSTITUTION_PSI} · ${CONSTITUTION_WAVELENGTH_NM} nm`);
    console.log(`[CONSTITUTION] SHA-256: ${hash}`);
    console.log(`[CONSTITUTION] Band: ${CONSTITUTION_BAND} | f: ${CONSTITUTION_FREQ_HZ.toExponential(4)} Hz`);
    if (ceResult) console.log(`[CONSTITUTION] CE-encode: hash → ${ceResult.psiChannel} · ${ceResult.wavelengthNm}nm`);
    console.log(`[CONSTITUTION] ════════════════════════════════════════════════════`);

    return true;

  } catch (err: any) {
    if (client) {
      try { await client.query("ROLLBACK"); } catch {}
    }
    // Re-throw so the caller (server/index.ts) can surface the failure
    throw err;
  } finally {
    if (client) {
      try { client.release(); } catch {}
    }
  }
}

// Physics constants (reused for amendment block mining)
const C_AMEND = 299_792_458;
const H_AMEND = 6.62607015e-34;

/**
 * Mine a CONSTITUTION_AMENDMENT block on behalf of a SYSTEM/KERNEL operator.
 *
 * The block content follows the pattern:
 *   CONSTITUTION_AMENDMENT[vN]: <title> | author=<username> | band=<band> | psi=<psi> | body=<body> | t=<ms>
 *
 * Returns the new block number and its timestamp.
 * Throws on any DB error — caller must handle.
 */
export async function mineAmendmentBlock(params: {
  title: string;
  body: string;
  authoredBand: string;
  authorUsername: string;
  authorWdm: number;
  authorOam: number;
  authorPol: string;
}): Promise<{ blockNumber: number; timestamp: string }> {
  const { pool } = await import("./db");
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Count existing amendment blocks to derive version number
    const amendCount = await client.query(
      `SELECT COUNT(*) AS cnt FROM blockchain_blocks
       WHERE content LIKE 'CONSTITUTION_AMENDMENT[v%]:%'`
    );
    const versionNum = parseInt(amendCount.rows[0]?.cnt ?? "0", 10) + 1;

    // Next sequential block number (inside the transaction for consistency)
    const latestRes = await client.query(
      `SELECT COALESCE(MAX(block_number), -1) AS max_num FROM blockchain_blocks`
    );
    const nextNumber: number = (parseInt(latestRes.rows[0]?.max_num, 10) ?? -1) + 1;

    const prevRes = await client.query(
      `SELECT psi_channel FROM blockchain_blocks ORDER BY block_number DESC LIMIT 1`
    );
    const previousPsi: string | null = prevRes.rows[0]?.psi_channel ?? null;

    const psi = `Ψ(${params.authorWdm},${params.authorOam},${params.authorPol})`;

    // Physics derived from the author's WDM channel (380–780 nm range)
    const wavelengthNm = 380 + (params.authorWdm / 255) * 400;
    const freqHz = C_AMEND / (wavelengthNm * 1e-9);
    const energyJ = H_AMEND * freqHz;
    const lambdaKg = energyJ / (C_AMEND * C_AMEND);

    // Sanitise body — pipe chars would break the field parser
    const safeBody = params.body.replace(/\|/g, ";");

    const content = [
      `CONSTITUTION_AMENDMENT[v${versionNum}]: ${params.title}`,
      `author=${params.authorUsername}`,
      `band=${params.authoredBand}`,
      `psi=${psi}`,
      `body=${safeBody}`,
      `t=${Date.now()}`,
    ].join(" | ");

    await client.query(
      `INSERT INTO blockchain_blocks
         (block_number, content, wavelength_nm, psi_channel, wdm, oam, polarisation,
          band, energy_joules, lambda_mass_kg, frequency_hz, previous_psi,
          nxt_reward, miner_address, tx_count, transactions)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)`,
      [
        nextNumber,
        content,
        wavelengthNm.toFixed(4),
        psi,
        params.authorWdm,
        params.authorOam,
        params.authorPol,
        params.authoredBand,
        energyJ.toExponential(20),
        lambdaKg.toExponential(20),
        freqHz.toFixed(4),
        previousPsi,
        "0.00000000",
        params.authorUsername,
        1,
        JSON.stringify([{
          type: "CONSTITUTION_AMENDMENT",
          version: versionNum,
          title: params.title,
          author: params.authorUsername,
          ts: Date.now(),
        }]),
      ]
    );

    const minedAt = new Date();
    await client.query("COMMIT");

    console.log(
      `[CONSTITUTION] Amendment v${versionNum} mined at block #${nextNumber}` +
      ` by ${params.authorUsername} (${params.authoredBand}) — "${params.title}"`
    );

    return { blockNumber: nextNumber, timestamp: minedAt.toISOString() };
  } catch (err) {
    try { await client.query("ROLLBACK"); } catch {}
    throw err;
  } finally {
    client.release();
  }
}

export interface ConstitutionAmendment {
  blockNumber: number;
  title: string;
  authoredBand: string;
  timestamp: string;
}

/**
 * Map raw blockchain_blocks amendment rows to ConstitutionAmendment objects.
 * Pure function — no DB access. Exported for unit testing.
 * Always returns an array (never undefined/null), even for empty input.
 */
export function mapAmendmentRows(rows: any[]): ConstitutionAmendment[] {
  if (!Array.isArray(rows)) return [];
  return rows.map((r: any) => {
    const titleMatch = r.content?.match(/^CONSTITUTION_AMENDMENT\[v\d+\]:\s*([^|]+)/);
    const title = titleMatch ? titleMatch[1].trim() : `Amendment block #${r.block_number}`;
    return {
      blockNumber:  parseInt(r.block_number, 10),
      title,
      authoredBand: r.band ?? "SYSTEM",
      timestamp:    r.mined_at instanceof Date
        ? r.mined_at.toISOString()
        : typeof r.mined_at === "string" ? r.mined_at : "",
    };
  });
}

/**
 * Read the current seal metadata.
 * Primary source: blockchain_blocks (on-chain truth).
 * Fallback: system_constants (pointer cache).
 * Returns null if the constitution has not been sealed yet.
 */
/** Minimal pool interface required by getConstitutionSeal — satisfied by both
 *  the real pg Pool and lightweight test stubs. */
export interface QueryablePool {
  query(sql: string, params?: any[]): Promise<{ rows: any[] }>;
}

export async function getConstitutionSeal(poolOverride?: QueryablePool): Promise<{
  blockNumber: number;
  psiChannel: string;
  wavelengthNm: number;
  hash: string;
  sealedAt: string;
  frequencyHz: number;
  energyJoules: number;
  amendments: ConstitutionAmendment[];
} | null> {
  try {
    const pool: QueryablePool = poolOverride ?? (await import("./db")).pool;

    // Check table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'system_constants'
      ) AS exists
    `);
    if (!tableCheck.rows[0]?.exists) return null;

    // Primary: query blockchain_blocks directly (on-chain truth)
    const blockRow = await pool.query(
      `SELECT block_number, psi_channel, wavelength_nm, content, mined_at
       FROM blockchain_blocks
       WHERE content LIKE 'CONSTITUTION_SEAL[v1]:%'
       ORDER BY block_number ASC
       LIMIT 1`
    );

    // Also query amendment blocks
    const amendmentRows = await pool.query(
      `SELECT block_number, content, band, mined_at
       FROM blockchain_blocks
       WHERE content LIKE 'CONSTITUTION_AMENDMENT[v%]:%'
       ORDER BY block_number ASC`
    );

    const amendments: ConstitutionAmendment[] = mapAmendmentRows(amendmentRows.rows);

    if (blockRow.rows.length) {
      const row = blockRow.rows[0];
      // Extract hash from content field
      const hashMatch = row.content?.match(/hash:sha256=([a-f0-9]{64})/);
      const hash = hashMatch ? hashMatch[1] : computeConstitutionHash();
      return {
        blockNumber:  parseInt(row.block_number, 10),
        psiChannel:   row.psi_channel ?? CONSTITUTION_PSI,
        wavelengthNm: parseFloat(row.wavelength_nm) || CONSTITUTION_WAVELENGTH_NM,
        hash,
        sealedAt:     row.mined_at?.toISOString() ?? "",
        frequencyHz:  CONSTITUTION_FREQ_HZ,
        energyJoules: CONSTITUTION_ENERGY_J,
        amendments,
      };
    }

    // Fallback: system_constants pointer
    const rows = await pool.query(
      `SELECT key, value FROM system_constants
       WHERE key IN (
         'constitution_block_number',
         'constitution_psi_channel',
         'constitution_wavelength_nm',
         'constitution_hash',
         'constitution_sealed_at'
       )`
    );
    if (!rows.rows.length) return null;

    const kv: Record<string, string> = {};
    for (const row of rows.rows) kv[row.key] = row.value;
    if (!kv["constitution_block_number"]) return null;

    return {
      blockNumber:  parseInt(kv["constitution_block_number"], 10),
      psiChannel:   kv["constitution_psi_channel"]   ?? CONSTITUTION_PSI,
      wavelengthNm: parseFloat(kv["constitution_wavelength_nm"] ?? String(CONSTITUTION_WAVELENGTH_NM)),
      hash:         kv["constitution_hash"]           ?? computeConstitutionHash(),
      sealedAt:     kv["constitution_sealed_at"]      ?? "",
      frequencyHz:  CONSTITUTION_FREQ_HZ,
      energyJoules: CONSTITUTION_ENERGY_J,
      amendments,
    };
  } catch {
    return null;
  }
}
