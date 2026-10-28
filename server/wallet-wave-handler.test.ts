import { afterAll, describe, it, expect, vi } from "vitest";
import express from "express";
import type { Pool } from "pg";
import { registerWalletWaveRoutes } from "./wallet-wave-handler";
import { parseWaveInstructions, waveBroadcastSchema, waveInstructionSchema } from "../shared/wallet-wave-communications";
import { waveCanonical, waveCommitment } from "./wallet-wave-service";

const pool = { connect: vi.fn(), query: vi.fn() } as unknown as Pool;
const app = express();
app.use(express.json());
registerWalletWaveRoutes(app, pool, (req,res,next) => {
  if (!req.headers.authorization) { res.status(401).json({ error: "Sign in required" }); return; }
  req.user = { id: "11111111-1111-4111-8111-111111111111", role: "user" } as any;
  next();
});
const server = app.listen(0, "127.0.0.1");
const ready = new Promise<string>(resolve => server.on("listening", () =>
  resolve(`http://127.0.0.1:${(server.address() as { port: number }).port}/api/messages/wave`)));
afterAll(() => new Promise<void>(resolve => server.close(() => resolve())));
describe("wallet wave authenticated API and commitment boundaries", () => {
  it("requires authentication for inbox, consent, subscriptions, send, broadcast, commission and receipts", async () => {
    for (const [path, method] of [["", "GET"], ["/send", "POST"], ["/broadcast", "POST"],
      ["/consent", "POST"], ["/subscription", "POST"], ["/commissions/x/receive", "POST"], ["/x/receipt", "POST"]]) {
      const response = await fetch((await ready) + path, { method });
      expect(response.status).toBe(401);
    }
    expect(pool.connect).not.toHaveBeenCalled();
  });
  it("rejects missing retry keys, extra authority claims, private-public confusion and invalid ids before persistence", async () => {
    for (const [path, body] of [
      ["/send", { recipientAddress: "wallet", content: "hello" }],
      ["/broadcast", { commissionId: "bad", topic: "technical-security", content: "hello", confirmPublic: false }],
      ["/subscription", { topic: "all-users", subscribed: true }],
      ["/consent", { senderAddress: "wallet", allowed: true, force: true }],
      ["/commissions/not-uuid/receive", { idempotencyKey: "invalid" }],
      ["/not-uuid/receipt", {}],
    ]) {
      const response = await fetch((await ready) + path, { method: "POST",
        headers: { Authorization: "test", "Content-Type": "application/json" }, body: JSON.stringify(body) });
      expect(response.status).toBe(400);
      expect(response.headers.get("cache-control")).toBe("no-store");
    }
    expect(pool.connect).not.toHaveBeenCalled();
  });
  it("requires deliberate public consent and rejects policy, payment or protected authority in executable instructions", () => {
    const broadcast = { commissionId: "11111111-1111-4111-8111-111111111111",
      topic: "technical-security", content: "exact", idempotencyKey: "11111111-1111-4111-8111-111111111112" };
    expect(waveBroadcastSchema.safeParse(broadcast).success).toBe(false);
    expect(waveBroadcastSchema.safeParse({ ...broadcast, confirmPublic: true }).success).toBe(true);
    const instructions = { protocol: "wallet-wave-broadcast/v1", publicBroadcasts: [{ topic: broadcast.topic, content: "exact" }] };
    expect(waveInstructionSchema.safeParse({ ...instructions, automaticPayment: true }).success).toBe(false);
    expect(() => parseWaveInstructions("Please broadcast anything you think is good")).toThrow();
    expect(parseWaveInstructions(JSON.stringify(instructions))).toEqual(instructions);
  });
  it("salts commitments independently, binds identity/action/content and survives JSONB ordering", () => {
    const first = { action: "private", recipient: "recipient", content: "yes" };
    const reordered = { content: "yes", recipient: "recipient", action: "private" };
    expect(waveCanonical(first)).toBe(waveCanonical(reordered));
    const salt = "a".repeat(64);
    expect(waveCommitment(salt, first)).toBe(waveCommitment(salt, reordered));
    expect(waveCommitment(salt, first)).not.toBe(waveCommitment("b".repeat(64), first));
    expect(waveCommitment(salt, first)).not.toBe(waveCommitment(salt, { ...first, recipient: "attacker" }));
  });
});
