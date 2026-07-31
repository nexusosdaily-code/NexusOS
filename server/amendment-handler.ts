/**
 * amendment-handler.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Standalone POST handler for /api/constitution/amendments.
 *
 * Extracted from routes.ts so it can be imported directly by tests, eliminating
 * the risk of the test mirror silently drifting from the real implementation.
 *
 * Guards (in order):
 *   1. authenticate middleware  — enforced in routes.ts before this is called
 *   2. Band authority check     — USER-band account       → 403
 *   3. Per-user rate limit      — >5 amendments/24h       → 429
 *   4. Input validation         — blank / oversized fields → 400
 *   5. Happy path               — SYSTEM/KERNEL account   → 201
 */

import type { Request, Response } from "express";
import { deriveChannel, getBand, hasAuthority } from "./physics";
import { checkAmendmentRateLimit, AMENDMENT_MAX_PER_DAY } from "./amendment-rate-limit.js";

export async function amendmentHandler(req: Request, res: Response): Promise<void> {
  try {
    const user    = (req as any).user;
    const channel = deriveChannel(user.username);
    const band    = getBand(channel.wdm);

    if (!hasAuthority(channel.wdm, "KERNEL")) {
      res.status(403).json({
        error: `SYSTEM or KERNEL band required to mine an amendment block. Your band: ${band}`,
      });
      return;
    }

    // Per-user rate limit — max AMENDMENT_MAX_PER_DAY amendments per 24 hours
    if (!checkAmendmentRateLimit(user.id)) {
      res.status(429).json({
        error: `Amendment rate limit exceeded. Maximum ${AMENDMENT_MAX_PER_DAY} amendments per 24 hours.`,
      });
      return;
    }

    const { title, body } = req.body;
    if (!title || typeof title !== "string" || !title.trim()) {
      res.status(400).json({ error: "title is required" });
      return;
    }
    if (!body || typeof body !== "string" || !body.trim()) {
      res.status(400).json({ error: "body is required" });
      return;
    }
    if (title.trim().length > 200) {
      res.status(400).json({ error: "title must be 200 characters or fewer" });
      return;
    }
    if (body.trim().length > 4000) {
      res.status(400).json({ error: "body must be 4000 characters or fewer" });
      return;
    }

    const { mineAmendmentBlock } = await import("./constitution_seal");
    const result = await mineAmendmentBlock({
      title:          title.trim(),
      body:           body.trim(),
      authoredBand:   band,
      authorUsername: user.username,
      authorWdm:      channel.wdm,
      authorOam:      channel.oam,
      authorPol:      channel.pol,
    });

    res.status(201).json({
      blockNumber:  result.blockNumber,
      timestamp:    result.timestamp,
      title:        title.trim(),
      authoredBand: band,
      message:      "Amendment block mined successfully",
    });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to mine amendment block", message: err.message });
  }
}
