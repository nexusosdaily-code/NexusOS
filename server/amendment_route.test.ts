/**
 * amendment_route.test.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Security-gate tests for POST /api/constitution/amendments.
 *
 * The route enforces three guards in order:
 *   1. authenticate middleware  — missing/invalid token  → 401
 *   2. Band authority check     — USER-band account      → 403
 *   3. Input validation         — blank/oversized fields → 400
 *   4. Happy path               — SYSTEM-band account    → 201
 *
 * Strategy: the handler is imported directly from server/amendment-handler.ts
 * so any change to the real implementation is automatically exercised here.
 *
 * Mocked modules
 *   ./auth              — authenticate: controls whether req.user is present
 *   ./physics           — deriveChannel / getBand / hasAuthority
 *   ./constitution_seal — mineAmendmentBlock (dynamic import inside the handler)
 *   ./db                — pool (pulled in transitively; stubbed to a no-op)
 */

import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  checkAmendmentRateLimit,
  _resetAmendmentRateLimit,
  AMENDMENT_MAX_PER_DAY,
} from "./amendment-rate-limit";

// ── Hoisted mock functions — defined before vi.mock factories run ─────────────
// vi.mock() calls are hoisted to the top of the compiled output, so any
// variables they reference must also be hoisted via vi.hoisted().  Plain
// `const` declarations are NOT hoisted and produce undefined references inside
// mock factories, causing the dynamic import in the handler to get a stale fn.
const {
  mockAuthenticate,
  mockDeriveChannel,
  mockGetBand,
  mockHasAuthority,
  mockMineAmendmentBlock,
} = vi.hoisted(() => ({
  mockAuthenticate:       vi.fn(),
  mockDeriveChannel:      vi.fn(),
  mockGetBand:            vi.fn(),
  mockHasAuthority:       vi.fn(),
  mockMineAmendmentBlock: vi.fn(),
}));

vi.mock("./auth", () => ({
  authenticate: mockAuthenticate,
  optionalAuth: vi.fn(),
  logAction:    vi.fn().mockResolvedValue(undefined),
}));

vi.mock("./physics", () => ({
  deriveChannel:             mockDeriveChannel,
  getBand:                   mockGetBand,
  hasAuthority:              mockHasAuthority,
  // Exports used elsewhere in routes.ts — not needed by the handler under test
  calcFee:                   vi.fn(),
  checkC0001:                vi.fn(),
  checkC0002:                vi.fn(),
  checkC0005:                vi.fn(),
  applyGovernanceParam:      vi.fn(),
  LIVE_BURNS:                {},
  LIVE_FEES:                 {},
  IHR_FLOOR_NXT:             0,
  NON_DOMINANCE_PCT:         0,
  GENESIS_EXECUTION_ADDRESS: "",
}));

vi.mock("./constitution_seal", () => ({
  mineAmendmentBlock:      mockMineAmendmentBlock,
  sealConstitution:        vi.fn(),
  computeConstitutionHash: vi.fn().mockReturnValue("a".repeat(64)),
  mapAmendmentRows:        vi.fn().mockReturnValue([]),
  getConstitutionSeal:     vi.fn().mockResolvedValue(null),
  CONSTITUTION_PSI:        "Ψ(52,20,H)", // check:allow-literal — vi.mock factory cannot import from the module it mocks
}));

// Stub DB so transitive imports from auth / storage don't open real connections
vi.mock("./db", () => ({
  pool: { query: vi.fn().mockResolvedValue({ rows: [] }), connect: vi.fn() },
  db:   {},
}));

// ── Real handler under test ───────────────────────────────────────────────────
// Imported directly so any change to the real implementation is automatically
// reflected here — no manual mirror to maintain.
import { amendmentHandler } from "./amendment-handler";

// ── Test helpers ──────────────────────────────────────────────────────────────

/** Minimal mock for the authenticate middleware. */
function makeAuthMiddleware(opts: {
  /** If null, the middleware returns 401 (no credentials). */
  user: { username: string; id: string; isActive: boolean } | null;
}) {
  // next is typed to return void | Promise<void> so we can await it.
  // Express itself never awaits next(), but our test pipeline must so that
  // amendmentHandler doesn't return before runRequest has resolved.
  return async (req: any, res: any, next: () => void | Promise<void>) => {
    const authHeader = req.headers?.authorization;
    const cookieToken = req.cookies?.auth_token;

    if (!authHeader && !cookieToken) {
      res.status(401).json({ error: "No authorization provided" });
      return;
    }

    if (opts.user === null) {
      res.status(401).json({ error: "Invalid or expired session" });
      return;
    }

    req.user = opts.user;
    await next(); // must await so amendmentHandler fully resolves before runRequest returns
  };
}

