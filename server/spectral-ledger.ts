/**
 * spectral-ledger.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Fire-and-forget utility: records any NexusOS event (NXT transfer, lightning
 * payment, stake, etc.) into the spectral DB and blockchain mempool so the
 * blockchain_auditor can mine it into a proof block.
 *
 * Usage (non-blocking):
 *   ledgerEvent({ type, label, content, fromAddress, metadata }).catch(() => {});
 *
 * Every call:
 *   1. CE-encodes `content` via the Flask spectral API → gets Ψ channel + λ
 *   2. Inserts a spectral_record (content-addressed storage at that wavelength)
 *   3. Inserts a blockchain_tx_pool entry with memo "SPECTRAL_AUDIT:…"
 *      so blockchain_auditor.ts picks it up next cycle
 */

const SPECTRAL_API_URL = process.env.SPECTRAL_API_URL ?? "http://localhost:5001";

export interface LedgerEventOpts {
  type:        string;                 // "nxt_transfer" | "lightning_pay" | "stake" | …
  label:       string;                 // short human label shown in spectral DB
  content:     string;                 // string that gets CE-encoded → Ψ channel
  fromAddress: string;                 // sender wallet address or agent ID
  metadata:    Record<string, any>;    // txId, amount, toAddress, memo, …
}

export async function ledgerEvent(opts: LedgerEventOpts): Promise<void> {
  const { type, label, content, fromAddress, metadata } = opts;

  try {
    // ── 1. Encode content through spectral API ──────────────────────────────
    const encRes = await fetch(`${SPECTRAL_API_URL}/api/nexus/dev/encode`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ instruction: content, label }),
    });
    if (!encRes.ok) throw new Error(`Spectral encode HTTP ${encRes.status}`);
    const enc: any = await encRes.json();

    const psiMatch = enc.psi_channel?.match(/Ψ\((\d+),\s*(\d+),\s*([HV])\)/);
    const wdm = psiMatch ? parseInt(psiMatch[1]) : 0;
    const oam = psiMatch ? parseInt(psiMatch[2]) : 0;
    const pol = psiMatch ? psiMatch[3] : "H";

    // ── 2. SHA-256 content hash ─────────────────────────────────────────────
    const { createHash } = await import("crypto");
    const contentHash = createHash("sha256").update(content).digest("hex");

    // ── 3. Insert spectral_record ───────────────────────────────────────────
    const { db } = await import("./db");
    const { spectralRecords, blockchainTxPool } = await import("@shared/schema");

    const [record] = await db.insert(spectralRecords).values({
      label,
      content,
      wavelengthNm:  String(enc.wavelength_mid_nm ?? 550),
      psiChannel:    enc.psi_channel ?? "Ψ(0,0,H)",
      wdm, oam, polarisation: pol,
      band:          enc.band ?? "USER",
      energyJoules:  String(enc.energy_joules ?? 0),
      lambdaMassKg:  String(enc.lambda_mass_kg ?? 0),
      frequencyHz:   String(enc.frequency_hz ?? 0),
      data: { type, contentHash, auditStatus: "pending", ...metadata },
    }).returning();

    // ── 4. Insert into blockchain mempool for auditor ───────────────────────
    const auditMemo = `SPECTRAL_AUDIT:${record.id}:${contentHash.slice(0, 16)}:${enc.wavelength_mid_nm}nm:${enc.psi_channel}`;
    const energyFee = parseFloat(String(enc.energy_joules ?? 0));
    const feePaid   = String(Math.max((energyFee / 1e-17) * 0.00000001, 0.00000001).toFixed(8));

    await db.insert(blockchainTxPool).values({
      fromAddress,
      toAddress:    "SPECTRAL-DB",
      amountNxt:    "0.00000001",
      memo:         auditMemo,
      wavelengthNm: String(enc.wavelength_mid_nm ?? 550),
      psiChannel:   enc.psi_channel ?? null,
      energyJoules: String(enc.energy_joules ?? 0),
      feePaid,
      status:       "pending",
    });

    console.log(`[LEDGER] ✓ ${type} → ${enc.psi_channel} λ=${parseFloat(String(enc.wavelength_mid_nm)).toFixed(2)}nm — record ${record.id.slice(0, 8)}`);
  } catch (err: any) {
    console.warn(`[LEDGER] ⚠ ${type} ledger skipped:`, err?.message ?? err);
  }
}
