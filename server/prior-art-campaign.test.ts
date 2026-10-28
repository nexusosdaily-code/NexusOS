import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { PRIOR_ART_CLAIMS, PRIOR_ART_CAMPAIGN_SLOTS, BREAKTHROUGH_CAMPAIGN_SLOTS } from "./prior-art-campaign";

describe("prior-art announcements", () => {
  it("includes every numbered claim in the source register, with its current title", () => {
    const register = readFileSync(new URL("../PRIOR_ART.md", import.meta.url), "utf8");
    const index = [...register.matchAll(/^\| \[(\d+)\]\(#claim-\d+\) \| (.*?) \|/gm)];
    expect(index.map((match) => Number(match[1]))).toEqual(
      Array.from({ length: PRIOR_ART_CLAIMS.length }, (_, i) => i + 1),
    );
    expect(index.map((match) => match[2])).toEqual([...PRIOR_ART_CLAIMS]);

    const announced = PRIOR_ART_CAMPAIGN_SLOTS.flatMap((slot) =>
      [...slot.telegram.matchAll(/^#(\d+) — /gm)].map((match) => Number(match[1])),
    );
    expect(announced).toEqual(index.map((match) => Number(match[1])));
    for (const slot of PRIOR_ART_CAMPAIGN_SLOTS) {
      expect(slot.telegram.length).toBeLessThan(4096);
      expect(slot.nostr.length).toBeLessThan(4096);
      expect(slot.telegram).toContain("not</b> independently verified");
    }
  });

  it("keeps all new campaign slot IDs distinct and within Telegram's size limit", () => {
    const slots = [...PRIOR_ART_CAMPAIGN_SLOTS, ...BREAKTHROUGH_CAMPAIGN_SLOTS];
    expect(new Set(slots.map((slot) => slot.id)).size).toBe(slots.length);
    expect(slots.every((slot) => slot.id > 16)).toBe(true);
    expect(slots.every((slot) => slot.telegram.length <= 4096)).toBe(true);
  });
});