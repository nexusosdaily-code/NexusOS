import { describe, expect, it } from "vitest";
import { ROUTE_META } from "./seo-meta";

describe("public live guide disclosure metadata", () => {
  it("provides a shareable canonical guide without claiming universal support", () => {
    const guide = ROUTE_META["/live-guide"];
    expect(guide.canonical).toBe("https://wnsp.io/live-guide");
    expect(guide.ogType).toBe("article");
    expect(guide.bodyHtml).toContain("iPhone Chrome");
    expect(guide.bodyHtml).toContain("iPhone Chrome → Samsung Chrome");
    expect(guide.bodyHtml).toContain("iPhone Safari to iPad Safari");
    expect(guide.bodyHtml).toContain("All four physical-device tests passed with live video and audio");
    expect(guide.bodyHtml).toContain("subsequent retests passed with live video and audio");
    expect(guide.bodyHtml).not.toContain("failure remains unresolved");
    expect(guide.bodyHtml).toContain("do not guarantee every browser, carrier or network");
    expect(guide.bodyHtml).toContain("Audio and front/rear camera switching were not separately reported");
    expect(guide.bodyHtml).toContain("no TURN relay fallback");
  });

  it("keeps the public fallback instructions consistent with private live consent", () => {
    const body = ROUTE_META["/live-guide"].bodyHtml!;
    for (const phrase of ["separate accounts", "Browse directory", "Camera", "Join live", "Enable sound", "separate permissions"]) {
      expect(body).toContain(phrase);
    }
    expect(body).not.toContain("guaranteed delivery");
  });
});