/**
 * Build a minimal mock response object.
 * Stores the last status code and JSON body so assertions can read them.
 */
function makeRes() {
  const res: any = {
    _status: 200,
    _body:   undefined,
    status(code: number) { res._status = code; return res; },
    json(body: unknown)  { res._body = body; return res; },
  };
  return res;
}

/**
 * Simulate the full request pipeline: authenticate → handler.
 * Returns the mock response after both have run.
 */
async function runRequest(opts: {
  authHeader?: string;
  cookieToken?: string;
  user?: { username: string; id: string; isActive: boolean } | null;
  body?: Record<string, unknown>;
}): Promise<{ status: number; body: any }> {
  const req: any = {
    headers: opts.authHeader ? { authorization: opts.authHeader } : {},
    cookies: opts.cookieToken ? { auth_token: opts.cookieToken } : {},
    body:    opts.body ?? {},
  };
  const res = makeRes();

  let settled = false;

  // Simulate authenticate middleware
  const user = opts.user !== undefined ? opts.user : null;
  await makeAuthMiddleware({ user })(req, res, async () => {
    settled = true;
    await amendmentHandler(req, res);
  });

  if (!settled) {
    // authenticate returned early (401)
  }

  return { status: res._status, body: res._body };
}

// ── Default channel stub for SYSTEM-band users ────────────────────────────────
// wdm=52 → SYSTEM band (0–63 range) per physics.ts BAND_RANGES
const SYSTEM_CHANNEL = { wdm: 52, oam: 20, pol: "H" };

// ── Test setup ────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();

  // Reset in-memory rate-limit state so each test starts with a clean slate
  _resetAmendmentRateLimit();

  // Default physics behaviour — can be overridden per test
  mockDeriveChannel.mockReturnValue(SYSTEM_CHANNEL);
  mockGetBand.mockReturnValue("SYSTEM");
  mockHasAuthority.mockReturnValue(true);

  // Default mine result
  mockMineAmendmentBlock.mockResolvedValue({
    blockNumber: 42,
    timestamp:   "2026-07-31T10:00:00.000Z",
  });
});

afterEach(() => {
  vi.clearAllMocks();
  _resetAmendmentRateLimit();
});

// ═══════════════════════════════════════════════════════════════════════════
// 1. Authentication guard — no token → 401
// ═══════════════════════════════════════════════════════════════════════════

