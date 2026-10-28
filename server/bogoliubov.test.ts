import { describe, it, expect } from "vitest";
import {
  HBAR,
  bogoliubovCoefficients,
  squeezedVacuum,
  bogoliubovDispersion,
  dcePhotonNumber,
  lambdaSqueezed,
} from "./bogoliubov";
import { H_PLANCK, C_LIGHT } from "./physics";

describe("Bogoliubov coefficients", () => {
  it("preserves the bosonic commutator: u² − v² = 1 for a range of r", () => {
    for (const r of [0, 0.1, 0.5, 1, 2, 5, -1, -3]) {
      const { invariant } = bogoliubovCoefficients(r);
      expect(invariant).toBeCloseTo(1, 9);
    }
  });

  it("r = 0 is the identity transformation (u=1, v=0)", () => {
    const { u, v } = bogoliubovCoefficients(0);
    expect(u).toBe(1);
    expect(v).toBe(0);
  });
});

describe("Squeezed vacuum", () => {
  it("mean photon number is sinh² r (= |v|²)", () => {
    for (const r of [0, 0.5, 1, 2]) {
      const sv = squeezedVacuum(r);
      const v = bogoliubovCoefficients(r).v;
      expect(sv.meanPhotons).toBeCloseTo(v * v, 9);
    }
  });

  it("no squeezing → 0 dB, vacuum variances ¼", () => {
    const sv = squeezedVacuum(0);
    expect(sv.squeezingDb).toBeCloseTo(0, 12);
    expect(sv.varSqueezed).toBeCloseTo(0.25, 12);
    expect(sv.varAntiSqueezed).toBeCloseTo(0.25, 12);
  });

  it("r ≈ 0.403 reproduces the 2025 foundry benchmark of ~3.5 dB squeezing", () => {
    const sv = squeezedVacuum(0.403);
    expect(sv.squeezingDb).toBeLessThan(-3.4);
    expect(sv.squeezingDb).toBeGreaterThan(-3.6);
  });

  it("uncertainty product stays exactly at the Heisenberg minimum 1/16", () => {
    for (const r of [0, 0.7, 1.5, 3]) {
      expect(squeezedVacuum(r).uncertaintyProduct).toBeCloseTo(1 / 16, 9);
    }
  });
});

describe("Bogoliubov quasiparticle dispersion", () => {
  // Rb-87-like parameters (the NXS-FIELD ghost node regime)
  const m = 1.443e-25;   // kg
  const gn = 1e-31;      // J (typical BEC interaction energy scale)

  it("long-wavelength limit is phonon-like: E ≈ ħ·c_s·k", () => {
    const xi = bogoliubovDispersion(1, gn, m).healingLengthM;
    const k = 0.001 / xi; // k·ξ ≪ 1
    const d = bogoliubovDispersion(k, gn, m);
    expect(d.energyJ / d.phononEnergyJ).toBeCloseTo(1, 4);
  });

  it("short-wavelength limit is free-particle-like: E ≈ ε_k", () => {
    const xi = bogoliubovDispersion(1, gn, m).healingLengthM;
    const k = 1000 / xi; // k·ξ ≫ 1
    const d = bogoliubovDispersion(k, gn, m);
    expect(d.energyJ / d.freeEnergyJ).toBeCloseTo(1, 4);
  });

  it("sound speed and healing length obey c_s·ξ = ħ/(√2·m)", () => {
    const d = bogoliubovDispersion(1e6, gn, m);
    expect(d.soundSpeedMs * d.healingLengthM).toBeCloseTo(HBAR / (Math.SQRT2 * m), 12);
  });

  it("non-interacting limit (gn → 0) collapses to the free dispersion (healing length → ∞)", () => {
    const d = bogoliubovDispersion(1e6, 0, m);
    expect(d.energyJ).toBeCloseTo(d.freeEnergyJ, 12);
    expect(d.healingLengthM).toBe(Infinity);
  });

  it("rejects non-physical inputs: m ≤ 0, gn < 0, non-finite values", () => {
    expect(() => bogoliubovDispersion(1e6, gn, 0)).toThrow(/mass/);
    expect(() => bogoliubovDispersion(1e6, gn, -1)).toThrow(/mass/);
    expect(() => bogoliubovDispersion(1e6, -1e-31, m)).toThrow(/unstable/);
    expect(() => bogoliubovDispersion(NaN, gn, m)).toThrow(/finite/);
  });
});

