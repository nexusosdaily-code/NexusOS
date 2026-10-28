import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { CE_TABLE } from "../shared/wnsp-model";
import { PROJECT_DESCRIPTION, PROJECT_DISTINCTION, PROJECT_FOCUS, PROJECT_HORIZON, PROJECT_EVIDENCE_PRINCIPLE, PRIORITY_BOUNDARY, RELATED_WORK } from "../shared/research-positioning";
import { researchPageMeta } from "../shared/research-page-meta";
import { ROUTE_META } from "./seo-meta";

const comparison = readFileSync("docs/WAVELENGTHSCRIPT_POSITIONING.md", "utf8");
const normalize = (text: string) => text.replace(/^>\s?/gm, "").replace(/\s+/g, " ").trim();

describe("sourced spectral-coordinate positioning", () => {
  it.each(["/", "/hub", "/wavelength-lang", "/blockchain", "/photonic-ledger", "/wnsp", "/research-transparency"])(
    "keeps the longstanding product focus and future evidence boundaries visible to crawlers on %s", path => {
      const html = ROUTE_META[path].bodyHtml!;
      expect(html).toContain(PROJECT_FOCUS);
      expect(html).toContain(PROJECT_HORIZON);
      expect(html).toContain(PROJECT_EVIDENCE_PRINCIPLE);
      expect(html).toContain('href="https://wnsp.io/wavelength-lang"');
      expect(html).toContain('href="https://wnsp.io/blockchain"');
      expect(ROUTE_META[path].title).not.toMatch(/Physics-Based Civilization OS|photonic research/i);
    },
  );

  it.each(["hub", "wavelength-lang", "blockchain", "wnsp-landing", "research-transparency"])(
    "keeps the visible direction integrated on the %s page", page => {
      expect(readFileSync(`client/src/pages/${page}.tsx`, "utf8")).toContain("<ProjectDirection />");
    },
  );
  it.each(["README.md", "docs/RESEARCH_STATUS.md", "docs/WAVELENGTHSCRIPT_POSITIONING.md"])(
    "uses the same recommended description in %s", path => {
      expect(normalize(readFileSync(path, "utf8"))).toContain(PROJECT_DESCRIPTION);
    },
  );

  it("documents examples that match the actual character table without claiming Unicode uniqueness", () => {
    expect(CE_TABLE).toHaveLength(128);
    expect(CE_TABLE[65]).toBe(583.125);
    expect(CE_TABLE[66]).toBe(586.25);
    expect(CE_TABLE[127]).toBe(776.875);
    expect(193 % CE_TABLE.length).toBe(65);
    for (const text of ["583.125", "586.250", "776.875", "Á", "not lossless", "not interchangeable"]) {
      expect(comparison).toContain(text);
    }
  });

  it("preserves source citations and priority boundaries in crawler-visible content", () => {
    const html = ROUTE_META["/research-transparency"].bodyHtml!;
    expect(html).toContain(PROJECT_DISTINCTION);
    expect(html).toContain(PRIORITY_BOUNDARY);
    expect(RELATED_WORK).toHaveLength(5);
    for (const work of RELATED_WORK) {
      expect(comparison).toContain(work.url);
      expect(html).toContain(work.url);
      expect(html).toContain(work.title);
    }
    expect(comparison).toContain("gateway-mediated interoperability");
    expect(comparison).toContain("Native photonic execution");
    expect(comparison).toContain("Direct optical interoperability");
  });

  it.each(["/", "/research-transparency", "/wnsp", "/wavelength-lang"])(
    "does not restore an unsupported priority claim in %s previews", path => {
      const meta = researchPageMeta(path)!;
      expect(meta.description).toContain("historical priority");
      expect(meta.description).not.toMatch(/world.?s first|the first language/i);
    },
  );

  it("replaces the misleading visible language and protocol marketing claims", () => {
    const language = readFileSync("client/src/pages/wavelength-lang.tsx", "utf8");
    const protocol = readFileSync("client/src/pages/wnsp-landing.tsx", "utf8");
    expect(language).not.toContain("The first language where every symbol");
    expect(language).not.toContain("Code doesn't run on a CPU");
    expect(language).not.toContain("Every symbol has a physical wavelength address in light.");
    expect(protocol).not.toContain("Each character is encoded to a unique wavelength");
    expect(protocol).not.toContain("No rewrite required");
    expect(language).toContain("A language for spectral-coordinate software.");
  });
});
