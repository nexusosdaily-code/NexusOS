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

// ── Channel derivation ────────────────────────────────────────────────────────
/**
 * Derive a deterministic Ψ channel from a username.
 * SHA-256(username) → bytes → wdm, oam, pol, nm
 * The same username always maps to the same channel.
 */
export function deriveChannel(username: string): {
  wdm: number; oam: number; pol: string;
  nm: number; frequencyHz: number; energyJ: number; lambdaKg: number;
  band: string; psi: string;
} {
  const hash = crypto.createHash("sha256").update(username).digest();
  const wdm  = hash[0] % WDM_CHANNELS;           // 0–255
  const oam  = hash[1] % OAM_MODES;              // 0–49
  const pol  = (hash[2] & 1) === 0 ? "H" : "V"; // H or V

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
  actionType: keyof typeof BASE_FEES,
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
    baseFeeNxt = opts.transferAmount * BASE_FEES.wallet_transfer;
  } else if (actionType === "upload_mb" && opts.fileSizeBytes != null) {
    const mb = opts.fileSizeBytes / (1024 * 1024);
    baseFeeNxt = Math.max(mb * BASE_FEES.upload_mb, 0.01);
  } else {
    baseFeeNxt = BASE_FEES[actionType] ?? 1.0;
  }

  const rawFee   = baseFeeNxt * multiplier;
  const feeNxt   = Math.max(rawFee, 0.00000001).toFixed(8);

  return { feeNxt, baseFeeNxt, multiplier, wavelengthNm: nm, frequencyHz, energyJ, lambdaKg, band };
}

// ── WNSP URI ──────────────────────────────────────────────────────────────────
export function buildUri(wdm: number, oam: number, pol: string, path = "/"): string {
  return `wnsp://Ψ(${wdm},${oam},${pol})${path}`;
}

// ── Kernel address for fee collection ────────────────────────────────────────
export const KERNEL_WALLET_ADDRESS = "NXT-KRNL-SYS1-0000-NEXUS";
