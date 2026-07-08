/**
 * NexusOS Physics Engine v1.0
 * ════════════════════════════════════════════════════════════════════════════
 * Every economic action in NexusOS is priced by the sender's spectral channel.
 * The cost of an action is derived from the photon energy at that wavelength:
 *
 *   E = h·f = h·c / λ         (Planck–Einstein relation)
 *   Λ = h·f / c²              (Einstein mass-energy: compression state)
 *
 * Authority bands are defined by wavelength compression state (WDM index):
 *   SYSTEM  WDM  0–63    λ ≈ 380–405 nm   (violet / UV border)
 *   KERNEL  WDM  64–127  λ ≈ 405–480 nm   (deep blue)
 *   USER    WDM  128–191 λ ≈ 480–630 nm   (green → orange)
 *   GUEST   WDM  192–255 λ ≈ 630–780 nm   (red)
 *
 * Fee multiplier: E_sender / E_reference  (reference = 560 nm, green)
 *   → SYSTEM users pay ≈ 1.4× base fee
 *   → GUEST  users pay ≈ 0.8× base fee
 * ════════════════════════════════════════════════════════════════════════════
 */

import crypto from "crypto";

// ── Physical constants ────────────────────────────────────────────────────────
export const H_PLANCK = 6.626_070_15e-34;   // J·s
export const C_LIGHT  = 299_792_458;         // m/s
export const NM_MIN   = 380;                 // nm — shortest visible (SYSTEM band)
export const NM_MAX   = 780;                 // nm — longest visible (GUEST band)
export const WDM_CHANNELS = 256;
export const OAM_MODES    = 50;

// Reference wavelength (green — midpoint of authority spectrum)
const REF_NM = 560;
const REF_E  = (H_PLANCK * C_LIGHT) / (REF_NM * 1e-9);

// ── Base fees in NXT (before physics multiplier) ──────────────────────────────
export const BASE_FEES: Record<string, number> = {
  message_send:      1.0,    // NXT per message
  stream_start:      5.0,    // NXT to open a broadcast channel
  stream_minute:     0.5,    // NXT per minute kept live (future: per-viewer billing)
  document_create:   3.0,    // NXT to seal a spectral document
  upload_mb:         0.25,   // NXT per MB uploaded to the mesh
  spectral_record:   2.0,    // NXT to write to the spectral DB
  wallet_transfer:   0.001,  // fraction (0.1%) — existing behaviour preserved
};

// ── Governance-controlled live fee store ──────────────────────────────────────
// Starts as a copy of BASE_FEES; governance proposals mutate this at runtime.
export const LIVE_FEES: Record<string, number> = { ...BASE_FEES };

// ── Governance-controlled burn ratios ─────────────────────────────────────────
export const LIVE_BURNS: Record<string, number> = {
  message:            0.50,   // 50% of message fee → protocol burn
  stream_join:        0.20,   // 20% of join fee → protocol burn
  stream_heartbeat:   0.15,   // 15% of heartbeat fee → protocol burn
  document_read:      0.10,   // 10% of read fee → protocol burn
};

/** Apply a governance-voted parameter change to the live in-memory stores. */
export function applyGovernanceParam(key: string, value: number): void {
  if (key.startsWith("fee.")) {
    const feeKey = key.slice(4);
    LIVE_FEES[feeKey] = value;
  } else if (key.startsWith("burn.")) {
    const burnKey = key.slice(5);
    LIVE_BURNS[burnKey] = value;
  }
}

// ── Ghost Node Registry ───────────────────────────────────────────────────────
/**
 * Ghost nodes are integer octave addresses in the WNSP compression lattice
 * where no stable nucleus exists. Each lies at an orbital shell boundary,
 * making it a lossless, zero-entropy quantum register tuned to the adjacent
 * matter class. These Ψ channels are RESERVED as NexusOS system services.
 *
 * All ghost nodes sit at WDM=0 (integer octave → frac(n)=0 → 380 nm, SYSTEM
 * band) and are distinguished by their OAM index (= n for n < OAM_MODES=50).
 *
 * Physical basis: M_n = (h·f₀/c²) · 2ⁿ   where f₀ = 555 THz (green anchor)
 * Addressing:     WDM = frac(n) × 255 = 0,   OAM = n mod 50,   Pol = H
 */

export interface GhostNode {
  readonly n:           number;
  readonly massU:       number;
  readonly oam:         number;
  readonly wdm:         number;
  readonly nm:          number;
  readonly psi:         string;
  readonly orbital:     string;
  readonly boundary:    string;
  readonly service:     string;
  readonly serviceName: string;
  readonly authority:   AuthBand;
  readonly fn:          string;
}

