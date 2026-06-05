/**
 * NexusOS Nostr DM Bot
 * Polls for encrypted DMs (NIP-04, kind:4) sent to the NexusOS npub.
 * Parses commands and delegates to internal HTTP API routes.
 *
 * Commands:
 *   !help                     — list all commands
 *   !balance                  — show sats + NXT balance
 *   !invoice <sats>           — generate a Lightning deposit invoice
 *   !buynxt <sats>            — swap sats → NXT
 *   !stake <sats> [days]      — stake sats for NXT yield
 */

import { SimplePool, finalizeEvent, getPublicKey, nip19, nip04, type Event as NostrEvent } from "nostr-tools";
import { DEFAULT_RELAYS } from "./nostr-service.js";
import { db } from "./db.js";
import { users, nostrDmLog } from "../shared/schema.js";
import { eq } from "drizzle-orm";

const BOT_TAG = "[NostrDMBot]";
const POLL_MS  = 30_000;
let _pool: SimplePool | null = null;
const getPool = () => { if (!_pool) _pool = new SimplePool(); return _pool; };

function getPrivKey(): Uint8Array {
  const raw = process.env.NOSTR_NSEC ?? "";
  if (!raw) throw new Error("NOSTR_NSEC not set");
  if (raw.startsWith("nsec1")) {
    const d = nip19.decode(raw);
    if (d.type !== "nsec") throw new Error("Invalid nsec bech32");
    return d.data as Uint8Array;
  }
  const b = Buffer.from(raw.replace(/^0x/, ""), "hex");
  if (b.length !== 32) throw new Error("NOSTR_NSEC must be 32-byte hex or nsec1");
  return new Uint8Array(b);
}

let _myPubhex: string = "";
function getMyPubhex(): string {
  if (_myPubhex) return _myPubhex;
  try { _myPubhex = getPublicKey(getPrivKey()); } catch { _myPubhex = ""; }
  return _myPubhex;
}

async function sendDM(toPubhex: string, message: string) {
  const privKey   = getPrivKey();
  const encrypted = await nip04.encrypt(privKey, toPubhex, message);
  const tmpl: any = {
    kind: 4,
    created_at: Math.floor(Date.now() / 1000),
    tags:    [["p", toPubhex]],
    content: encrypted,
  };
  const signed = finalizeEvent(tmpl, privKey);
  await Promise.allSettled(
    DEFAULT_RELAYS.map(r =>
      Promise.race([
        getPool().publish([r], signed),
        new Promise<never>((_, rj) => setTimeout(() => rj(new Error("timeout")), 6_000)),
      ])
    )
  );
}

async function logDm(opts: {
  fromNpub: string; userId?: string | null; command: string;
  args: string; status: string; response: string; eventId?: string;
}) {
  try {
    await db.insert(nostrDmLog).values({
      fromNpub: opts.fromNpub, userId: opts.userId ?? undefined,
      command: opts.command, args: opts.args,
      status: opts.status, response: opts.response.slice(0, 1000),
      eventId: opts.eventId ?? null,
    });
  } catch { /* non-fatal */ }
}

async function findUser(npub: string): Promise<typeof users.$inferSelect | null> {
  const [u] = await db.select().from(users).where(eq(users.nostrNpub, npub)).limit(1);
  return u ?? null;
}

