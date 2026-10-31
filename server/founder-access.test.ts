import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
const fixtures = vi.hoisted(() => ({
  sessions: new Map<string, any>(),
  getUserByUsername: vi.fn(), getUser: vi.fn(), createSession: vi.fn(),
  deleteSession: vi.fn(), getSessionByToken: vi.fn(),
  getWallet: vi.fn(), updateUserLastLogin: vi.fn(),
  getApiKeyByPrefix: vi.fn(), verifyApiKey: vi.fn(),
  createAuditLog: vi.fn(), mine: vi.fn(),
}));
vi.mock("./storage", () => ({ storage: fixtures }));
vi.mock("./constitution_seal", () => ({ mineAmendmentBlock: fixtures.mine }));
vi.mock("./physics", () => ({
  deriveChannel: () => ({ wdm: 52, oam: 3, pol: "V" }),
  getBand: () => "SYSTEM", hasAuthority: () => true,
}));
import { authenticate } from "./auth";
import { amendmentHandler } from "./amendment-handler";
import { blockFounderPasswordAccess, createFounderSessionToken, founderBtcLoginHandler, isFounderBtcSession } from "./founder-access";
import { HUMAN_LIFE_BODY, HUMAN_LIFE_DRAFT_ID, HUMAN_LIFE_TITLE } from "../shared/human-life-amendment";
import { _resetAmendmentRateLimit } from "./amendment-rate-limit";

const user = { id: "founder-test", username: "Nexus", role: "admin", isActive: true };
const payload = {
  draftId: HUMAN_LIFE_DRAFT_ID, approvedExactText: true,
  title: HUMAN_LIFE_TITLE, body: HUMAN_LIFE_BODY,
};
function response() {
  const res: any = {
    code: 200, body: undefined,
    status(code: number) { this.code = code; return this; },
    json(body: any) { this.body = body; return this; },
    cookie: vi.fn(),
  };
  return res;
}
function request(body: any = {}) {
  return { body, headers: {}, cookies: {}, ip: "test-ip" } as any;
}
beforeEach(() => {
  vi.clearAllMocks(); fixtures.sessions.clear(); _resetAmendmentRateLimit();
  // Synthetic credentials only. Never read or send the real environment secret.
  vi.stubEnv("BTC_INSCRIPTION_WALLET_WIF", "synthetic-btc-secret-not-a-real-key");
  vi.stubEnv("SESSION_SECRET", "synthetic-session-secret-not-a-real-credential");
  fixtures.getUserByUsername.mockImplementation(async name => name.toLowerCase() === "nexus" ? user : { ...user, username: "OrdinaryUser" });
  fixtures.getUser.mockResolvedValue(user);
  fixtures.getWallet.mockResolvedValue(undefined);
  fixtures.createSession.mockImplementation(async (userId, _ip, _ua, method) => {
    const token = method === "founder_btc" ? createFounderSessionToken() : "legacy-session";
    const session = { id: "session-test", userId, token, expiresAt: new Date(Date.now() + 10000) };
    fixtures.sessions.set(token, session);
    return session;
  });
  fixtures.getSessionByToken.mockImplementation(async token => fixtures.sessions.get(token));
  fixtures.mine.mockResolvedValue({ blockNumber: 99, timestamp: "2026-10-11T00:00:00Z" });
});
afterEach(() => vi.unstubAllEnvs());