export const GHOST_NODES: readonly GhostNode[] = Object.freeze([
  {
    n: 31, massU: 5.2915, oam: 31, wdm: 0, nm: 380,
    psi: "Ψ(0,31,H)",
    orbital: "s",
    boundary: "He → Li  (1s² → 2s¹)",
    service: "NXS-BASE",
    serviceName: "NexusOS Base Wallet Service",
    authority: "SYSTEM" as AuthBand,
    fn: "Core NXT wallet engine, base fee physics, s-orbital chemistry gate — foundation of all economic activity",
  },
  {
    n: 33, massU: 21.1660, oam: 33, wdm: 0, nm: 380,
    psi: "Ψ(0,33,H)",
    orbital: "p",
    boundary: "Ne → Na  (2p⁶ → 3s¹)",
    service: "NXS-LIFE",
    serviceName: "NexusOS Biological Protocol Service",
    authority: "KERNEL" as AuthBand,
    fn: "P2P media engine, mesh networking, health data channels, p-orbital organic chemistry gate",
  },
  {
    n: 34, massU: 42.3320, oam: 34, wdm: 0, nm: 380,
    psi: "Ψ(0,34,H)",
    orbital: "d",
    boundary: "Ca → Sc  (4s² → 3d¹)",
    service: "NXS-MECH",
    serviceName: "NexusOS Hardware Bridge Service",
    authority: "KERNEL" as AuthBand,
    fn: "Photonic hardware I/O, spectral relay mesh, IoT channels, d-orbital catalysis/magnetism gate",
  },
  {
    n: 35, massU: 84.6655, oam: 35, wdm: 0, nm: 380,
    psi: "Ψ(0,35,H)",
    orbital: "s(outer)",
    boundary: "Kr → Rb  (4p⁶ → 5s¹)",
    service: "NXS-FIELD",
    serviceName: "NexusOS Quantum Field Service",
    authority: "SYSTEM" as AuthBand,
    fn: "Quantum sensing, BEC channels, Rydberg field coupling, long-range field physics, 5s-orbital gate — Rb-87 BEC regime",
  },
  {
    n: 36, massU: 169.3310, oam: 36, wdm: 0, nm: 380,
    psi: "Ψ(0,36,H)",
    orbital: "f",
    boundary: "Tm → Yb  (4f¹³ → 4f¹⁴)",
    service: "NXS-MIND",
    serviceName: "NexusOS AI Operating System Kernel",
    authority: "SYSTEM" as AuthBand,
    fn: "AI OS kernel, KernelEventBus, boot sequencer, agent watchdog, blockchain auditor, f-orbital precision gate",
  },
] as const);

/** OAM indices that are reserved system channels (when WDM = 0). */
const _GHOST_OAM_SET: ReadonlySet<number> = new Set(GHOST_NODES.map(g => g.oam));

/**
 * Returns true if (wdm, oam) maps to a ghost node system-reserved address.
 * Ghost node channels belong to NexusOS; no user wallet may occupy them.
 */
export function isGhostNodeAddress(wdm: number, oam: number): boolean {
  return wdm === 0 && _GHOST_OAM_SET.has(oam);
}

/**
 * Look up a ghost node by its OAM index (when WDM=0).
 * Returns undefined if the address is not a registered ghost node.
 */
export function getGhostNodeByOam(oam: number): GhostNode | undefined {
  return GHOST_NODES.find(g => g.oam === oam);
}

/**
 * If (wdm, oam) lands on a ghost node address, step OAM forward by 1
 * (wrapping within OAM_MODES) until clear.
 * Ensures user wallet derivation never collides with system channels.
 */
function _stepAwayFromGhostNode(wdm: number, oam: number): number {
  let safe = oam;
  let guard = 0;
  while (isGhostNodeAddress(wdm, safe) && guard < OAM_MODES) {
    safe = (safe + 1) % OAM_MODES;
    guard++;
  }
  return safe;
}

// ── Channel derivation ────────────────────────────────────────────────────────
/**
 * Derive a deterministic Ψ channel from a username.
 * SHA-256(username) → bytes → wdm, oam, pol, nm
 * The same username always maps to the same channel.
 *
 * Ghost-node guard: if the hash lands on a reserved system channel
 * (WDM=0 with OAM ∈ {31,33,34,36}), OAM is stepped forward by 1 until
 * the address is clear. User wallets may never occupy ghost node channels.
 */
