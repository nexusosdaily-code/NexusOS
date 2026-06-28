/**
 * Telegram ↔ Nostr Bridge
 *
 * TG → Nostr : polls Telegram channel for new channel_post updates, publishes to Nostr
 * Nostr → TG : polls Nostr for new #nexusos notes not from our own bot, forwards to Telegram
 *
 * State is in-memory; safe to restart (resumes from now).
 */

import * as nostrService from "./nostr-service";

const TAG = "[TgNostrBridge]";
const POLL_MS = 60_000; // 1 minute

// ── Types ─────────────────────────────────────────────────────────────────────
export interface BridgeState {
  running: boolean;
  tgUpdateOffset: number;
  nostrSinceTs: number;
  tgToNostr: number;
  nostrToTg: number;
  lastActivity: string | null;
  lastError: string | null;
  channels: { tg: boolean; nostr: boolean };
}

export interface BridgedMsg {
  id: number;
  direction: "tg→nostr" | "nostr→tg";
  text: string;
  ts: string;
  status: "ok" | "error";
  detail?: string;
}

// ── In-memory state ───────────────────────────────────────────────────────────
const _state: BridgeState = {
  running: false,
  tgUpdateOffset: 0,
  nostrSinceTs: Math.floor(Date.now() / 1000),
  tgToNostr: 0,
  nostrToTg: 0,
  lastActivity: null,
  lastError: null,
  channels: { tg: false, nostr: false },
};

const _log: BridgedMsg[] = [];
let _msgId = 1;
let _timer: ReturnType<typeof setInterval> | null = null;

// ── Telegram helpers ──────────────────────────────────────────────────────────
function tgToken() { return process.env.TELEGRAM_BOT_TOKEN ?? ""; }
function tgChatId() {
  return (process.env.TELEGRAM_CHANNEL_ID || process.env.TELEGRAM_ADMIN_ID) ?? "";
}

async function tgSend(text: string): Promise<boolean> {
  const token = tgToken(), chatId = tgChatId();
  if (!token || !chatId) return false;
  try {
    const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true }),
    });
    const d: any = await r.json();
    if (!d.ok) throw new Error(d.description ?? "Telegram sendMessage failed");
    return true;
  } catch (e: any) {
    _state.lastError = e.message;
    return false;
  }
}

// ── TG → Nostr ────────────────────────────────────────────────────────────────
async function syncTgToNostr() {
  const token = tgToken();
  if (!token) return;
  const chatId = tgChatId();

  try {
    const qs = new URLSearchParams({
      offset:  String(_state.tgUpdateOffset + 1),
      timeout: "0",
      allowed_updates: JSON.stringify(["channel_post", "message"]),
    });
    const r = await fetch(`https://api.telegram.org/bot${token}/getUpdates?${qs}`);
    const data: any = await r.json();
    if (!data.ok || !Array.isArray(data.result) || !data.result.length) return;

    for (const update of data.result) {
      _state.tgUpdateOffset = Math.max(_state.tgUpdateOffset, update.update_id);

      const post = update.channel_post ?? update.message;
      if (!post?.text) continue;

      // Only forward from our configured channel
      const postChatId = String(post.chat?.id ?? "");
      const postUsername = String(post.chat?.username ?? "");
      const cfgId = String(chatId).replace("@", "");
      if (chatId && postChatId !== cfgId && postUsername !== cfgId) continue;

      const content = `📡 [via Telegram]\n\n${post.text}\n\n#nexusos #wnsp #nxt #bitcoin`;

      try {
        const result = await nostrService.publishToNostr({
          kind: "note",
          content,
          tags: [["t", "telegram-bridge"], ["t", "nexusos"]],
        });
        _state.tgToNostr++;
        _state.lastActivity = new Date().toISOString();
        _log.unshift({
          id: _msgId++, direction: "tg→nostr",
          text: post.text.slice(0, 140),
          ts: new Date().toISOString(), status: "ok",
          detail: `nostr:${result.id.slice(0, 10)}…`,
        });
      } catch (e: any) {
        _log.unshift({
          id: _msgId++, direction: "tg→nostr",
          text: post.text.slice(0, 140),
          ts: new Date().toISOString(), status: "error", detail: e.message,
        });
        _state.lastError = e.message;
      }
    }
  } catch (e: any) { _state.lastError = e.message; }
}

// ── Nostr → TG ────────────────────────────────────────────────────────────────
async function syncNostrToTg() {
  const token = tgToken();
  if (!token || !tgChatId()) return;

  try {
    const events = await nostrService.fetchGlobalWnspEvents(15);
    const myPubkey = nostrService.getPubkeyHex();

    // Only events after our marker, not from our own bot
    const fresh = events.filter(
      e => e.created_at > _state.nostrSinceTs && e.pubkey !== myPubkey
    );

    // Advance marker even if no fresh events
    if (events.length > 0) {
      _state.nostrSinceTs = Math.max(_state.nostrSinceTs, ...events.map(e => e.created_at));
    }

    for (const evt of fresh.slice(0, 3)) {
      const preview = evt.content.length > 280
        ? evt.content.slice(0, 280) + "…"
        : evt.content;
      const text = `🔮 [via Nostr]\n\n${preview}`;

      const ok = await tgSend(text);
      if (ok) {
        _state.nostrToTg++;
        _state.lastActivity = new Date().toISOString();
        _log.unshift({
          id: _msgId++, direction: "nostr→tg",
          text: evt.content.slice(0, 140),
          ts: new Date().toISOString(), status: "ok",
        });
      } else {
        _log.unshift({
          id: _msgId++, direction: "nostr→tg",
          text: evt.content.slice(0, 140),
          ts: new Date().toISOString(), status: "error",
          detail: _state.lastError ?? "send failed",
        });
      }
    }
  } catch (e: any) { _state.lastError = e.message; }

  if (_log.length > 100) _log.splice(100);
}

// ── Tick ──────────────────────────────────────────────────────────────────────
async function tick() {
  if (!_state.running) return;
  await Promise.allSettled([syncTgToNostr(), syncNostrToTg()]);
}

// ── Public API ────────────────────────────────────────────────────────────────
export function startTgNostrBridge() {
  if (_state.running) return;

  const hasTg    = !!process.env.TELEGRAM_BOT_TOKEN;
  const hasNostr = !!(process.env.NOSTR_NSEC || process.env.NOSTR_NPUB);

  _state.channels = { tg: hasTg, nostr: hasNostr };

  if (!hasTg || !hasNostr) {
    console.log(`${TAG} Skipping — Telegram or Nostr credentials not configured`);
    return;
  }

  _state.running = true;
  console.log(`${TAG} Started — polling every ${POLL_MS / 1000}s · TG→Nostr ✓ · Nostr→TG ✓`);

  tick().catch(console.error);
  _timer = setInterval(() => tick().catch(console.error), POLL_MS);
}

export function stopTgNostrBridge() {
  _state.running = false;
  if (_timer) { clearInterval(_timer); _timer = null; }
  console.log(`${TAG} Stopped`);
}

export function getBridgeState(): BridgeState  { return { ..._state }; }
export function getBridgeLog():   BridgedMsg[] { return [..._log]; }

export async function manualSync(): Promise<BridgeState> {
  await tick();
  return getBridgeState();
}