describe("Dynamical Casimir effect", () => {
  it("no boundary modulation → no photons from vacuum", () => {
    expect(dcePhotonNumber(0, 2 * Math.PI * 5e9, 1e-6).meanPhotons).toBe(0);
    expect(dcePhotonNumber(0.01, 2 * Math.PI * 5e9, 0).meanPhotons).toBe(0);
  });

  it("photon number equals sinh² of the effective squeezing", () => {
    const out = dcePhotonNumber(1e-4, 2 * Math.PI * 5e9, 1e-7);
    expect(out.rEff).toBeCloseTo((1e-4 * 2 * Math.PI * 5e9 * 1e-7) / 2, 12);
    expect(out.meanPhotons).toBeCloseTo(Math.sinh(out.rEff) ** 2, 12);
  });

  it("photon number grows monotonically with drive time", () => {
    const n1 = dcePhotonNumber(1e-4, 2 * Math.PI * 5e9, 1e-7).meanPhotons;
    const n2 = dcePhotonNumber(1e-4, 2 * Math.PI * 5e9, 2e-7).meanPhotons;
    expect(n2).toBeGreaterThan(n1);
  });
});

describe("Squeezed compression state Λ_B = Λ₀·cosh(2r)", () => {
  it("bare vacuum (r=0) gives the zero-point value Λ₀ = hf/2c²", () => {
    const out = lambdaSqueezed(128, 0);
    const expected = (H_PLANCK * out.frequencyHz) / (2 * C_LIGHT * C_LIGHT);
    expect(out.lambdaSqueezedKg).toBeCloseTo(expected, 60);
    expect(out.gainFactor).toBe(1);
  });

  it("Λ₀ is exactly half the full compression state Λ = hf/c²", () => {
    const out = lambdaSqueezed(0, 0);
    const lambdaFull = (H_PLANCK * out.frequencyHz) / (C_LIGHT * C_LIGHT);
    expect(out.lambdaZpeKg * 2).toBeCloseTo(lambdaFull, 60);
  });

  it("squeezing raises Λ_B monotonically and hyperbolically", () => {
    const a = lambdaSqueezed(52, 0.5);
    const b = lambdaSqueezed(52, 1.0);
    expect(b.lambdaSqueezedKg).toBeGreaterThan(a.lambdaSqueezedKg);
    expect(b.gainFactor).toBeCloseTo(Math.cosh(2), 9);
  });

  it("clamps WDM into the valid 0–255 channel range", () => {
    expect(lambdaSqueezed(-5, 0).wdm).toBe(0);
    expect(lambdaSqueezed(999, 0).wdm).toBe(255);
  });
});

// ── Two-mode Bogoliubov (v1.1) ────────────────────────────────────────────────

import { twoModeSqueezedVacuum, lambdaEntangled } from "./bogoliubov";

describe("twoModeSqueezedVacuum", () => {
  it("r=0 is the bare vacuum: no photons, no entanglement", () => {
    const t = twoModeSqueezedVacuum(0);
    expect(t.meanPhotonsPerMode).toBe(0);
    expect(t.entanglementEntropy).toBe(0);
    expect(t.logNegativity).toBe(0);
    expect(t.eprVarianceProduct).toBe(1);
  });

  it("mean photons per mode equals sinh²r", () => {
    const r = 0.8;
    const t = twoModeSqueezedVacuum(r);
    expect(t.meanPhotonsPerMode).toBeCloseTo(Math.sinh(r) ** 2, 12);
  });

  it("EPR variance product e^{-4r} drops below 1 for any r > 0 (entanglement witness)", () => {
    expect(twoModeSqueezedVacuum(0.1).eprVarianceProduct).toBeLessThan(1);
    expect(twoModeSqueezedVacuum(0.1).eprVarianceProduct).toBeCloseTo(Math.exp(-0.4), 12);
  });

  it("entanglement entropy matches (n̄+1)ln(n̄+1) − n̄·ln n̄ and grows with r", () => {
    const r = 1.0;
    const n = Math.sinh(r) ** 2;
    const expected = (n + 1) * Math.log(n + 1) - n * Math.log(n);
    expect(twoModeSqueezedVacuum(r).entanglementEntropy).toBeCloseTo(expected, 12);
    expect(twoModeSqueezedVacuum(2).entanglementEntropy).toBeGreaterThan(twoModeSqueezedVacuum(1).entanglementEntropy);
  });

  it("log-negativity is exactly 2r/ln2 ebits and is symmetric in ±r", () => {
    expect(twoModeSqueezedVacuum(0.5).logNegativity).toBeCloseTo(1 / Math.LN2, 12);
    expect(twoModeSqueezedVacuum(-0.5).logNegativity).toBeCloseTo(twoModeSqueezedVacuum(0.5).logNegativity, 12);
  });

  it("rejects non-finite r", () => {
    expect(() => twoModeSqueezedVacuum(NaN)).toThrow();
    expect(() => twoModeSqueezedVacuum(Infinity)).toThrow();
  });
});

