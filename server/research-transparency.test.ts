import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { RESEARCH_EVIDENCE } from "../shared/research-evidence";
import { RESEARCH_PAGE_META, researchPageMeta } from "../shared/research-page-meta";
import { ROUTE_META } from "./seo-meta";

describe("research transparency metadata", () => {
  it.each(RESEARCH_EVIDENCE)("keeps Act $act server/browser descriptions aligned", entry => {
    const expected = researchPageMeta(entry.route)!;
    expect(ROUTE_META[entry.route].description).toBe(expected.description);
    expect(ROUTE_META[entry.route].ogDescription).toBe(expected.description);
    expect(ROUTE_META[entry.route].twitterDescription).toBe(expected.description);
    expect(ROUTE_META[entry.route].bodyHtml).toContain(entry.limitation.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;"));
  });

  it.each(Object.keys(RESEARCH_PAGE_META))("aligns %s page and preview metadata", path => {
    const expected = researchPageMeta(path)!;
    expect(ROUTE_META[path].title).toBe(expected.title);
    expect(ROUTE_META[path].description).toBe(expected.description);
    expect(ROUTE_META[path].bodyHtml).toContain("/research-transparency");
    expect(JSON.stringify(ROUTE_META[path].jsonLd)).toContain(expected.description);
  });

  it("handles canonical URLs, aliases, query strings and trailing slashes", () => {
    expect(researchPageMeta("https://wnsp.io/wnsp/?source=test#example")).toEqual(researchPageMeta("/wnsp"));
    expect(researchPageMeta("/hub")).toEqual(researchPageMeta("/"));
    expect(researchPageMeta("/photonic-ledger")).toEqual(researchPageMeta("/blockchain"));
    expect(researchPageMeta("/wallet")).toBeUndefined();
  });

  it("registers the transparency page in the public router", () => {
    const source = readFileSync("client/src/App.tsx", "utf8");
    const publicRouter = source.slice(source.indexOf("function Router()"));
    expect(publicRouter).toContain('<Route path="/research-transparency" component={ResearchTransparencyPage} />');
    expect(source.slice(source.indexOf("function ProtectedRoutes()"), source.indexOf("function Router()")))
      .not.toContain('<Route path="/research-transparency"');
  });

  it("retains qualified hardware measurements without product-readiness schema", () => {
    expect(ROUTE_META["/hardware-spec"].bodyHtml).toContain("61.99");
    expect(ROUTE_META["/hardware-spec"].bodyHtml).toContain("400/255");
    expect(JSON.stringify(ROUTE_META["/hardware-spec"].jsonLd)).not.toContain('"@type":"Product"');
  });
});