/** Call an internal API route with a fake session for the bot user */
async function callApi(path: string, method: "GET" | "POST", userId: string, body?: Record<string, any>): Promise<{ ok: boolean; data: any }> {
  const base = `http://localhost:${process.env.PORT ?? 5000}`;
  try {
    // Get a session token for this user by calling /api/nostr/bot-session
    const sessR = await fetch(`${base}/api/nostr/bot-session`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Bot-Secret": process.env.NOSTR_BOT_SECRET ?? "nexusos-nostr-bot" },
      body: JSON.stringify({ userId }),
    });
    if (!sessR.ok) return { ok: false, data: { error: "bot-session failed" } };
    const { token } = await sessR.json();

    const r = await fetch(`${base}${path}`, {
      method,
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await r.json();
    return { ok: r.ok, data };
  } catch (e: any) {
    return { ok: false, data: { error: e.message } };
  }
}

async function handleCommand(fromNpub: string, fromPubhex: string, raw: string, eventId: string) {
  const parts = raw.trim().split(/\s+/);
  const cmd   = parts[0]?.toLowerCase() ?? "";
  if (!cmd.startsWith("!")) return;

  const user   = await findUser(fromNpub);
  const userId = user?.id ?? null;

  const reply = async (msg: string, status = "ok") => {
    try { await sendDM(fromPubhex, msg); } catch (e: any) { console.warn(`${BOT_TAG} send failed:`, e.message); }
    await logDm({ fromNpub, userId, command: cmd, args: parts.slice(1).join(" "), status, response: msg, eventId });
  };

  // ── !help ─────────────────────────────────────────────────────────────────
  if (cmd === "!help") {
    return reply(
      `⚡ NexusOS Nostr Bot\n\n` +
      `Commands:\n` +
      `  !balance — sats + NXT balance\n` +
      `  !invoice <sats> — Lightning deposit invoice\n` +
      `  !buynxt <sats> — swap sats → NXT\n` +
      `  !stake <sats> [days] — stake sats (7/14/30/90/180/365 days)\n\n` +
      `To link your npub: visit NexusOS → Nostr Bridge.\n` +
      `Rate: 1,000 sats = 1 NXT`
    );
  }

  // All other commands require an account
  if (!user) {
    return reply(
      `❌ Your npub (${fromNpub.slice(0, 20)}…) is not linked to a NexusOS account.\n\n` +
      `Visit NexusOS → Nostr Bridge, paste your npub, and save. Then retry.`,
      "error"
    );
  }

  // ── !balance ──────────────────────────────────────────────────────────────
  if (cmd === "!balance") {
    const { ok, data } = await callApi("/api/wallet", "GET", user.id);
    if (!ok) return reply(`❌ Could not load balance: ${data.error ?? "unknown error"}`, "error");
    const sats = data.wallet?.satsBalance ?? 0;
    const nxt  = data.wallet ? parseFloat(data.wallet.balance) : 0;
    return reply(
      `💰 ${user.username} balance:\n` +
      `⚡ ${sats.toLocaleString()} sats\n` +
      `🔶 ${nxt.toFixed(4)} NXT\n\n` +
      `Rate: 1 NXT = 1,000 sats`
    );
  }

  // ── !invoice ──────────────────────────────────────────────────────────────
  if (cmd === "!invoice") {
    const amountSats = parseInt(parts[1] ?? "");
    if (!amountSats || amountSats < 1 || amountSats > 10_000_000) {
      return reply(`❌ Usage: !invoice <sats>  (1–10,000,000)`, "error");
    }
    const { ok, data } = await callApi("/api/lightning/invoice", "POST", user.id, {
      amountSats, memo: `NexusOS Nostr — ${user.username}`,
    });
    if (!ok) return reply(`❌ Invoice failed: ${data.error ?? "unknown error"}`, "error");
    return reply(
      `⚡ Invoice for ${amountSats.toLocaleString()} sats:\n\n${data.paymentRequest}\n\n` +
      `Expires in 1 hour. Sats credit automatically once paid.`
    );
  }

  // ── !buynxt ───────────────────────────────────────────────────────────────
  if (cmd === "!buynxt") {
    const amountSats = parseInt(parts[1] ?? "");
    if (!amountSats || amountSats < 100) {
      return reply(`❌ Usage: !buynxt <sats>  (minimum 100 sats)`, "error");
    }
    const { ok, data } = await callApi("/api/lightning/swap/to-nxt", "POST", user.id, { amountSats });
    if (!ok) return reply(`❌ Swap failed: ${data.error ?? "unknown error"}`, "error");
    return reply(
      `✅ Swapped ${amountSats.toLocaleString()} sats → ${parseFloat(data.nxtAmount).toFixed(4)} NXT\n` +
      `Rate: 1,000 sats = 1 NXT`
    );
  }

  // ── !stake ────────────────────────────────────────────────────────────────
  if (cmd === "!stake") {
    const amountSats = parseInt(parts[1] ?? "");
    const lockDays   = parseInt(parts[2] ?? "30");
    if (!amountSats || amountSats < 1_000) {
      return reply(`❌ Usage: !stake <sats> [days]  (min 1,000 sats; days: 7/14/30/90/180/365)`, "error");
    }
    const { ok, data } = await callApi("/api/lightning/stake", "POST", user.id, { amountSats, lockDays });
    if (!ok) return reply(`❌ Stake failed: ${data.error ?? "unknown error"}`, "error");
    const s = data.stake;
    const RATES: Record<number, string> = { 7: "5", 14: "12", 30: "28", 90: "90", 180: "200", 365: "420" };
    const matDate = new Date(s.maturesAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    return reply(
      `🔒 Staked ${amountSats.toLocaleString()} sats for ${lockDays} days\n` +
      `📈 APY: ${RATES[lockDays] ?? "?"}%\n` +
      `💎 Expected yield: ${parseFloat(s.nxtYield).toFixed(4)} NXT\n` +
      `📅 Matures: ${matDate}\n` +
      `WNUSD auto-minted as collateral.`
    );
  }

  await reply(`❓ Unknown command "${cmd}". Send !help for options.`, "unknown");
}

// ── Polling loop ─────────────────────────────────────────────────────────────
let _lastSeen   = Math.floor(Date.now() / 1000) - 300;
let _seenIds    = new Set<string>();
let _pollTimer: ReturnType<typeof setInterval> | null = null;

async function poll() {
  try {
    const myPub = getMyPubhex();
    if (!myPub) return;
    const evts: NostrEvent[] = await getPool().querySync(
      DEFAULT_RELAYS,
      { kinds: [4], "#p": [myPub], since: _lastSeen, limit: 50 }
    );
    for (const evt of evts) {
      if (_seenIds.has(evt.id) || evt.pubkey === myPub) continue;
      _seenIds.add(evt.id);
      let decrypted = "";
      try { decrypted = await nip04.decrypt(getPrivKey(), evt.pubkey, evt.content); } catch { continue; }
      if (!decrypted.trim().startsWith("!")) continue;
      let fromNpub = "";
      try { fromNpub = nip19.npubEncode(evt.pubkey); } catch { fromNpub = evt.pubkey; }
      console.log(`${BOT_TAG} DM from ${fromNpub.slice(0, 20)}… → "${decrypted.slice(0, 60)}"`);
      await handleCommand(fromNpub, evt.pubkey, decrypted, evt.id);
    }
    if (evts.length > 0) _lastSeen = Math.max(...evts.map(e => e.created_at));
    if (_seenIds.size > 2000) { const arr = [..._seenIds]; _seenIds = new Set(arr.slice(-1000)); }
  } catch (e: any) {
    console.warn(`${BOT_TAG} poll error:`, e.message);
  }
}

export function startNostrDmBot() {
  if (_pollTimer) return;
  const nsec = process.env.NOSTR_NSEC ?? "";
  if (!nsec) { console.log(`${BOT_TAG} NOSTR_NSEC not set — DM bot disabled`); return; }
  console.log(`${BOT_TAG} DM bot started — polling every ${POLL_MS / 1000}s · my pubkey: ${getMyPubhex().slice(0, 12)}…`);
  poll();
  _pollTimer = setInterval(poll, POLL_MS);
}

export function stopNostrDmBot() {
  if (_pollTimer) { clearInterval(_pollTimer); _pollTimer = null; }
}
