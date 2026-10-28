import { describe, it, expect } from "vitest";
import crypto from "node:crypto";
import {
  encodeVMName, accountWavelength, opticalBinWdm, ledgerWdm, CE_TABLE,
  TOTAL_CHANNELS, MAPPING_PROFILES, C_LIGHT, H_PLANCK,
} from "../shared/wnsp-model";
import { ceEncode, compileWLS, runToHalt } from "./wnsp_vm";
import { deriveChannel } from "./physics";
import { RESEARCH_EVIDENCE } from "../shared/research-evidence";
import { ROUTE_META } from "./seo-meta";
import { findAnswer } from "./guide-knowledge";

describe("Versioned WNSP mapping conformance", () => {
  it("distinguishes the 128-entry table from the 256-index namespace", () => {
    expect(TOTAL_CHANNELS).toBe(51_200);
    expect(CE_TABLE).toHaveLength(128);
    expect(CE_TABLE[127]).toBe(776.875);
    expect(CE_TABLE[1] - CE_TABLE[0]).toBe(3.125);
    expect(Object.isFrozen(CE_TABLE)).toBe(true);
    expect(new Set(Object.values(MAPPING_PROFILES)).size).toBe(4);
    expect(accountWavelength(255)).toBe(780);
    expect(accountWavelength(1) - accountWavelength(0)).toBeCloseTo(400 / 255);
    expect(opticalBinWdm(381.5625)).toBe(1);
    expect(opticalBinWdm(780)).toBe(255);
    expect(ledgerWdm(CE_TABLE[127])).toBe(127);
  });

  it.each(["", "Nexus", "wave register", "😀", "漢字", "ABC", "\u0000", "~"])(
    "keeps browser/shared and canonical VM naming aligned for %j", name => {
      const shared = encodeVMName(name);
      expect(ceEncode(name)).toEqual({ nm: shared.nm, psi: shared.psi, band: shared.band });
      expect(shared.nm).toBeGreaterThanOrEqual(380);
      expect(shared.nm).toBeLessThanOrEqual(780);
      expect(shared.oam).toBeGreaterThanOrEqual(0);
      expect(shared.oam).toBeLessThan(50);
      expect(shared.psi).not.toContain("NaN");
    },
  );

  it("preserves the issued account wavelength calculation", () => {
    const name = "conformance-compatibility-example";
    const bytes = crypto.createHash("sha256").update(name).digest();
    const channel = deriveChannel(name);
    expect(channel.wdm).toBe(bytes[0]);
    expect(channel.nm).toBe(380 + bytes[0] * (400 / 255));
    expect(channel.frequencyHz).toBe(C_LIGHT / (channel.nm * 1e-9));
    expect(channel.energyJ).toBe(H_PLANCK * channel.frequencyHz);
    expect(channel.lambdaKg).toBe(channel.energyJ / C_LIGHT ** 2);
  });

  it.each([NaN, Infinity, -Infinity])("rejects non-finite wavelength/index %s", value => {
    expect(() => accountWavelength(value)).toThrow();
    expect(() => ledgerWdm(value)).toThrow();
    expect(() => opticalBinWdm(value)).toThrow();
  });

  it.each([-1, 256, 1.5])("rejects invalid account index %s", value => {
    expect(() => accountWavelength(value)).toThrow();
  });
});

describe("WNSP execution commit point", () => {
  it("compiles and runs store/load instructions through HALT", () => {
    const source = '@store result := "current"\n@load result';
    expect(compileWLS(source).map(i => i.mnem)).toEqual(["STORE", "LOAD", "HALT"]);
    const result = runToHalt(source, 0, { result: "previous" });
    expect(result.halted).toBe(true);
    expect(result.truncated).toBe(false);
    expect(result.stateDelta.result).toBe("current");
    expect(result.output.some(o => o.text.startsWith("LOAD  result") && o.text.includes("current"))).toBe(true);
  });

  it("does not return actionable partial state or transfers when cycle-capped", () => {
    const source = '@store partial := 7\ntransfer_nxt("sample", "2")\n' +
      Array.from({ length: 2_049 }, () => "x").join("\n");
    const result = runToHalt(source, 0);
    expect(result.halted).toBe(false);
    expect(result.truncated).toBe(true);
    expect(result.cycleCount).toBe(2_048);
    expect(result.stateDelta).toEqual({});
    expect(result.effects).toEqual([]);
    expect(result.output.some(o => o.text.startsWith("TRUNCATED"))).toBe(true);
  });
});

describe("Scientific evidence consistency", () => {
  it("covers all 20 Acts and their public metadata", () => {
    expect(RESEARCH_EVIDENCE.map(e => e.act)).toEqual(Array.from({ length: 20 }, (_, i) => i + 1));
    for (const evidence of RESEARCH_EVIDENCE) {
      const meta = ROUTE_META[evidence.route];
      expect(meta, evidence.route).toBeTruthy();
      if (evidence.act <= 18) {
        expect(meta.description).toBe(`${evidence.proposal} ${evidence.limitation}`);
        expect(meta.bodyHtml).toContain("Evidence limits");
        expect(meta.bodyHtml).toContain("not independent experimental validation");
      }
    }
  });

  it("does not claim physics replaces cryptographic authentication", () => {
    const answer = findAnswer("maxwell validation").answer;
    expect(answer).toContain("SHA-256");
    expect(answer).toContain("does not authenticate");
  });

  it("labels hardware and nominal channel capacity honestly", () => {
    expect(findAnswer("snic").answer).toContain("have not been demonstrated");
    expect(findAnswer("51,200").answer).toContain("not measured simultaneous optical capacity");
    expect(ROUTE_META["/hardware-spec"].bodyHtml).toContain("400/255");
    expect(ROUTE_META["/hardware-spec"].bodyHtml).toContain("not optical throughput");
  });
});
