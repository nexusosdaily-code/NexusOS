import { describe, expect, it } from "vitest";
import { injectMeta, resolveMeta } from "./seo-meta";

const squeezed = resolveMeta("wnsp.io", "/the-squeezed-state")!;
const bogoliubov = resolveMeta("wnsp.io", "/the-bogoliubov-transform")!;
const summaries = (meta: typeof squeezed) => [
  meta.description, meta.ogDescription!, meta.twitterDescription!,
  (meta.jsonLd as { description: string }).description,
];

describe("Act 19 crawler and social explanations", () => {
  it.each(summaries(squeezed))("separates number statistics from quadrature squeezing: %s", (text) => {
    expect(text).toMatch(/super-Poissonian/i);
    expect(text).toMatch(/non-negative Gaussian Wigner|does not imply Wigner negativity/i);
    expect(text).toMatch(/proposed|hypothes/i);
  });

  it("does not label squeezed vacuum as sub-Poissonian or two-mode by default", () => {
    expect(squeezed.title).not.toMatch(/sub-Poissonian/i);
    expect(JSON.stringify(squeezed.jsonLd)).not.toMatch(/sub-Poissonian/i);
    expect(squeezed.bodyHtml).not.toContain("Q-parameter &lt; 0 for squeezed vacuum");
    expect(squeezed.ogDescription).not.toContain("S(ξ)|0⟩ two-mode");
    expect(squeezed.bodyHtml).toContain("Var(n)=2n̄(n̄+1)");
    expect(squeezed.bodyHtml).toContain("Mandel Q=2n̄+1&gt;0");
    expect(squeezed.bodyHtml).toContain("At r=0, Q is undefined");
    expect(squeezed.bodyHtml).toContain("depending on displacement and squeezing angle");
    expect(squeezed.bodyHtml).toContain("negativity requires a non-Gaussian state");
  });
});

describe("Act 20 crawler and social explanations", () => {
  it.each(summaries(bogoliubov))("distinguishes pure and reduced states and drive energy: %s", (text) => {
    expect(text).toMatch(/pure/i);
    expect(text).toMatch(/thermal reduced/i);
    expect(text).toMatch(/external|externally/i);
    expect(text).toMatch(/hypothes/i);
  });

  it("does not infer thermality or vacuum power from an occupation number", () => {
    expect(bogoliubov.bodyHtml).not.toContain("the b-mode sees a thermal state");
    expect(bogoliubov.bodyHtml).not.toContain("Vacuum mixing alone generates");
    expect(bogoliubov.bodyHtml).toContain("A mean occupation alone does not determine a state's temperature");
    expect(bogoliubov.bodyHtml).toContain("Tracing out one partner");
    expect(bogoliubov.bodyHtml).toContain("Var(n)=n̄(n̄+1)");
    expect(bogoliubov.bodyHtml).toContain("not free energy extracted from an undriven vacuum");
    expect(bogoliubov.bodyHtml).toContain("work done by a time-dependent boundary drive");
  });
});

describe("Actual metadata injection", () => {
  it.each(["/the-squeezed-state", "/the-bogoliubov-transform"])(
    "serves corrected metadata, structured data and noscript content for %s", (path) => {
      const meta = resolveMeta("wnsp.io", path)!;
      const html = injectMeta("<html><head></head><body><div id=\"root\"></div></body></html>", "wnsp.io", path);
      expect(html).toContain(meta.description);
      expect(html).toContain(meta.ogDescription);
      expect(html).toContain(meta.twitterDescription);
      const structuredData = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
      expect(structuredData).not.toBeNull();
      expect(JSON.parse(structuredData![1])).toEqual(meta.jsonLd);
      expect(html).toContain(meta.bodyHtml);
      expect(html).toContain(`https://wnsp.io${path}`);
      expect((meta.jsonLd as { datePublished: string }).datePublished).toBe("2026-07-21");
    },
  );
});