describe("POST /api/constitution/amendments — authentication guard", () => {

  it("returns 401 when no Authorization header and no cookie are present", async () => {
    const { status, body } = await runRequest({
      // No authHeader, no cookieToken, no user
      body: { title: "Article VII", body: "Some amendment text." },
    });

    expect(status).toBe(401);
    expect(body).toHaveProperty("error");
  });

  it("returns 401 when Authorization header is present but token is invalid", async () => {
    const { status, body } = await runRequest({
      authHeader: "Bearer invalid-token-xyz",
      user: null, // simulate storage returning no session
      body: { title: "Article VII", body: "Some amendment text." },
    });

    expect(status).toBe(401);
    expect(body).toHaveProperty("error");
  });

  it("does not call mineAmendmentBlock when request is unauthenticated", async () => {
    await runRequest({
      body: { title: "Article VII", body: "Body text." },
    });

    expect(mockMineAmendmentBlock).not.toHaveBeenCalled();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 2. Band authority guard — USER-band → 403
// ═══════════════════════════════════════════════════════════════════════════

describe("POST /api/constitution/amendments — band authority guard", () => {

  it("returns 403 when the authenticated user is in the USER band", async () => {
    // wdm=150 → USER band (128–191)
    mockDeriveChannel.mockReturnValue({ wdm: 150, oam: 5, pol: "V" });
    mockGetBand.mockReturnValue("USER");
    mockHasAuthority.mockReturnValue(false);  // USER < KERNEL

    const { status, body } = await runRequest({
      authHeader: "Bearer valid-user-token",
      user: { username: "regularuser", id: "u1", isActive: true },
      body: { title: "Article VII", body: "Amendment body." },
    });

    expect(status).toBe(403);
    expect(body.error).toMatch(/SYSTEM or KERNEL band required/);
    expect(body.error).toMatch(/USER/);
  });

  it("returns 403 when the authenticated user is in the GUEST band", async () => {
    mockDeriveChannel.mockReturnValue({ wdm: 200, oam: 0, pol: "H" });
    mockGetBand.mockReturnValue("GUEST");
    mockHasAuthority.mockReturnValue(false);

    const { status, body } = await runRequest({
      authHeader: "Bearer guest-token",
      user: { username: "guestuser", id: "u2", isActive: true },
      body: { title: "Article VII", body: "Amendment body." },
    });

    expect(status).toBe(403);
    expect(body.error).toMatch(/SYSTEM or KERNEL band required/);
    expect(body.error).toMatch(/GUEST/);
  });

  it("the 403 error message includes the caller's actual band name", async () => {
    mockDeriveChannel.mockReturnValue({ wdm: 160, oam: 3, pol: "V" });
    mockGetBand.mockReturnValue("USER");
    mockHasAuthority.mockReturnValue(false);

    const { status, body } = await runRequest({
      authHeader: "Bearer token",
      user: { username: "someuser", id: "u3", isActive: true },
      body: { title: "T", body: "B" },
    });

    expect(status).toBe(403);
    // The band name returned by getBand must appear verbatim in the error
    expect(body.error).toContain("USER");
  });

  it("does not call mineAmendmentBlock when band authority is insufficient", async () => {
    mockDeriveChannel.mockReturnValue({ wdm: 150, oam: 5, pol: "V" });
    mockGetBand.mockReturnValue("USER");
    mockHasAuthority.mockReturnValue(false);

    await runRequest({
      authHeader: "Bearer token",
      user: { username: "regularuser", id: "u4", isActive: true },
      body: { title: "Article VII", body: "Body text." },
    });

    expect(mockMineAmendmentBlock).not.toHaveBeenCalled();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 3. Input validation — missing / empty / oversized fields → 400
// ═══════════════════════════════════════════════════════════════════════════

describe("POST /api/constitution/amendments — input validation", () => {

  const VALID_USER = { username: "nexus", id: "sys1", isActive: true };
  const AUTH       = { authHeader: "Bearer sys-token", user: VALID_USER };

  it("returns 400 when title is absent", async () => {
    const { status, body } = await runRequest({
      ...AUTH,
      body: { body: "Some body text." },
    });
    expect(status).toBe(400);
    expect(body.error).toBe("title is required");
  });

  it("returns 400 when title is an empty string", async () => {
    const { status, body } = await runRequest({
      ...AUTH,
      body: { title: "", body: "Some body text." },
    });
    expect(status).toBe(400);
    expect(body.error).toBe("title is required");
  });

  it("returns 400 when title is all whitespace", async () => {
    const { status, body } = await runRequest({
      ...AUTH,
      body: { title: "   ", body: "Some body text." },
    });
    expect(status).toBe(400);
    expect(body.error).toBe("title is required");
  });

  it("returns 400 when body is absent", async () => {
    const { status, body } = await runRequest({
      ...AUTH,
      body: { title: "Article VII" },
    });
    expect(status).toBe(400);
    expect(body.error).toBe("body is required");
  });

  it("returns 400 when body is an empty string", async () => {
    const { status, body } = await runRequest({
      ...AUTH,
      body: { title: "Article VII", body: "" },
    });
    expect(status).toBe(400);
    expect(body.error).toBe("body is required");
  });

  it("returns 400 when body is all whitespace", async () => {
    const { status, body } = await runRequest({
      ...AUTH,
      body: { title: "Article VII", body: "\t\n  " },
    });
    expect(status).toBe(400);
    expect(body.error).toBe("body is required");
  });

  it("returns 400 when title exceeds 200 characters", async () => {
    const { status, body } = await runRequest({
      ...AUTH,
      body: { title: "A".repeat(201), body: "Valid body text." },
    });
    expect(status).toBe(400);
    expect(body.error).toBe("title must be 200 characters or fewer");
  });

  it("returns 400 when body exceeds 4000 characters", async () => {
    const { status, body } = await runRequest({
      ...AUTH,
      body: { title: "Article VII", body: "B".repeat(4001) },
    });
    expect(status).toBe(400);
    expect(body.error).toBe("body must be 4000 characters or fewer");
  });

  it("accepts a title of exactly 200 characters (boundary — must not reject)", async () => {
    const { status } = await runRequest({
      ...AUTH,
      body: { title: "A".repeat(200), body: "Valid body text." },
    });
    expect(status).toBe(201);
  });

  it("accepts a body of exactly 4000 characters (boundary — must not reject)", async () => {
    const { status } = await runRequest({
      ...AUTH,
      body: { title: "Article VII", body: "B".repeat(4000) },
    });
    expect(status).toBe(201);
  });

  it("does not call mineAmendmentBlock when title is missing", async () => {
    await runRequest({
      ...AUTH,
      body: { body: "Valid body text." },
    });
    expect(mockMineAmendmentBlock).not.toHaveBeenCalled();
  });

  it("does not call mineAmendmentBlock when body is missing", async () => {
    await runRequest({
      ...AUTH,
      body: { title: "Article VII" },
    });
    expect(mockMineAmendmentBlock).not.toHaveBeenCalled();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 4. Happy path — SYSTEM-band account → 201
// ═══════════════════════════════════════════════════════════════════════════

describe("POST /api/constitution/amendments — SYSTEM-band success", () => {

  const SYSTEM_USER = { username: "nexus", id: "sys1", isActive: true };
  const AUTH        = { authHeader: "Bearer sys-token", user: SYSTEM_USER };

  beforeEach(() => {
    // SYSTEM band (wdm=52 ∈ [0,63])
    mockDeriveChannel.mockReturnValue(SYSTEM_CHANNEL);
    mockGetBand.mockReturnValue("SYSTEM");
    mockHasAuthority.mockReturnValue(true);
  });

  it("returns 201 with blockNumber and timestamp from mineAmendmentBlock", async () => {
    mockMineAmendmentBlock.mockResolvedValue({
      blockNumber: 99,
      timestamp:   "2026-07-31T12:00:00.000Z",
    });

    const { status, body } = await runRequest({
      ...AUTH,
      body: { title: "Article VII — Emergency Override", body: "Grants override authority." },
    });

    expect(status).toBe(201);
    expect(body.blockNumber).toBe(99);
    expect(body.timestamp).toBe("2026-07-31T12:00:00.000Z");
  });

  it("returns 201 with the trimmed title echoed back", async () => {
    const { status, body } = await runRequest({
      ...AUTH,
      body: { title: "  Article VII  ", body: "Valid body." },
    });

    expect(status).toBe(201);
    expect(body.title).toBe("Article VII");
  });

  it("returns 201 with authoredBand equal to the user's band", async () => {
    const { status, body } = await runRequest({
      ...AUTH,
      body: { title: "Article VII", body: "Valid body." },
    });

    expect(status).toBe(201);
    expect(body.authoredBand).toBe("SYSTEM");
  });

  it("returns 201 with message confirming successful mine", async () => {
    const { status, body } = await runRequest({
      ...AUTH,
      body: { title: "Article VII", body: "Valid body." },
    });

    expect(status).toBe(201);
    expect(body.message).toBe("Amendment block mined successfully");
  });

  it("calls mineAmendmentBlock with trimmed title, trimmed body, and correct author fields", async () => {
    await runRequest({
      ...AUTH,
      body: { title: "  Article VII  ", body: "  Override authority.  " },
    });

    expect(mockMineAmendmentBlock).toHaveBeenCalledTimes(1);
    const callArgs = mockMineAmendmentBlock.mock.calls[0][0];
    expect(callArgs.title).toBe("Article VII");
    expect(callArgs.body).toBe("Override authority.");
    expect(callArgs.authoredBand).toBe("SYSTEM");
    expect(callArgs.authorUsername).toBe("nexus");
    expect(callArgs.authorWdm).toBe(52);
    expect(callArgs.authorOam).toBe(20);
    expect(callArgs.authorPol).toBe("H");
  });

  it("KERNEL-band account also receives 201 (KERNEL ≥ KERNEL)", async () => {
    mockDeriveChannel.mockReturnValue({ wdm: 80, oam: 5, pol: "V" });
    mockGetBand.mockReturnValue("KERNEL");
    mockHasAuthority.mockReturnValue(true);  // KERNEL meets KERNEL requirement

    const { status, body } = await runRequest({
      ...AUTH,
      user: { username: "steward1", id: "k1", isActive: true },
      body: { title: "Fee Schedule Update", body: "Updates BASE_FEE to 150 sats." },
    });

    expect(status).toBe(201);
    expect(body.authoredBand).toBe("KERNEL");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 5. Error handling — mineAmendmentBlock throws → 500
// ═══════════════════════════════════════════════════════════════════════════

describe("POST /api/constitution/amendments — DB error handling", () => {

  const SYSTEM_USER = { username: "nexus", id: "sys1", isActive: true };
  const AUTH        = { authHeader: "Bearer sys-token", user: SYSTEM_USER };

  it("returns 500 when mineAmendmentBlock throws a DB error", async () => {
    mockMineAmendmentBlock.mockRejectedValue(new Error("DB: connection lost"));

    const { status, body } = await runRequest({
      ...AUTH,
      body: { title: "Article VII", body: "Valid body." },
    });

    expect(status).toBe(500);
    expect(body.error).toBe("Failed to mine amendment block");
    expect(body.message).toBe("DB: connection lost");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 6. Rate limiting — excess amendments → 429
//
// These tests exercise the REAL checkAmendmentRateLimit function imported
// from server/amendment-rate-limit.ts.  The in-memory state is reset in the
// global beforeEach / afterEach so each test starts with a clean counter.
// ═══════════════════════════════════════════════════════════════════════════

describe("POST /api/constitution/amendments — per-user rate limit", () => {

  const KERNEL_USER = { username: "steward1", id: "k1", isActive: true };
  const AUTH        = { authHeader: "Bearer kernel-token", user: KERNEL_USER };

  beforeEach(() => {
    // KERNEL band — passes the authority check
    mockDeriveChannel.mockReturnValue({ wdm: 80, oam: 5, pol: "V" });
    mockGetBand.mockReturnValue("KERNEL");
    mockHasAuthority.mockReturnValue(true);
  });

  it("returns 201 for each of the first 5 requests (within quota)", async () => {
    for (let i = 1; i <= AMENDMENT_MAX_PER_DAY; i++) {
      const { status } = await runRequest({
        ...AUTH,
        body: { title: `Amendment #${i}`, body: "Valid body." },
      });
      expect(status).toBe(201);
    }
  });

  it("returns 429 on the 6th request for the same user in the same window", async () => {
    // Exhaust the quota
    for (let i = 1; i <= AMENDMENT_MAX_PER_DAY; i++) {
      await runRequest({
        ...AUTH,
        body: { title: `Amendment #${i}`, body: "Valid body." },
      });
    }

    // 6th request must be rejected
    const { status, body } = await runRequest({
      ...AUTH,
      body: { title: "Amendment #6 — over limit", body: "Should be rejected." },
    });

    expect(status).toBe(429);
    expect(body.error).toMatch(/Amendment rate limit exceeded/);
    expect(body.error).toMatch(/5/); // max per day is visible in the message
  });

  it("does not call mineAmendmentBlock when the quota is exhausted", async () => {
    // Exhaust the quota
    for (let i = 1; i <= AMENDMENT_MAX_PER_DAY; i++) {
      await runRequest({
        ...AUTH,
        body: { title: `Amendment #${i}`, body: "Valid body." },
      });
    }
    vi.clearAllMocks(); // clear the 5 successful mine calls

    await runRequest({
      ...AUTH,
      body: { title: "Over limit", body: "Should be rejected." },
    });

    expect(mockMineAmendmentBlock).not.toHaveBeenCalled();
  });

  it("rate limit is per-user — a second user is not affected by the first user's quota", async () => {
    const OTHER_USER = { username: "steward2", id: "k2", isActive: true };

    // Exhaust quota for KERNEL_USER
    for (let i = 1; i <= AMENDMENT_MAX_PER_DAY; i++) {
      await runRequest({
        ...AUTH,
        body: { title: `Amendment #${i}`, body: "Valid body." },
      });
    }

    // OTHER_USER should still be allowed
    const { status } = await runRequest({
      authHeader: "Bearer other-token",
      user: OTHER_USER,
      body: { title: "Different user amendment", body: "Valid body." },
    });

    expect(status).toBe(201);
  });

  it("rate limit check fires after band authority is confirmed (not before)", async () => {
    // USER band — authority check should fire first and short-circuit
    // even if the rate limit is also exhausted
    for (let i = 1; i <= AMENDMENT_MAX_PER_DAY; i++) {
      checkAmendmentRateLimit(KERNEL_USER.id); // exhaust via direct calls
    }

    mockDeriveChannel.mockReturnValue({ wdm: 150, oam: 5, pol: "V" });
    mockGetBand.mockReturnValue("USER");
    mockHasAuthority.mockReturnValue(false);

    const { status } = await runRequest({
      ...AUTH,
      body: { title: "Article VII", body: "Body." },
    });

    // Must get 403, not 429 — authority check runs first.
    // mineAmendmentBlock must also not have been called.
    expect(status).toBe(403);
    expect(mockMineAmendmentBlock).not.toHaveBeenCalled();
  });
});