describe("lambdaEntangled", () => {
  it("r=0: correlated term vanishes, joint Λ is the sum of zero-point states", () => {
    const e = lambdaEntangled(52, 10, 0);
    expect(e.correlatedLambdaKg).toBe(0);
    expect(e.jointLambdaKg).toBeCloseTo(e.a.lambdaZpeKg + e.b.lambdaZpeKg, 40);
    expect(e.entanglementEntropy).toBe(0);
  });

  it("joint Λ scales with cosh(2r) and the correlated term with sinh(2r)", () => {
    const r = 0.6;
    const e = lambdaEntangled(52, 10, r);
    expect(e.jointLambdaKg).toBeCloseTo((e.a.lambdaZpeKg + e.b.lambdaZpeKg) * Math.cosh(2 * r), 40);
    expect(e.correlatedLambdaKg).toBeCloseTo(Math.sqrt(e.a.lambdaZpeKg * e.b.lambdaZpeKg) * Math.sinh(2 * r), 40);
  });

  it("diagonal² − offdiagonal² invariant: for equal channels, (Λ₀·cosh)² − (Λ₀·sinh)² = Λ₀²", () => {
    const r = 1.2;
    const e = lambdaEntangled(30, 30, r);
    const diag = e.a.lambdaZpeKg * Math.cosh(2 * r);
    const off = e.a.lambdaZpeKg * Math.sinh(2 * r);
    expect(diag * diag - off * off).toBeCloseTo(e.a.lambdaZpeKg ** 2, 20);
  });

  it("clamps out-of-range WDM channels like lambdaSqueezed does", () => {
    const e = lambdaEntangled(-5, 99999, 0.3);
    expect(e.a.wdm).toBe(0);
    expect(e.b.wdm).toBeGreaterThan(0);
  });
});

// ── WLS SQZ opcode (0x15) ─────────────────────────────────────────────────────

import { compileWLS, runToHalt } from "./wnsp_vm";

describe("WLS squeeze() opcode", () => {
  it("compiles squeeze(r) to opcode 0x15 with the parsed r", () => {
    const ins = compileWLS("squeeze(0.35)");
    expect(ins[0].op).toBe(0x15);
    expect(ins[0].mnem).toBe("SQZ");
    expect(ins[0].squeezeR).toBeCloseTo(0.35, 12);
  });

  it("executes after TUNE and reports Λ_B with cosh(2r) gain for the tuned λ", () => {
    const res = runToHalt("tune(542.5nm)\nsqueeze(0.35)", 0);
    const line = res.output.find(o => o.text.startsWith("SQZ"));
    expect(line).toBeDefined();
    expect(line!.text).toContain("λ=542.5nm");
    expect(line!.text).toContain(`cosh(2r)=${Math.cosh(0.7).toFixed(4)}`);
    expect(res.halted).toBe(true);
  });

  it("clamps r to [-10, 10] at execution and accepts negative r", () => {
    const res = runToHalt("squeeze(-9999)", 0);
    const line = res.output.find(o => o.text.startsWith("SQZ"))!;
    expect(line.text).toContain(`cosh(2r)=${Math.cosh(20).toFixed(4)}`); // clamped to -10 → cosh(-20)=cosh(20)
  });

  it("does not mutate registers, agents, or persistent state", () => {
    const res = runToHalt("@store k := v\nsqueeze(1)\nsqueeze(2)", 0);
    expect(res.stateDelta).toEqual({ k: "v" });
    expect(res.registers).toEqual([]);
    expect(res.agents).toEqual([]);
  });
});
