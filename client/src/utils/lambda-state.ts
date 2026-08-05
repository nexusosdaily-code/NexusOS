/**
 * WNSP Photonic Distributed Ledger Engine v7.1 [AGPL-3.0]
 * Immutable wavelength state transaction log matrix. Zero external dependencies.
 *
 * Fixes applied vs original:
 *  - CE formula uses % 128 to match canonical encoder (nexusos-ce-encoder)
 *  - txId is deterministic — derived from spectral fingerprint, not Math.random()
 *  - WDM channel = floor((λ_nm - 380) / 3.125) clamped 0–255
 *  - OAM = sum(charCodes) % 50  (per 51,200-channel Hilbert space spec)
 *  - previousWavelengthHash derived from prior block's fingerprint, not a string template
 *  - verifyHardwareAnchor uses consistent nm units throughout
 *  - commitBlock performs real chain coherence validation before stamping isValidated
 *  - Genesis stream_length computed, not magic-numbered
 */

// ── Physics constants (CODATA 2018 / SI exact) ────────────────────────────────
const H = 6.62607015e-34;   // Planck constant  J·s
const C = 299_792_458;       // Speed of light   m/s
const EV = 1.602176634e-19; // eV per joule

// ── CE 128-band lookup table — canonical, matches nexusos-ce-encoder npm/PyPI ─
// CE_TABLE[i] = 380 + (i / 128) * 400  nm  →  3.125 nm per band
const CE_TABLE: number[] = Array.from({ length: 128 }, (_, i) => 380 + (i / 128) * 400);

// ── Band helpers ──────────────────────────────────────────────────────────────
export function getBandName(nm: number): string {
  if (nm < 450) return "SYSTEM";
  if (nm < 490) return "AUTH";
  if (nm < 520) return "STREAM";
  if (nm < 565) return "CORE";
  if (nm < 590) return "UI";
  if (nm < 625) return "EVENT";
  return "STORAGE";
}
export function getBandColor(nm: number): string {
  if (nm < 450) return "#8b00ff";
  if (nm < 490) return "#0050ff";
  if (nm < 520) return "#00cfcf";
  if (nm < 565) return "#16a34a";
  if (nm < 590) return "#cccc00";
  if (nm < 625) return "#ff8c00";
  return "#cc0000";
}

// ── Ψ channel derivation ──────────────────────────────────────────────────────
function wdm(nm: number): number {
  return Math.min(255, Math.max(0, Math.floor((nm - 380) / 3.125)));
}
function oam(text: string): number {
  return [...text].reduce((s, c) => s + c.charCodeAt(0), 0) % 50;
}
function psiChannel(nm: number, text: string): string {
  return `Ψ(${wdm(nm)},${oam(text)},H)`;
}

// ── Deterministic spectral fingerprint hash ───────────────────────────────────
// Produces a hex string derived purely from the physics of the payload.
// No randomness — same payload always produces the same txId.
function spectralHash(nm: number, energy: number, text: string): string {
  const a = Math.round(nm * 1000);          // λ in picometres (integer)
  const b = Math.round(energy * 1e38);      // energy scaled to avoid float noise
  const c = [...text].reduce((s, ch) => (s * 31 + ch.charCodeAt(0)) >>> 0, 0x811c9dc5);
  const d = (a * 0x9e3779b9 ^ b ^ c) >>> 0;
  return d.toString(16).padStart(8, "0");
}

// ── Block fingerprint (for chaining) ─────────────────────────────────────────
function blockFingerprint(block: LedgerBlock): string {
  const anchor = Math.round(block.blockWavelengthAnchor * 1000);
  const energy = block.transactions.reduce(
    (s, t) => s + t.spectralFingerprint.total_energy_joules, 0
  );
  const scaled = Math.round(energy * 1e38);
  const v = (anchor * 0x9e3779b9 ^ scaled ^ block.blockIndex * 0x45d9f3b) >>> 0;
  return `${block.blockWavelengthAnchor.toFixed(3)}nm:${v.toString(16).padStart(8, "0")}`;
}

// ── Public types ──────────────────────────────────────────────────────────────
export interface SpectralFingerprint {
  base_nm: number;
  step_nm: number;
  stream_length: number;
  mean_lambda_nm: number;
  total_energy_joules: number;
  total_energy_ev: number;
  aggregate_mass_kg: number;
  band: string;
}

export interface PhotonicTransaction {
  txId: string;          // Deterministic spectral hash — no randomness
  timestamp: number;
  payload: string;
  spectralFingerprint: SpectralFingerprint;
  psiChannel: string;    // Ψ(wdm,oam,pol) — full Hilbert address
}

export interface LedgerBlock {
  blockIndex: number;
  previousWavelengthHash: string;  // Fingerprint of preceding block
  transactions: PhotonicTransaction[];
  blockWavelengthAnchor: number;   // Mean λ of all tx in this block (nm)
  isValidated: boolean;
  validationNote: string;
}

// ── Lambda State Machine ──────────────────────────────────────────────────────
export class LambdaStateMachine {
  private readonly toleranceNm = 2.0;  // Calibration constraint ±2.000 nm
  private ledgerChain: LedgerBlock[] = [];

  constructor() {
    this.createGenesisBlock();
  }

