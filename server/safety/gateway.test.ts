import { describe, expect, it, vi } from "vitest";
import { createPublicKey, sign } from "node:crypto";
import { requireSafetyPermit, safetyStatus, type GatewaySettings } from "./gateway";
import { signingBytes } from "./protocol";
import { createAuthorityApp } from "./authority-app";
import { fireEffects } from "../wnsp_vm";
import { fixture } from "./test-fixture";

function setup() {
  const f = fixture("founder-only");
  const key = f.keys.get("founder")!;
  const publicKey = createPublicKey(key).export({ type: "spki", format: "pem" }).toString();
  const settings: GatewaySettings = { url: "https://independent.example", publicKey, policyDigest: f.config.commissioning.policyDigest };
  const fetcher = vi.fn(async (_url: any, options: any) => {
    const payload = {
      request: JSON.parse(options.body), issuedAt: f.now(), expiresAt: f.now() + 5000,
      ...f.controller.check("operator", "contract1", "contract.run"), ...f.controller.checkpoint(),
    };
    return { ok: true, json: async () => ({ payload, signature: sign(null, signingBytes("authority", payload), key).toString("base64") }) } as Response;
  });
  return { ...f, settings, fetcher, key };
}
describe("external safety permission boundary", () => {
  it("fails closed when no independent authority has been configured", async () => {
    await expect(requireSafetyPermit("operator", "contract1", null)).rejects.toThrow(/commissioned/);
  });
  it("accepts only a live, signed, exact action receipt from the pinned authority", async () => {
    const f = setup(); await f.controller.initialise();
    await expect(requireSafetyPermit("operator", "contract1", f.settings, f.fetcher as typeof fetch, f.now)).resolves.toBeUndefined();
    await f.controller.submit(f.event(f.contain()));
    await expect(requireSafetyPermit("operator", "contract1", f.settings, f.fetcher as typeof fetch, f.now)).rejects.toThrow(/contained/);
  });
  it("rejects forged, replayed and redirected receipts, and an unavailable authority", async () => {
    const f = setup(); await f.controller.initialise();
    const captured = await (await f.fetcher("", { body: JSON.stringify({ nonce: "a".repeat(64), operator: "operator", resource: "contract1", capability: "contract.run" }) })).json();
    const replay = vi.fn(async () => ({ ok: true, json: async () => captured }) as Response);
    await expect(requireSafetyPermit("operator", "contract1", f.settings, replay as typeof fetch, f.now)).rejects.toThrow(/verification failed/);
    captured.payload.request.resource = "other";
    await expect(requireSafetyPermit("operator", "contract1", f.settings, replay as typeof fetch, f.now)).rejects.toThrow(/verified/);
    await expect(requireSafetyPermit("operator", "contract1", f.settings, vi.fn().mockRejectedValue(new Error("outage")), f.now)).rejects.toThrow(/verification failed/);
    expect(f.fetcher.mock.calls[0][1]).toBeDefined();
    await expect(requireSafetyPermit("operator", "contract1", { ...f.settings, url: "http://unsafe.example" }, f.fetcher as typeof fetch, f.now)).rejects.toThrow();
  });
  it("does not publish protection when settings are missing or partial", async () => {
    vi.stubEnv("SAFETY_AUTHORITY_URL", "");
    vi.stubEnv("SAFETY_AUTHORITY_PUBLIC_KEY", "");
    vi.stubEnv("SAFETY_POLICY_DIGEST", "");
    expect(await safetyStatus()).toMatchObject({ state: "unconfigured", independentAuthorityVerified: false, replacementEnabled: false });
    vi.stubEnv("SAFETY_AUTHORITY_URL", "https://independent.example");
    expect(await safetyStatus()).toMatchObject({ state: "unavailable", independentAuthorityVerified: false });
    vi.unstubAllEnvs();
  });
  it("refuses a correctly signed future-quorum permission while the founder is living", async () => {
    const f = setup(); await f.controller.initialise();
    const future = vi.fn(async (_url: any, options: any) => {
      const payload = {
        request: JSON.parse(options.body), issuedAt: f.now(), expiresAt: f.now() + 5000,
        ...f.controller.check("operator", "contract1", "contract.run"), ...f.controller.checkpoint(),
        governanceMode: "independent-review",
      };
      return { ok: true, json: async () => ({ payload, signature: sign(null, signingBytes("authority", payload), f.key).toString("base64") }) } as Response;
    });
    await expect(requireSafetyPermit("operator", "contract1", f.settings, future as typeof fetch, f.now)).rejects.toThrow(/verification failed/);
  });
  it("stops kernel effects before any action when the operator is contained", async () => {
    const pool = { query: vi.fn() };
    const guard = vi.fn().mockRejectedValue(new Error("contained"));
    await expect(fireEffects([{ type: "KERNEL_EMIT" }], pool, "test", "exec", "contract", guard)).rejects.toThrow(/contained/);
    expect(pool.query).not.toHaveBeenCalled();
  });
  it("runs the standalone authority without importing or trusting application login", async () => {
    const f = setup(); await f.controller.initialise();
    const notified = vi.fn();
    const app = createAuthorityApp(f.controller, f.key, notified, f.now);
    const server = app.listen(0, "127.0.0.1");
    await new Promise<void>(resolve => server.once("listening", resolve));
    try {
      const port = (server.address() as any).port;
      const post = (path: string, body: unknown) => fetch(`http://127.0.0.1:${port}/v1/${path}`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      const attempt = await post("events", { initiator: "operator", role: "admin" });
      expect(attempt.status).toBe(403);
      const contain = await post("events", f.event(f.contain()));
      expect(contain.status).toBe(201);
      expect(notified).toHaveBeenCalledOnce();
      const check = await post("check", { nonce: "a".repeat(64), operator: "operator", resource: "contract1", capability: "contract.run" });
      expect((await check.json()).payload).toMatchObject({ allowed: false, essentialFallback: "read-only" });
      const status = await post("status", { nonce: "b".repeat(64) });
      expect((await status.json()).payload).toMatchObject({ activeCases: 1, identityTransferEnabled: false });
    } finally { await new Promise<void>(resolve => server.close(() => resolve())); }
  });
});
