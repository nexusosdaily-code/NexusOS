/**
 * NexusOS Bogoliubov Module v1.1 — PUBLIC (disclosure freeze lifted 2026-08-08)
 * ════════════════════════════════════════════════════════════════════════════
 * Bogoliubov transformation mathematics for the WNSP formalism.
 *   b = u·a + v·a†,  u = cosh r, v = sinh r,  |u|² − |v|² = 1  (bosonic)
 *
 * Covers: squeezed vacuum (Kerr microresonator regime — PHR-1 relevant),
 * quasiparticle dispersion (superfluids of light), dynamical Casimir effect
 * (operator-level ZPE formalism), the squeezed compression state
 * Λ_B(r) = Λ₀ · cosh(2r) per Ψ channel, and (v1.1) the two-mode Bogoliubov
 * transform: entangled compression state pairs across two Ψ channels.
 *
 * Publicly disclosed: Act 20 §6b (/the-bogoliubov-transform), PRIOR_ART.md
 * Claims 36–39. Exposed via GET /api/physics/squeezed and the WLS `squeeze()`
 * opcode. See docs/research/BOGOLIUBOV_WNSP.md for the working document.
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

// ── Two-mode Bogoliubov transform (v1.1) ──────────────────────────────────────
// S₂(r) = exp(r(â·b̂ − â†·b̂†)) — the entanglement generator. Its output is the
// two-mode squeezed vacuum: pairwise-correlated photons across two modes.

export interface TwoModeSqueezedVacuum {
  r: number;
  meanPhotonsPerMode: number;   // ⟨n_a⟩ = ⟨n_b⟩ = sinh² r
  photonNumberCorrelation: number; // ⟨n_a·n_b⟩ − ⟨n_a⟩⟨n_b⟩ = sinh²r·cosh²r (perfect pairing)
  eprVarianceProduct: number;   // Δ(X_a−X_b)²·Δ(P_a+P_b)² normalised — e^{−4r}; <1 ⇒ EPR-entangled
  entanglementEntropy: number;  // S = (n̄+1)ln(n̄+1) − n̄·ln n̄  (nats) — 0 iff r = 0
  logNegativity: number;        // E_N = 2r/ln 2 (ebits) — exact for TMSV
}

/**
 * Two-mode squeezed vacuum |TMSV⟩ = S₂(r)|0,0⟩ — the canonical EPR-entangled
 * Gaussian state. Each mode alone looks thermal (n̄ = sinh²r); jointly the
 * modes are perfectly photon-number-correlated. Entanglement measures are
 * exact closed forms for this state.
 */
export function twoModeSqueezedVacuum(r: number): TwoModeSqueezedVacuum {
  if (!Number.isFinite(r)) throw new Error("twoModeSqueezedVacuum: r must be a finite number");
  const ra = Math.abs(r);
  const s = Math.sinh(ra);
  const c = Math.cosh(ra);
  const nBar = s * s;
  const entropy = nBar === 0 ? 0 : (nBar + 1) * Math.log(nBar + 1) - nBar * Math.log(nBar);
  return {
    r,
    meanPhotonsPerMode: nBar,
    photonNumberCorrelation: s * s * c * c,
    eprVarianceProduct: Math.exp(-4 * ra),
    entanglementEntropy: entropy,
    logNegativity: (2 * ra) / Math.LN2,
  };
}

export interface LambdaEntangled {
  r: number;
  a: LambdaSqueezed;            // channel A squeezed compression state
  b: LambdaSqueezed;            // channel B squeezed compression state
  jointLambdaKg: number;        // Λ_pair = (Λ₀ᴬ + Λ₀ᴮ)·cosh(2r) — joint compression state
  correlatedLambdaKg: number;   // Λ_corr = √(Λ₀ᴬ·Λ₀ᴮ)·sinh(2r) — the off-diagonal (entangling) term
  entanglementEntropy: number;  // nats, per twoModeSqueezedVacuum
  logNegativity: number;        // ebits
}

/**
 * Entangled compression state pair across two Ψ channels.
 * Two-mode squeezing raises both channels' compression states together
 * (diagonal, cosh(2r)) and creates a shared correlated term (off-diagonal,
 * sinh(2r)) that belongs to neither channel alone — the compression-state
 * expression of entanglement. At r = 0 the correlated term vanishes and the
 * channels revert to independent zero-point states.
 */
export function lambdaEntangled(wdmA: number, wdmB: number, r: number): LambdaEntangled {
  const a = lambdaSqueezed(wdmA, r);
  const b = lambdaSqueezed(wdmB, r);
  const tmsv = twoModeSqueezedVacuum(r);
  return {
    r,
    a,
    b,
    jointLambdaKg: (a.lambdaZpeKg + b.lambdaZpeKg) * Math.cosh(2 * r),
    correlatedLambdaKg: Math.sqrt(a.lambdaZpeKg * b.lambdaZpeKg) * Math.sinh(2 * Math.abs(r)),
    entanglementEntropy: tmsv.entanglementEntropy,
    logNegativity: tmsv.logNegativity,
  };
}