describe("founder BTC access — real login guard and authenticate middleware", () => {
  it("never adopts an attacker-chosen session ID and rotates it on each successful login", async () => {
    const attacker = "attacker-chosen-session";
    const issued: string[] = [];
    for (let attempt = 0; attempt < 2; attempt++) {
      const req = request({
        wifKey: "synthetic-btc-secret-not-a-real-key",
        token: attacker, auth_token: attacker, sessionId: attacker,
      });
      req.cookies.auth_token = attacker;
      req.headers.cookie = `auth_token=${attacker}`;
      req.headers.authorization = `Bearer ${attacker}`;
      const res = response();
      await founderBtcLoginHandler(req, res);
      expect(res.code).toBe(200);
      const [name, token, options] = res.cookie.mock.calls[0];
      expect(name).toBe("auth_token");
      expect(token).not.toBe(attacker);
      expect(isFounderBtcSession(token)).toBe(true);
      expect(options).toMatchObject({ httpOnly: true, sameSite: "lax", path: "/" });
      expect(fixtures.sessions.has(token)).toBe(true);
      issued.push(token);
    }
    expect(new Set(issued).size).toBe(2);
    expect(fixtures.createSession).toHaveBeenCalledTimes(2);
    for (const call of fixtures.createSession.mock.calls) expect(call[3]).toBe("founder_btc");
  });

  it("cannot use an existing signed cookie to bypass BTC proof during login", async () => {
    const req = request({ wifKey: "wrong-secret" });
    req.cookies.auth_token = createFounderSessionToken();
    const res = response();
    await founderBtcLoginHandler(req, res);
    expect(res.code).toBe(401);
    expect(res.cookie).not.toHaveBeenCalled();
    expect(fixtures.createSession).not.toHaveBeenCalled();
  });
  it.each(["Nexus", "nexus", "NEXUS"])("blocks the repository password login for %s before issuing a session", async username => {
    const res = response(), next = vi.fn();
    await blockFounderPasswordAccess(request({ username, password: "repository-known-password" }), res, next);
    expect(res.code).toBe(403);
    expect(next).not.toHaveBeenCalled();
    expect(fixtures.createSession).not.toHaveBeenCalled();
  });

  it("does not change password login for ordinary accounts", async () => {
    const next = vi.fn();
    await blockFounderPasswordAccess(request({ username: "OrdinaryUser" }), response(), next);
    expect(next).toHaveBeenCalledOnce();
  });

  it.each([undefined, "", 123, "wrong-secret"])("rejects invalid BTC proof (%s) without a session or amendment", async wifKey => {
    const res = response();
    await founderBtcLoginHandler(request({ wifKey }), res);
    expect([400, 401]).toContain(res.code);
    expect(fixtures.createSession).not.toHaveBeenCalled();
    expect(fixtures.mine).not.toHaveBeenCalled();
  });

  it("fails closed when the BTC secret is unconfigured", async () => {
    vi.stubEnv("BTC_INSCRIPTION_WALLET_WIF", "");
    const res = response();
    await founderBtcLoginHandler(request({ wifKey: "anything" }), res);
    expect(res.code).toBe(503);
    expect(fixtures.createSession).not.toHaveBeenCalled();
  });

  it("rejects old password, Nostr and bot sessions through the real middleware", async () => {
    fixtures.sessions.set("legacy-session", { id: "old", token: "legacy-session", userId: user.id });
    const req = request(payload), res = response(), next = vi.fn();
    req.headers.authorization = "Bearer legacy-session";
    await authenticate(req, res, next);
    expect(res.code).toBe(401);
    expect(fixtures.deleteSession).toHaveBeenCalledWith("old");
    expect(next).not.toHaveBeenCalled();
    expect(fixtures.mine).not.toHaveBeenCalled();
  });

  it("verified BTC login authenticates the founder but cannot bypass independent review for adoption", async () => {
    const loginRes = response();
    await founderBtcLoginHandler(request({ wifKey: "synthetic-btc-secret-not-a-real-key" }), loginRes);
    expect(loginRes.code).toBe(200);
    expect(fixtures.createSession).toHaveBeenCalledWith(user.id, "test-ip", undefined, "founder_btc");
    const token = loginRes.cookie.mock.calls[0][1];
    expect(isFounderBtcSession(token)).toBe(true);
    expect(loginRes.body).not.toHaveProperty("token");
    expect(loginRes.cookie).toHaveBeenCalledWith("auth_token", token, expect.objectContaining({ httpOnly: true }));
    const req = request(payload), res = response(), next = vi.fn();
    req.cookies.auth_token = token;
    await authenticate(req, res, next);
    expect(next).toHaveBeenCalledOnce();
    await amendmentHandler(req, res);
    expect(res.code).toBe(403);
    expect(res.body.error).toContain("three signatures");
    expect(fixtures.mine).not.toHaveBeenCalled();
  });

  it("rejects tampered session provenance even if a stored session has that token", async () => {
    const token = createFounderSessionToken().slice(0, -1) + "z";
    fixtures.sessions.set(token, { id: "tampered", userId: user.id, token });
    const req = request(payload), res = response(), next = vi.fn();
    req.headers.authorization = `Bearer ${token}`;
    await authenticate(req, res, next);
    expect(res.code).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("rejects markerless changed draft text even after secure BTC authentication", async () => {
    const loginRes = response();
    await founderBtcLoginHandler(request({ wifKey: "synthetic-btc-secret-not-a-real-key" }), loginRes);
    const req = request({ title: HUMAN_LIFE_TITLE + " changed", body: HUMAN_LIFE_BODY + "\nChanged" });
    req.cookies.auth_token = loginRes.cookie.mock.calls[0][1];
    const res = response(), next = vi.fn();
    await authenticate(req, res, next);
    expect(next).toHaveBeenCalledOnce();
    await amendmentHandler(req, res);
    expect(res.code).toBe(400);
    expect(fixtures.mine).not.toHaveBeenCalled();
  });

  it("accepts a verified BTC session through the existing httpOnly cookie", async () => {
    const session = await fixtures.createSession(user.id, undefined, undefined, "founder_btc");
    const req = request(), next = vi.fn();
    req.cookies.auth_token = session.token;
    await authenticate(req, response(), next);
    expect(next).toHaveBeenCalledOnce();
  });

  it("rejects founder API-key access", async () => {
    fixtures.getApiKeyByPrefix.mockResolvedValue({ userId: user.id, keyHash: "fake" });
    fixtures.verifyApiKey.mockResolvedValue(true);
    const req = request(), res = response(), next = vi.fn();
    req.headers.authorization = "ApiKey synthetic-api-key";
    await authenticate(req, res, next);
    expect(res.code).toBe(403);
    expect(next).not.toHaveBeenCalled();
  });

  it("does not accept client-claimed BTC provenance without a verified session", async () => {
    const req = request({ ...payload, method: "founder_btc", btcVerified: true }), res = response();
    req.user = user;
    await amendmentHandler(req, res);
    expect(res.code).toBe(401);
    expect(fixtures.mine).not.toHaveBeenCalled();
  });

  it("keeps alternative-route guards and the seeder free of password restoration", () => {
    const routes = readFileSync("server/routes.ts", "utf8");
    const genesis = readFileSync("server/genesis_user.ts", "utf8");
    expect(routes).toContain('app.post("/api/auth/login", validateRequest(loginSchema), blockFounderPasswordAccess');
    expect(routes).toContain('app.post("/api/auth/recover", blockFounderPasswordAccess');
    expect(routes).toContain("Founder Nostr-key login is retired");
    expect(genesis).not.toContain("GENESIS_PASSWORD");
    expect(genesis).not.toContain("bcrypt");
    expect(genesis).toContain("passwordHash: FOUNDER_PASSWORD_DISABLED");
    expect(genesis).toContain("if (!isFounderBtcSession(session.token))");
  });
});