export function deriveChannel(username: string): {
  wdm: number; oam: number; pol: string;
  nm: number; frequencyHz: number; energyJ: number; lambdaKg: number;
  band: string; psi: string;
} {
  const hash = crypto.createHash("sha256").update(username).digest();
  const wdm  = hash[0] % WDM_CHANNELS;           // 0–255
  let   oam  = hash[1] % OAM_MODES;              // 0–49
  const pol  = (hash[2] & 1) === 0 ? "H" : "V"; // H or V

  // Ghost-node guard — step away from reserved system channels
  oam = _stepAwayFromGhostNode(wdm, oam);

  const nm          = NM_MIN + wdm * ((NM_MAX - NM_MIN) / (WDM_CHANNELS - 1));
  const frequencyHz = C_LIGHT / (nm * 1e-9);
  const energyJ     = H_PLANCK * frequencyHz;
  const lambdaKg    = energyJ / (C_LIGHT * C_LIGHT);
  const band        = getBand(wdm);
  const psi         = `Ψ(${wdm},${oam},${pol})`;

  return { wdm, oam, pol, nm, frequencyHz, energyJ, lambdaKg, band, psi };
}

// ── Authority band ────────────────────────────────────────────────────────────
export type AuthBand = "SYSTEM" | "KERNEL" | "USER" | "GUEST";

export const BAND_RANGES: Record<AuthBand, [number, number]> = {
  SYSTEM: [0,   63],
  KERNEL: [64,  127],
  USER:   [128, 191],
  GUEST:  [192, 255],
};

export function getBand(wdm: number): AuthBand {
  if (wdm <  64) return "SYSTEM";
  if (wdm < 128) return "KERNEL";
  if (wdm < 192) return "USER";
  return "GUEST";
}

export const BAND_RANK: Record<AuthBand, number> = {
  SYSTEM: 3, KERNEL: 2, USER: 1, GUEST: 0,
};

/**
 * Returns true if the user's band meets or exceeds the required band.
 */
export function hasAuthority(userWdm: number, requiredBand: AuthBand): boolean {
  const userBand = getBand(userWdm);
  return BAND_RANK[userBand] >= BAND_RANK[requiredBand];
}

// ── Fee calculation ───────────────────────────────────────────────────────────
export interface PhysicsFee {
  feeNxt: string;        // NXT amount to deduct
  baseFeeNxt: number;
  multiplier: number;    // E_sender / E_reference
  wavelengthNm: number;
  frequencyHz: number;
  energyJ: number;
  lambdaKg: number;
  band: AuthBand;
}

/**
 * Calculate the NXT fee for an action performed by a user at a given WDM channel.
 * For upload actions, pass fileSizeBytes for per-MB pricing.
 */
export function calcFee(
  actionType: string,
  senderWdm: number,
  opts: { fileSizeBytes?: number; transferAmount?: number } = {},
): PhysicsFee {
  const nm          = NM_MIN + senderWdm * ((NM_MAX - NM_MIN) / (WDM_CHANNELS - 1));
  const frequencyHz = C_LIGHT / (nm * 1e-9);
  const energyJ     = H_PLANCK * frequencyHz;
  const lambdaKg    = energyJ / (C_LIGHT * C_LIGHT);
  const multiplier  = energyJ / REF_E;
  const band        = getBand(senderWdm);

  let baseFeeNxt: number;

  if (actionType === "wallet_transfer" && opts.transferAmount != null) {
    baseFeeNxt = opts.transferAmount * LIVE_FEES.wallet_transfer;
  } else if (actionType === "upload_mb" && opts.fileSizeBytes != null) {
    const mb = opts.fileSizeBytes / (1024 * 1024);
    baseFeeNxt = Math.max(mb * LIVE_FEES.upload_mb, 0.01);
  } else {
    baseFeeNxt = LIVE_FEES[actionType] ?? 1.0;
  }

  const rawFee   = baseFeeNxt * multiplier;
  const feeNxt   = Math.max(rawFee, 0.00000001).toFixed(8);

  return { feeNxt, baseFeeNxt, multiplier, wavelengthNm: nm, frequencyHz, energyJ, lambdaKg, band };
}

// ── WNSP URI ──────────────────────────────────────────────────────────────────
export function buildUri(wdm: number, oam: number, pol: string, path = "/"): string {
  return `wnsp://Ψ(${wdm},${oam},${pol})${path}`;
}

