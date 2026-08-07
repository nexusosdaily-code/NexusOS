/**
 * NexusOS Bogoliubov Module v1.0 — PRIVATE R&D (disclosure freeze)
 * ════════════════════════════════════════════════════════════════════════════
 * Bogoliubov transformation mathematics for the WNSP formalism.
 *   b = u·a + v·a†,  u = cosh r, v = sinh r,  |u|² − |v|² = 1  (bosonic)
 *
 * Covers: squeezed vacuum (Kerr microresonator regime — PHR-1 relevant),
 * quasiparticle dispersion (superfluids of light), dynamical Casimir effect
 * (operator-level ZPE formalism), and the squeezed compression state
 * Λ_B(r) = Λ₀ · cosh(2r) per Ψ channel.
 *
 * NOT imported by any route, page, bot, or public surface. Research only.
 * See docs/research/BOGOLIUBOV_WNSP.md for the working document.
 * ════════════════════════════════════════════════════════════════════════════
 */

import { H_PLANCK, C_LIGHT, NM_MIN, NM_MAX, WDM_CHANNELS } from "./physics";

export const HBAR = H_PLANCK / (2 * Math.PI); // J·s — reduced Planck constant

// ── Core transformation ───────────────────────────────────────────────────────

export interface BogoliubovCoefficients {
  r: number;          // squeezing / mixing parameter
  u: number;          // cosh r
  v: number;          // sinh r
  invariant: number;  // u² − v² — must equal 1 (bosonic commutator preserved)
}

/** Bogoliubov coefficients for squeezing parameter r (phase θ = 0 convention). */
export function bogoliubovCoefficients(r: number): BogoliubovCoefficients {
  const u = Math.cosh(r);
  const v = Math.sinh(r);
  return { r, u, v, invariant: u * u - v * v };
}

// ── Squeezed vacuum ───────────────────────────────────────────────────────────

export interface SqueezedVacuum {
  r: number;
  meanPhotons: number;      // ⟨n⟩ = sinh² r = |v|²
  squeezingDb: number;      // 10·log10(e^{−2r}) — negative = noise below vacuum
  varSqueezed: number;      // quadrature variance (¼)·e^{−2r}
  varAntiSqueezed: number;  // conjugate quadrature (¼)·e^{+2r}
  uncertaintyProduct: number; // must stay ≥ 1/16 (Heisenberg, here exactly 1/16)
}

/** Properties of the squeezed vacuum |r⟩ = S(r)|0⟩. Vacuum variance convention: ¼. */
export function squeezedVacuum(r: number): SqueezedVacuum {
  const s = Math.sinh(r);
  const varSq = 0.25 * Math.exp(-2 * r);
  const varAnti = 0.25 * Math.exp(2 * r);
  return {
    r,
    meanPhotons: s * s,
    squeezingDb: 10 * Math.log10(Math.exp(-2 * r)),
    varSqueezed: varSq,
    varAntiSqueezed: varAnti,
    uncertaintyProduct: varSq * varAnti,
  };
}

// ── Quasiparticle (Bogoliubov) dispersion ─────────────────────────────────────

export interface BogoliubovDispersion {
  k: number;            // wavenumber (1/m)
  energyJ: number;      // E(k) = √(ε_k(ε_k + 2gn))
  freeEnergyJ: number;  // ε_k = ħ²k²/2m
  soundSpeedMs: number; // c_s = √(gn/m)
  phononEnergyJ: number;// ħ·c_s·k — long-wavelength limit
  healingLengthM: number; // ξ = ħ/√(2m·gn) — regime-crossover length
}

/**
 * Bogoliubov quasiparticle dispersion for an interacting condensate
 * (atoms, polaritons, or a photon fluid).
 * @param k   wavenumber (1/m)
 * @param gnJ interaction energy g·n (J)
 * @param mKg (effective) mass (kg)
 */
export function bogoliubovDispersion(k: number, gnJ: number, mKg: number): BogoliubovDispersion {
  if (!Number.isFinite(k) || !Number.isFinite(gnJ) || !Number.isFinite(mKg)) {
    throw new Error("bogoliubovDispersion: k, gnJ, mKg must be finite numbers");
  }
  if (mKg <= 0) throw new Error("bogoliubovDispersion: mass must be positive");
  if (gnJ < 0) throw new Error("bogoliubovDispersion: attractive regime (gnJ < 0) is dynamically unstable — not supported");
  const epsK = (HBAR * HBAR * k * k) / (2 * mKg);
  const energyJ = Math.sqrt(epsK * (epsK + 2 * gnJ));
  const soundSpeedMs = Math.sqrt(gnJ / mKg);
  return {
    k,
    energyJ,
    freeEnergyJ: epsK,
    soundSpeedMs,
    phononEnergyJ: HBAR * soundSpeedMs * k,
    healingLengthM: HBAR / Math.sqrt(2 * mKg * gnJ),
  };
}

// ── Dynamical Casimir effect ──────────────────────────────────────────────────

export interface DcePhotons {
  rEff: number;        // effective squeezing ε·ω·t/2
  meanPhotons: number; // ⟨n⟩ = sinh² r_eff
  epsilon: number;
  omegaRadS: number;
  timeS: number;
}

/**
 * Photon pairs generated from vacuum by a boundary modulated at 2ω with
 * depth ε for time t (single-mode parametric approximation):
 *   r_eff = ε·ω·t/2,  ⟨n⟩ = sinh²(r_eff)
 * The generated photons are exactly the |v|² Bogoliubov coefficient — the
 * operator-level basis of the ZPE extraction claims.
 */
export function dcePhotonNumber(epsilon: number, omegaRadS: number, timeS: number): DcePhotons {
  const rEff = (epsilon * omegaRadS * timeS) / 2;
  const s = Math.sinh(rEff);
  return { rEff, meanPhotons: s * s, epsilon, omegaRadS, timeS };
}

// ── Squeezed compression state per Ψ channel ──────────────────────────────────

export interface LambdaSqueezed {
  wdm: number;
  nm: number;
  frequencyHz: number;
  r: number;
  lambdaZpeKg: number;      // Λ₀ = hf/2c² — zero-point compression state
  lambdaSqueezedKg: number; // Λ_B = Λ₀·cosh(2r)   (⟨n⟩+½ = cosh(2r)/2)
  gainFactor: number;       // cosh(2r)
}

/**
 * Squeezed compression state of a Ψ channel.
 * Bare vacuum (r = 0): Λ_B = Λ₀ = hf/2c² (the ½ħω zero-point term).
 * Squeezing raises the channel's effective compression state hyperbolically —
 * the dynamic counterpart to the geometric Berry correction Λ_geo = Λ·cos(γ).
 */
export function lambdaSqueezed(wdm: number, r: number): LambdaSqueezed {
  const w = Math.max(0, Math.min(WDM_CHANNELS - 1, Math.round(wdm)));
  const nm = NM_MIN + w * ((NM_MAX - NM_MIN) / (WDM_CHANNELS - 1));
  const frequencyHz = C_LIGHT / (nm * 1e-9);
  const lambdaZpeKg = (H_PLANCK * frequencyHz) / (2 * C_LIGHT * C_LIGHT);
  const gainFactor = Math.cosh(2 * r);
  return {
    wdm: w, nm, frequencyHz, r,
    lambdaZpeKg,
    lambdaSqueezedKg: lambdaZpeKg * gainFactor,
    gainFactor,
  };
}
