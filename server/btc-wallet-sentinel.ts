/**
 * BTC Wallet Sentinel — NexusOS
 *
 * Monitors the service wallet on mempool.space every 30 s.
 * Detects new mempool TXs the instant they broadcast, tracks confirmed
 * vs unconfirmed balance, fires Telegram alerts, and auto-kicks the
 * inscription queue when funds arrive.
 *
 * Pushes real-time updates to connected browsers via Server-Sent Events.
 */

import type { Response } from "express";

const ESPLORA = "https://blockstream.info/api";
const MEMPOOL  = "https://mempool.space/api";
const POLL_MS  = 30_000;          // 30-second poll
const LOW_WARN = 20_000;          // sats — amber alert
const LOW_CRIT =  5_000;          // sats — red alert
const ALERT_COOLDOWN = 3_600_000; // 1 h between same-severity alerts

// ── API helpers ───────────────────────────────────────────────────────────────
async function fetchJson(url: string): Promise<any> {
  const r = await fetch(url, { signal: AbortSignal.timeout(12_000), headers: { Accept: "application/json" } });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

async function esplora(path: string): Promise<any> {
  try { return await fetchJson(`${ESPLORA}${path}`); }
  catch { return await fetchJson(`${MEMPOOL}${path}`); }
}

// ── Types ─────────────────────────────────────────────────────────────────────
export interface WalletSnapshot {
  address:     string;
  confirmed:   number;
  unconfirmed: number;
  total:       number;
  txCount:     number;
  checkedAt:   string;
}

export interface SentinelEvent {
  type:      "incoming" | "confirmed" | "low_warn" | "low_crit" | "recovered" | "startup";
  message:   string;
  sats?:     number;
  txid?:     string;
  timestamp: string;
}

export interface SentinelPush {
  snapshot: WalletSnapshot | null;
  events:   SentinelEvent[];
  health:   string;
  mempoolUrl: string | null;
}

// ── State ─────────────────────────────────────────────────────────────────────
let _running         = false;
let _timer: ReturnType<typeof setTimeout> | null = null;
let _snapshot: WalletSnapshot | null = null;
let _knownTxids      = new Set<string>();
let _lastLowAlert    = 0;
let _lastRecovAlert  = 0;
let _wasLow          = false;
const _events: SentinelEvent[] = [];   // rolling last-50 events

// ── SSE client registry ───────────────────────────────────────────────────────
const _sseClients = new Set<Response>();

export function registerSSEClient(res: Response) {
  _sseClients.add(res);
}
export function unregisterSSEClient(res: Response) {
  _sseClients.delete(res);
}

function broadcastSSE() {
  if (_sseClients.size === 0) return;
  const LOW_WARN_L = 20_000, LOW_CRIT_L = 5_000;
  const health = !_snapshot ? "unknown"
    : _snapshot.confirmed < LOW_CRIT_L ? "critical"
    : _snapshot.confirmed < LOW_WARN_L ? "warning"
    : "ok";
  const payload: SentinelPush = {
    snapshot:   _snapshot,
    events:     [..._events],
    health,
    mempoolUrl: _snapshot ? `https://mempool.space/address/${_snapshot.address}` : null,
  };
  const data = `data: ${JSON.stringify(payload)}\n\n`;
  for (const res of _sseClients) {
    try { res.write(data); } catch { _sseClients.delete(res); }
  }
}

// ── Event log ─────────────────────────────────────────────────────────────────
function pushEvent(e: SentinelEvent) {
  _events.unshift(e);
  if (_events.length > 50) _events.pop();
  // Push immediately to any open browser tabs
  broadcastSSE();
}

// ── Telegram helper ───────────────────────────────────────────────────────────
async function alert(msg: string) {
  try {
    const { sendAdminAlert } = await import("./telegram-bot");
    await sendAdminAlert(msg);
  } catch { /* telegram is optional */ }
}

// ── Core poll ─────────────────────────────────────────────────────────────────
async function poll(address: string) {
  let balance: { funded_txo_sum: number; spent_txo_sum: number; unconfirmed_delta: number };
  let txs: { txid: string; status: { confirmed: boolean } }[];

  try {
    [balance, txs] = await Promise.all([
      esplora(`/address/${address}`).then((d: any) => ({
        funded_txo_sum:    d.chain_stats.funded_txo_sum   + d.mempool_stats.funded_txo_sum,
        spent_txo_sum:     d.chain_stats.spent_txo_sum    + d.mempool_stats.spent_txo_sum,
        unconfirmed_delta: d.mempool_stats.funded_txo_sum - d.mempool_stats.spent_txo_sum,
      })),
      esplora(`/address/${address}/txs`),
    ]);
  } catch (e: any) {
    console.warn("[Sentinel] poll error:", e.message);
    return;
  }

  const confirmed   = balance.funded_txo_sum - balance.spent_txo_sum - balance.unconfirmed_delta;
  const unconfirmed = balance.unconfirmed_delta;
  const total       = confirmed + unconfirmed;

  const now = new Date().toISOString();
  _snapshot = { address, confirmed, unconfirmed, total, txCount: txs.length, checkedAt: now };

  // ── 1. Detect new mempool transactions ───────────────────────────────────
  const unconfirmedTxs = txs.filter(t => !t.status.confirmed);
  for (const tx of unconfirmedTxs) {
    if (!_knownTxids.has(tx.txid + ":alerted")) {
      _knownTxids.add(tx.txid + ":alerted");
      const ev: SentinelEvent = {
        type:      "incoming",
        message:   `🟠 Incoming TX detected\nTXID: ${tx.txid.slice(0, 16)}…\n+${unconfirmed.toLocaleString()} unconfirmed / ${confirmed.toLocaleString()} confirmed sats`,
        sats:      unconfirmed,
        txid:      tx.txid,
        timestamp: now,
      };
      pushEvent(ev);  // also broadcasts SSE
      await alert(
        `⚡ <b>NexusOS Service Wallet — Incoming TX</b>\n\n` +
        `TXID: <code>${tx.txid}</code>\n` +
        `Unconfirmed: <b>${unconfirmed.toLocaleString()} sats</b>\n` +
        `Confirmed:   ${confirmed.toLocaleString()} sats\n` +
        `Total:       ${total.toLocaleString()} sats\n\n` +
        `<a href="https://mempool.space/tx/${tx.txid}">View on mempool.space</a>`
      );
      console.log(`[Sentinel] 🟠 New incoming TX: ${tx.txid} (+${unconfirmed} unconfirmed sats)`);
    }
  }

  // ── 2. Low-balance alerts ────────────────────────────────────────────────
  const nowMs = Date.now();
  if (confirmed < LOW_CRIT) {
    if (nowMs - _lastLowAlert > ALERT_COOLDOWN) {
      _lastLowAlert = nowMs;
      _wasLow = true;
      const ev: SentinelEvent = {
        type:      "low_crit",
        message:   `🚨 CRITICAL: Service wallet below ${LOW_CRIT.toLocaleString()} sats`,
        sats:      confirmed,
        timestamp: now,
      };
      pushEvent(ev);
      await alert(
        `🚨 <b>CRITICAL — Service Wallet Low</b>\n\n` +
        `Confirmed: <b>${confirmed.toLocaleString()} sats</b>\n` +
        `Unconfirmed: ${unconfirmed.toLocaleString()} sats\n\n` +
        `Inscriptions PAUSED — need ${LOW_CRIT.toLocaleString()}+ confirmed sats to resume.\n\n` +
        `Top up:\n<code>bc1pwp8a08guyncsq89yl3k4w9fwfa9efuv8penfw9aprxvlg6qr5u3qce6p6m</code>\n\n` +
        `<a href="https://mempool.space/address/bc1pwp8a08guyncsq89yl3k4w9fwfa9efuv8penfw9aprxvlg6qr5u3qce6p6m">Live wallet on mempool.space</a>`
      );
    }
  } else if (confirmed < LOW_WARN) {
    if (nowMs - _lastLowAlert > ALERT_COOLDOWN) {
      _lastLowAlert = nowMs;
      _wasLow = true;
      const ev: SentinelEvent = {
        type:      "low_warn",
        message:   `⚠️ WARNING: Service wallet below ${LOW_WARN.toLocaleString()} sats`,
        sats:      confirmed,
        timestamp: now,
      };
      pushEvent(ev);
      await alert(
        `⚠️ <b>WARNING — Service Wallet Low</b>\n\n` +
        `Confirmed: <b>${confirmed.toLocaleString()} sats</b>\n` +
        `Unconfirmed: ${unconfirmed.toLocaleString()} sats\n\n` +
        `Consider topping up:\n<code>bc1pwp8a08guyncsq89yl3k4w9fwfa9efuv8penfw9aprxvlg6qr5u3qce6p6m</code>\n\n` +
        `<a href="https://mempool.space/address/bc1pwp8a08guyncsq89yl3k4w9fwfa9efuv8penfw9aprxvlg6qr5u3qce6p6m">Live wallet on mempool.space</a>`
      );
    }
  } else if (_wasLow && nowMs - _lastRecovAlert > ALERT_COOLDOWN) {
    // ── 3. Recovery alert ──────────────────────────────────────────────────
    _wasLow = false;
    _lastRecovAlert = nowMs;
    const ev: SentinelEvent = {
      type:      "recovered",
      message:   `✅ Service wallet recovered — ${confirmed.toLocaleString()} sats confirmed`,
      sats:      confirmed,
      timestamp: now,
    };
    pushEvent(ev);
    await alert(
      `✅ <b>Service Wallet Recovered</b>\n\n` +
      `Confirmed: <b>${confirmed.toLocaleString()} sats</b>\n` +
      `Resuming inscription queue…`
    );
    // ── 4. Auto-kick inscription queue ────────────────────────────────────
    try {
      const { btcBridge } = await import("./btc-bridge-service");
      (btcBridge as any)._busy = false;
      console.log("[Sentinel] ✅ Wallet recovered — kicked inscription queue");
    } catch { /* bridge optional */ }
  }

  // Always broadcast current snapshot after every poll
  broadcastSSE();

  // ── 5. Log summary every 10 polls (~5 min) ───────────────────────────────
  if (!((nowMs / POLL_MS) % 10 | 0)) {
    console.log(`[Sentinel] Wallet ${address.slice(0, 12)}… — ${confirmed.toLocaleString()} confirmed / ${unconfirmed.toLocaleString()} unconfirmed sats`);
  }
}

// ── Seed known TXids on first run (no alerts for history) ────────────────────
async function seed(address: string) {
  try {
    const txs: { txid: string }[] = await esplora(`/address/${address}/txs`);
    for (const tx of txs) {
      _knownTxids.add(tx.txid);
      _knownTxids.add(tx.txid + ":alerted");
    }
    console.log(`[Sentinel] Seeded ${txs.length} known TXs for ${address.slice(0, 12)}…`);
  } catch (e: any) {
    console.warn("[Sentinel] Seed error:", e.message);
  }
}

// ── Public API ────────────────────────────────────────────────────────────────
export function getSnapshot(): WalletSnapshot | null { return _snapshot; }
export function getEvents(): SentinelEvent[] { return [..._events]; }

export async function startWalletSentinel() {
  if (_running) return;

  const { getServiceWallet } = await import("./btc-inscription-engine");
  const wallet = getServiceWallet();
  if (!wallet) {
    console.log("[Sentinel] BTC_INSCRIPTION_WALLET_WIF not set — sentinel not started");
    return;
  }

  _running = true;
  const address = wallet.address;
  console.log(`[Sentinel] Started — watching ${address} every ${POLL_MS / 1000}s`);

  pushEvent({ type: "startup", message: `Sentinel started — watching ${address}`, timestamp: new Date().toISOString() });

  await seed(address);
  await poll(address);

  const loop = async () => {
    if (!_running) return;
    await poll(address);
    _timer = setTimeout(loop, POLL_MS);
  };
  _timer = setTimeout(loop, POLL_MS);
}

export function stopWalletSentinel() {
  _running = false;
  if (_timer) { clearTimeout(_timer); _timer = null; }
  console.log("[Sentinel] Stopped");
}