// ── Oscillating Quanta State ──────────────────────────────────────────────────
// Returns the instantaneous quantum oscillation state for a WDM channel at
// a given elapsed time.  Uses fractional-cycle phase to avoid float overflow
// at optical frequencies (~10^14 Hz).
export interface QuantaOscillation {
  wdm:         number;
  tMs:         number;
  nm:          number;
  frequencyHz: number;
  periodS:     number;
  energyJ:     number;
  lambdaKg:    number;
  phase:       number;   // normalized [0, 1) — fraction of period elapsed = (t%T)/T
  phaseRad:    number;   // phase × 2π, for waveform computation
  amplitude:   number;   // cos(phaseRad) — +1 at t=0
  waveform:    number[];  // 128 cosine samples spanning one full cycle from phaseRad
  derivedFrom: string;
}

export function oscillatingQuantaState(wdm: number, tMs: number): QuantaOscillation {
  const w           = Math.max(0, Math.min(255, Math.round(wdm)));
  const nm          = NM_MIN + w * ((NM_MAX - NM_MIN) / (WDM_CHANNELS - 1));
  const frequencyHz = C_LIGHT / (nm * 1e-9);
  const periodS     = 1 / frequencyHz;
  const energyJ     = H_PLANCK * frequencyHz;
  const lambdaKg    = energyJ / (C_LIGHT * C_LIGHT);

  // Normalized phase: fraction of period elapsed [0, 1).
  // Uses modulo-1 arithmetic to avoid float64 overflow at ~500 THz × large t.
  const phase    = (frequencyHz * (tMs * 1e-3)) % 1;   // (t % T) / T
  const phaseRad = phase * 2 * Math.PI;                 // [0, 2π) for waveform calc
  const amplitude = Math.cos(phaseRad);                 // cosine: starts at +1 at t=0

  // 128 cosine samples over one full period, starting at current phase
  const waveform = Array.from({ length: 128 }, (_, i) =>
    parseFloat(Math.cos(phaseRad + (i / 128) * 2 * Math.PI).toFixed(6))
  );

  return {
    wdm: w, tMs, nm, frequencyHz, periodS, energyJ, lambdaKg,
    phase:    parseFloat(phase.toFixed(9)),
    phaseRad: parseFloat(phaseRad.toFixed(6)),
    amplitude: parseFloat(amplitude.toFixed(6)),
    waveform,
    derivedFrom: `E=hf · λ=${nm.toFixed(2)}nm · f=${(frequencyHz / 1e12).toFixed(4)}THz`,
  };
}

// ── Kernel address for fee collection ────────────────────────────────────────
export const KERNEL_WALLET_ADDRESS = "NXT-KRNL-SYS1-0000-NEXUS";

// ════════════════════════════════════════════════════════════════════════════
// CONSTITUTIONAL ENFORCEMENT LAYER — v1.0
// Three supreme articles, enforced at the substrate level.
// No governance vote, no override, no bypass.
//
//   C-0001  Non-Dominance    — no entity > 33% of circulating Lambda mass
//                              EXCEPTION: GENESIS_EXECUTION_ADDRESS is exempt —
//                              it received the foundational block reward before
//                              the constitutional upgrade was ratified.
//   C-0002  Immutable Rights — no tx may breach the Basic Human Living Standard of 1,150 NXT provided in services through the charity
//   C-0005  Physics Supremacy — all protocol parameters must be Maxwell-valid
// ════════════════════════════════════════════════════════════════════════════

/**
 * Genesis execution address — the wallet that received the foundational block
 * reward (Block #0 coinbase) before the constitutional upgrade was ratified.
 * This address is exempt from C-0001 Non-Dominance by pre-constitutional right.
 */
export const GENESIS_EXECUTION_ADDRESS = "NXT-NEXS-OS1K-7F3A-OMEGA";

/** Basic Human Living Standard — 1,150 NXT/month = measured monthly service consumption per citizen */
export const IHR_FLOOR_NXT = 1_150;

/** Non-dominance ceiling — 33% of circulating Lambda mass */
export const NON_DOMINANCE_PCT = 0.33;

/** Physics bounds for fee parameters (NXT) */
export const PHYSICS_FEE_MIN = 0.00000001;   // smallest photon energy basis — E=hf > 0
export const PHYSICS_FEE_MAX = 100;          // Maxwell-admissible ceiling for visible-spectrum pricing

/** Physics bounds for burn ratio parameters */
export const PHYSICS_BURN_MIN = 0;           // lossless lower bound
export const PHYSICS_BURN_MAX = 1;           // conservation of energy upper bound

export interface ConstitutionViolation {
  article: "C-0001" | "C-0002" | "C-0005";
  rule: string;
  detail: string;
}