  private createGenesisBlock(): void {
    const GENESIS_PAYLOAD = "NEXUSOS_WNSP_GENESIS_CORE";
    const genesis_nm = 380.000;
    const genesis_freq = (C / (genesis_nm * 1e-9));
    const genesis_energy = H * genesis_freq;

    const genesisTx: PhotonicTransaction = {
      txId: `tx_genesis_${spectralHash(genesis_nm, genesis_energy, GENESIS_PAYLOAD)}`,
      timestamp: 0,  // Epoch-zero: the first unobserved oscillation
      payload: GENESIS_PAYLOAD,
      spectralFingerprint: {
        base_nm: 380.000,
        step_nm: 3.125,
        stream_length: GENESIS_PAYLOAD.length,
        mean_lambda_nm: genesis_nm,
        total_energy_joules: genesis_energy * GENESIS_PAYLOAD.length,
        total_energy_ev: (genesis_energy * GENESIS_PAYLOAD.length) / EV,
        aggregate_mass_kg: (genesis_energy * GENESIS_PAYLOAD.length) / (C * C),
        band: getBandName(genesis_nm),
      },
      psiChannel: psiChannel(genesis_nm, GENESIS_PAYLOAD),
    };

    const genesisBlock: LedgerBlock = {
      blockIndex: 0,
      previousWavelengthHash: "OPTICAL_VACUUM_NULL",
      transactions: [genesisTx],
      blockWavelengthAnchor: genesis_nm,
      isValidated: true,
      validationNote: "Genesis anchor — hardcoded physical origin",
    };

    this.ledgerChain.push(genesisBlock);
  }

  /**
   * Transforms a payload string into a deterministic photonic transaction.
   * Uses the canonical CE_TABLE[charCode % 128] formula.
   */
  public compileTransaction(payload: string): PhotonicTransaction {
    if (!payload.trim()) throw new Error("Payload cannot be empty");

    const chars = [...payload];
    let totalLambda = 0;
    let totalEnergy = 0;

    for (const char of chars) {
      const nm = CE_TABLE[char.charCodeAt(0) % 128];  // canonical CE lookup
      const freq = C / (nm * 1e-9);
      totalLambda += nm;
      totalEnergy += H * freq;
    }

    const meanNm = totalLambda / chars.length;
    const mass   = totalEnergy / (C * C);
    const txId   = `tx_${spectralHash(meanNm, totalEnergy, payload)}`;

    return {
      txId,
      timestamp: Date.now(),
      payload,
      spectralFingerprint: {
        base_nm: 380.000,
        step_nm: 3.125,
        stream_length: chars.length,
        mean_lambda_nm: parseFloat(meanNm.toFixed(3)),
        total_energy_joules: totalEnergy,
        total_energy_ev: totalEnergy / EV,
        aggregate_mass_kg: mass,
        band: getBandName(meanNm),
      },
      psiChannel: psiChannel(meanNm, payload),
    };
  }

  /**
   * Commits a block to the chain after validating spectral coherence.
   * A block is coherent if its anchor is within ±toleranceNm of the
   * previous block's anchor (i.e. the chain doesn't jump bands abruptly).
   */
  public commitBlock(transactions: PhotonicTransaction[]): LedgerBlock {
    if (transactions.length === 0) throw new Error("Cannot commit empty block");

    const last = this.ledgerChain[this.ledgerChain.length - 1];
    const sumNm = transactions.reduce(
      (s, t) => s + t.spectralFingerprint.mean_lambda_nm, 0
    );
    const anchor = sumNm / transactions.length;
    const drift  = Math.abs(anchor - last.blockWavelengthAnchor);
    const valid  = drift <= this.toleranceNm;

    const block: LedgerBlock = {
      blockIndex: last.blockIndex + 1,
      previousWavelengthHash: blockFingerprint(last),
      transactions,
      blockWavelengthAnchor: parseFloat(anchor.toFixed(3)),
      isValidated: valid,
      validationNote: valid
        ? `Δλ=${drift.toFixed(3)}nm — within ±${this.toleranceNm}nm tolerance`
        : `Δλ=${drift.toFixed(3)}nm — EXCEEDS ±${this.toleranceNm}nm tolerance`,
    };

    this.ledgerChain.push(block);
    return block;
  }

  /**
   * Verifies a block against a live spectrometer reading.
   * All units in nm for clarity.
   */
  public verifyHardwareAnchor(blockIndex: number, readingNm: number): boolean {
    const block = this.ledgerChain.find(b => b.blockIndex === blockIndex);
    if (!block) return false;
    const deviationNm = Math.abs(readingNm - block.blockWavelengthAnchor);
    const pass = deviationNm <= this.toleranceNm;
    block.isValidated = pass;
    block.validationNote = pass
      ? `Hardware verified — Δλ=${deviationNm.toFixed(3)}nm`
      : `Hardware FAIL — Δλ=${deviationNm.toFixed(3)}nm exceeds ±${this.toleranceNm}nm`;
    return pass;
  }

  /** Re-validates the entire chain for internal coherence. */
  public auditChain(): { valid: boolean; faults: number[] } {
    const faults: number[] = [];
    for (let i = 1; i < this.ledgerChain.length; i++) {
      const prev = this.ledgerChain[i - 1];
      const curr = this.ledgerChain[i];
      const expectedHash = blockFingerprint(prev);
      if (curr.previousWavelengthHash !== expectedHash) faults.push(curr.blockIndex);
    }
    return { valid: faults.length === 0, faults };
  }

  public getChain(): LedgerBlock[] {
    return [...this.ledgerChain];
  }

  public getToleranceNm(): number {
    return this.toleranceNm;
  }

  /**
   * Exposes the deterministic block fingerprint so external modules (e.g. P2PSyncEngine)
   * can verify chain links without re-implementing the hash algorithm.
   */
  public computeBlockFingerprint(block: LedgerBlock): string {
    return blockFingerprint(block);
  }

  /**
   * Hot-swaps the internal ledger with a validated incoming chain.
   * Only P2PSyncEngine should call this after passing all consensus checks.
   */
  public replaceChain(blocks: LedgerBlock[]): void {
    this.ledgerChain = [...blocks];
  }
}