export interface ConstitutionCheck {
  passed: boolean;
  violation?: ConstitutionViolation;
}

/**
 * C-0001: Non-Dominance
 * No entity may control more than 33% of total circulating Lambda mass.
 * Total circulating = sum of all wallet balances.
 *
 * EXCEPTION: GENESIS_EXECUTION_ADDRESS is permanently exempt — it received
 * the foundational Block #0 coinbase reward before this article was ratified.
 * Applying C-0001 retroactively to a pre-constitutional reward would itself
 * be unconstitutional.
 *
 * @param recipientNewBalanceNxt  recipient's balance after transfer (NXT)
 * @param totalCirculatingNxt     sum of all wallet balances (NXT)
 * @param recipientAddress        wallet address of the recipient (for genesis exemption)
 */
export function checkC0001(
  recipientNewBalanceNxt: number,
  totalCirculatingNxt: number,
  recipientAddress?: string,
): ConstitutionCheck {
  if (totalCirculatingNxt <= 0) return { passed: true };
  // Genesis execution address is exempt from Non-Dominance by pre-constitutional right
  if (recipientAddress && recipientAddress === GENESIS_EXECUTION_ADDRESS) {
    return { passed: true };
  }
  const pct = recipientNewBalanceNxt / totalCirculatingNxt;
  if (pct > NON_DOMINANCE_PCT) {
    return {
      passed: false,
      violation: {
        article: "C-0001",
        rule: "Non-Dominance",
        detail: `Transfer would give recipient ${(pct * 100).toFixed(2)}% of circulating Lambda mass — exceeds the constitutional limit of ${(NON_DOMINANCE_PCT * 100).toFixed(0)}%.`,
      },
    };
  }
  return { passed: true };
}

/**
 * C-0002: Immutable Rights
 * 1,150 NXT/month is the measured monthly service consumption per citizen —
 * the gauge of what the charity delivers across 7 service categories.
 * C-0002 protects this figure in the wallet because it represents the citizen's
 * consumption baseline. The floor and the consumption measure are the same number by design.
 * No transaction may reduce a citizen's balance below their monthly consumption baseline.
 * If a sender's balance is already below the baseline, no further debits are permitted.
 *
 * @param senderNewBalanceNxt  sender's balance after amount + fee deducted (NXT)
 */
export function checkC0002(senderNewBalanceNxt: number): ConstitutionCheck {
  if (senderNewBalanceNxt < IHR_FLOOR_NXT) {
    return {
      passed: false,
      violation: {
        article: "C-0002",
        rule: "Immutable Rights",
        detail: `Transfer would reduce sender to ${senderNewBalanceNxt.toFixed(8)} NXT — below the monthly service consumption baseline of ${IHR_FLOOR_NXT} NXT guaranteed by C-0002.`,
      },
    };
  }
  return { passed: true };
}

/**
 * C-0005: Physics Supremacy
 * All governance parameter values must be derivable from Maxwell's equations.
 * Fees must satisfy E=hf > 0. Burn ratios must satisfy conservation of energy [0, 1].
 * A parameter value that cannot be expressed as a valid physics quantity is void.
 *
 * @param category   "fee" or "burn"
 * @param proposed   proposed numeric value
 */
export function checkC0005(
  category: "fee" | "burn" | string,
  proposed: number,
): ConstitutionCheck {
  if (category === "fee") {
    if (proposed <= 0) {
      return {
        passed: false,
        violation: {
          article: "C-0005",
          rule: "Physics Supremacy",
          detail: `Fee cannot be zero or negative. E=hf requires photon energy > 0 at all wavelengths. Proposed: ${proposed} NXT.`,
        },
      };
    }
    if (proposed > PHYSICS_FEE_MAX) {
      return {
        passed: false,
        violation: {
          article: "C-0005",
          rule: "Physics Supremacy",
          detail: `Fee ${proposed} NXT exceeds the Maxwell-admissible ceiling of ${PHYSICS_FEE_MAX} NXT for visible-spectrum channel pricing.`,
        },
      };
    }
  }
  if (category === "burn") {
    if (proposed < PHYSICS_BURN_MIN || proposed > PHYSICS_BURN_MAX) {
      return {
        passed: false,
        violation: {
          article: "C-0005",
          rule: "Physics Supremacy",
          detail: `Burn ratio ${proposed} violates conservation of energy — must be in [0, 1]. You cannot destroy more energy than exists in the channel.`,
        },
      };
    }
  }
  return { passed: true };
}
