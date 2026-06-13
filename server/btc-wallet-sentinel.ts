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

// ── Deposit processor constants ───────────────────────────────────────────────
const BTC_DEPOSIT_SATS_PER_NXT = 1000; // 1000 sats = 1 NXT (matches Lightning rate)
const BTC_DEPOSIT_MIN_SATS     = 3_300; // minimum deposit (10× P2TR dust limit)

const ESPLORA = "https://blockstream.info/api";
const MEMPOOL  = "https://mempool.space/api";
const POLL_MS  = 30_000;           // 30-second poll
const LOW_WARN = 20_000;           // sats — amber alert
const LOW_CRIT =  5_000;           // sats — red alert
const ALERT_COOLDOWN     = 3_600_000; // 1 h between same-severity alerts
const UTXO_ALERT_COOLDOWN = 86_400_000; // 24 h between consolidation alerts
const DUST_THRESHOLD     = 330;    // sats — P2TR dust limit
const CONSOLIDATE_WARN   = 10;     // UTXO count that triggers consolidation advice

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
export interface Utxo {
  txid:      string;
  vout:      number;
  value:     number;  // sats
  confirmed: boolean;
}

export interface UtxoAnalysis {
  utxos:            Utxo[];
  count:            number;
  confirmedCount:   number;
  unconfirmedCount: number;
  dustCount:        number;       // UTXOs below P2TR dust limit (330 sats)
  totalSats:        number;
  largestSats:      number;
  smallestSats:     number;
  avgSats:          number;
  needsConsolidation: boolean;   // count >= CONSOLIDATE_WARN
}

export interface WalletSnapshot {
  address:     string;
  confirmed:   number;
  unconfirmed: number;
  total:       number;
  txCount:     number;
  utxo:        UtxoAnalysis | null;
  checkedAt:   string;
}

export interface SentinelEvent {
  type:      "incoming" | "confirmed" | "low_warn" | "low_crit" | "recovered" | "startup" | "utxo_alert";
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
let _lastUtxoAlert   = 0;
let _wasLow          = false;
let _prevUtxoCount   = -1;             // -1 = not yet seeded
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

// ── UTXO analysis ─────────────────────────────────────────────────────────────
function analyzeUtxos(raw: any[]): UtxoAnalysis {
  const utxos: Utxo[] = raw.map((u: any) => ({
    txid:      u.txid,
    vout:      u.vout,
    value:     u.value,
    confirmed: !!u.status?.confirmed,
  }));

  const confirmed   = utxos.filter(u => u.confirmed);
  const unconfirmed = utxos.filter(u => !u.confirmed);
  const dust        = utxos.filter(u => u.value < DUST_THRESHOLD);
  const values      = utxos.map(u => u.value);
  const totalSats   = values.reduce((a, b) => a + b, 0);
  const sorted      = [...values].sort((a, b) => a - b);

  return {
    utxos,
    count:              utxos.length,
    confirmedCount:     confirmed.length,
    unconfirmedCount:   unconfirmed.length,
    dustCount:          dust.length,
    totalSats,
    largestSats:        sorted.length ? sorted[sorted.length - 1] : 0,
    smallestSats:       sorted.length ? sorted[0] : 0,
    avgSats:            sorted.length ? Math.round(totalSats / sorted.length) : 0,
    needsConsolidation: utxos.length >= CONSOLIDATE_WARN,
  };
}

// ── Core poll ─────────────────────────────────────────────────────────────────
async function poll(address: string) {
  let balance: { funded_txo_sum: number; spent_txo_sum: number; unconfirmed_delta: number };
  let txs: { txid: string; status: { confirmed: boolean } }[];
  let rawUtxos: any[] = [];

  try {
    [balance, txs, rawUtxos] = await Promise.all([
      esplora(`/address/${address}`).then((d: any) => ({
        funded_txo_sum:    d.chain_stats.funded_txo_sum   + d.mempool_stats.funded_txo_sum,
        spent_txo_sum:     d.chain_stats.spent_txo_sum    + d.mempool_stats.spent_txo_sum,
        unconfirmed_delta: d.mempool_stats.funded_txo_sum - d.mempool_stats.spent_txo_sum,
      })),
      esplora(`/address/${address}/txs`),
      esplora(`/address/${address}/utxo`).catch(() => []),
    ]);
  } catch (e: any) {
    console.warn("[Sentinel] poll error:", e.message);
    return;
  }

  const confirmed   = balance.funded_txo_sum - balance.spent_txo_sum - balance.unconfirmed_delta;
  const unconfirmed = balance.unconfirmed_delta;
  const total       = confirmed + unconfirmed;

  const utxo = analyzeUtxos(rawUtxos);
  const now  = new Date().toISOString();
  _snapshot  = { address, confirmed, unconfirmed, total, txCount: txs.length, utxo, checkedAt: now };

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
      // Auto-process BTC → NXT deposit
      processIncomingDeposit(tx.txid, unconfirmed).catch(e =>
        console.error(`[Sentinel] Deposit processor error: ${e.message}`)
      );
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
        `<a href="https://mempool.space/address/bc1pwp8a08guyncsq89yl3k4w9fwfa9efuv8penfw9aprxvlg6qr5u3qce6p6m">Live wallet on mempool.space</a> · <a href="https://orbitaltreasury.io">orbitaltreasury.io</a>`
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
        `<a href="https://mempool.space/address/bc1pwp8a08guyncsq89yl3k4w9fwfa9efuv8penfw9aprxvlg6qr5u3qce6p6m">Live wallet on mempool.space</a> · <a href="https://orbitaltreasury.io">orbitaltreasury.io</a>`
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

  // ── 5. UTXO alerts (consolidation + dust) ────────────────────────────────
  const isFirstSeed = _prevUtxoCount === -1;
  if (!isFirstSeed && utxo.count !== _prevUtxoCount) {
    // UTXO count changed — log every change as a quick info event
    pushEvent({
      type:      "utxo_alert",
      message:   `🔑 UTXO set changed: ${_prevUtxoCount} → ${utxo.count} UTXOs (${utxo.confirmedCount} confirmed, ${utxo.unconfirmedCount} pending)`,
      timestamp: now,
    });
  }
  _prevUtxoCount = utxo.count;

  if (utxo.needsConsolidation && nowMs - _lastUtxoAlert > UTXO_ALERT_COOLDOWN) {
    _lastUtxoAlert = nowMs;
    const lines = [
      `🔑 <b>UTXO Consolidation Recommended</b>`,
      ``,
      `UTXOs: <b>${utxo.count}</b> (confirmed: ${utxo.confirmedCount} · pending: ${utxo.unconfirmedCount})`,
      `Dust (&lt;330 sats): <b>${utxo.dustCount}</b>`,
      `Largest: ${utxo.largestSats.toLocaleString()} sats`,
      `Smallest: ${utxo.smallestSats.toLocaleString()} sats`,
      `Average: ${utxo.avgSats.toLocaleString()} sats`,
      ``,
      `Consolidate UTXOs to reduce future TX fees.`,
    ];
    pushEvent({
      type:    "utxo_alert",
      message: `⚠️ ${utxo.count} UTXOs — consolidation recommended (dust: ${utxo.dustCount})`,
      timestamp: now,
    });
    await alert(lines.join("\n"));
    console.log(`[Sentinel] ⚠️ UTXO alert: ${utxo.count} UTXOs, ${utxo.dustCount} dust`);
  } else if (utxo.dustCount > 0 && !utxo.needsConsolidation && nowMs - _lastUtxoAlert > UTXO_ALERT_COOLDOWN) {
    _lastUtxoAlert = nowMs;
    pushEvent({
      type:    "utxo_alert",
      message: `🌫️ ${utxo.dustCount} dust UTXO${utxo.dustCount > 1 ? "s" : ""} detected (<330 sats each) — may be unspendable`,
      timestamp: now,
    });
    await alert(
      `🌫️ <b>Dust UTXOs Detected</b>\n\nWallet has ${utxo.dustCount} UTXO${utxo.dustCount > 1 ? "s" : ""} below the P2TR dust limit (330 sats). These may be unspendable.`
    );
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
    // Non-blocking batch poll for registered user addresses
    setImmediate(() => pollUserWallets().catch(() => {}));
    _timer = setTimeout(loop, POLL_MS);
  };
  _timer = setTimeout(loop, POLL_MS);
}

export function stopWalletSentinel() {
  _running = false;
  if (_timer) { clearTimeout(_timer); _timer = null; }
  console.log("[Sentinel] Stopped");
}

// ── BTC → NXT Deposit Processor ──────────────────────────────────────────────
// Called for every newly-detected incoming TX.
// Resolves the sender address via esplora, checks the registry, credits NXT.
export async function processIncomingDeposit(txid: string, satsReceived: number): Promise<void> {
  if (satsReceived < BTC_DEPOSIT_MIN_SATS) {
    console.log(`[Deposit] TX ${txid.slice(0,16)}… — ${satsReceived} sats below minimum (${BTC_DEPOSIT_MIN_SATS}), skipping`);
    return;
  }

  const { db } = await import("./db");
  const { sql, eq } = await import("drizzle-orm");

  // Ensure tables exist (idempotent)
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS btc_address_registry (
      id           SERIAL PRIMARY KEY,
      user_id      VARCHAR(36) NOT NULL,
      username     VARCHAR(100) NOT NULL,
      btc_address  TEXT NOT NULL UNIQUE,
      label        TEXT DEFAULT 'My BTC Sender Address',
      registered_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS btc_deposits (
      id             SERIAL PRIMARY KEY,
      txid           TEXT NOT NULL UNIQUE,
      sender_address TEXT,
      sats_received  INTEGER NOT NULL,
      nxt_credited   DECIMAL(20,8),
      user_id        VARCHAR(36),
      username       TEXT,
      status         TEXT NOT NULL DEFAULT 'unmatched',
      detected_at    TIMESTAMP NOT NULL DEFAULT NOW(),
      credited_at    TIMESTAMP
    )
  `);

  // Skip if already processed
  const existing = await db.execute(sql`SELECT id FROM btc_deposits WHERE txid = ${txid}`);
  if ((existing.rows as any[]).length > 0) return;

  // Fetch TX from esplora to get input (sender) address
  let senderAddress: string | null = null;
  try {
    const txData = await fetchJson(`${ESPLORA}/tx/${txid}`);
    const addrs: string[] = [];
    for (const inp of (txData.vin ?? [])) {
      const a = inp?.prevout?.scriptpubkey_address;
      if (a) addrs.push(a);
    }
    senderAddress = addrs[0] ?? null; // use first input's address
  } catch (e: any) {
    console.warn(`[Deposit] Could not fetch TX ${txid}: ${e.message}`);
  }

  // Check registry for this sender address
  let matched: { user_id: string; username: string } | null = null;
  if (senderAddress) {
    const rows = await db.execute(sql`
      SELECT user_id, username FROM btc_address_registry
      WHERE btc_address = ${senderAddress}
      LIMIT 1
    `);
    if ((rows.rows as any[]).length > 0) {
      matched = rows.rows[0] as any;
    }
  }

  if (matched) {
    // Credit NXT to matched user
    const nxtAmount = satsReceived / BTC_DEPOSIT_SATS_PER_NXT;
    const { storage } = await import("./storage");
    const { GENESIS_EXECUTION_ADDRESS } = await import("./physics");

    const userWallets = await db.execute(sql`
      SELECT id, balance FROM wallets WHERE user_id = ${matched.user_id} LIMIT 1
    `);
    if ((userWallets.rows as any[]).length > 0) {
      const w = userWallets.rows[0] as any;
      const newBal = (parseFloat(w.balance) + nxtAmount).toFixed(8);
      await db.execute(sql`UPDATE wallets SET balance = ${newBal} WHERE id = ${w.id}`);

      // Record treasury_deposit transaction (NXT created from BTC is sourced from treasury reserve)
      const treasuryWallet = await storage.getWalletByAddress(GENESIS_EXECUTION_ADDRESS);
      if (treasuryWallet) {
        const tBal = parseFloat(treasuryWallet.balance);
        const tNew = Math.max(0, tBal - nxtAmount).toFixed(8);
        await db.execute(sql`UPDATE wallets SET balance = ${tNew} WHERE id = ${treasuryWallet.id}`);
      }

      await db.execute(sql`
        INSERT INTO btc_deposits (txid, sender_address, sats_received, nxt_credited, user_id, username, status, credited_at)
        VALUES (${txid}, ${senderAddress}, ${satsReceived}, ${nxtAmount.toFixed(8)}, ${matched.user_id}, ${matched.username}, 'credited', NOW())
      `);

      console.log(`[Deposit] ✅ Credited ${nxtAmount.toFixed(2)} NXT to ${matched.username} for ${satsReceived} sats (TX ${txid.slice(0,16)}…)`);
      await alert(
        `💰 <b>BTC → NXT Deposit Auto-Credited</b>\n\n` +
        `User:    <b>${matched.username}</b>\n` +
        `Sats:    <b>${satsReceived.toLocaleString()} sats</b>\n` +
        `NXT:     <b>+${nxtAmount.toFixed(2)} NXT</b>\n` +
        `Rate:    ${BTC_DEPOSIT_SATS_PER_NXT} sats/NXT\n` +
        `Sender:  <code>${senderAddress}</code>\n` +
        `TXID:    <code>${txid}</code>\n\n` +
        `<a href="https://mempool.space/tx/${txid}">View TX</a>`
      );
    }
  } else {
    // Record as unmatched — user can claim via /api/btc/deposit/claim
    await db.execute(sql`
      INSERT INTO btc_deposits (txid, sender_address, sats_received, status)
      VALUES (${txid}, ${senderAddress}, ${satsReceived}, 'unmatched')
      ON CONFLICT (txid) DO NOTHING
    `);
    console.log(`[Deposit] 🔍 Unmatched deposit ${txid.slice(0,16)}… — ${satsReceived} sats from ${senderAddress ?? "unknown"}. User can claim via API.`);
  }
}

export { BTC_DEPOSIT_SATS_PER_NXT, BTC_DEPOSIT_MIN_SATS };

// ── Per-user wallet cache (populated by sentinel batch-poll) ──────────────────
// Key = btc_address string, value = { data, cachedAt }
const _userWalletCache = new Map<string, { data: UserWalletData; cachedAt: number }>();
const USER_CACHE_TTL_MS = 25_000;

export interface UserWalletTx {
  txid:       string;
  confirmed:  boolean;
  value:      number;   // net sats for this address (positive = received, negative = sent)
  blockHeight?: number;
  blockTime?:   number;
}

export interface UserWalletData {
  address:     string;
  confirmed:   number;
  unconfirmed: number;
  total:       number;
  txCount:     number;
  utxoCount:   number;
  recentTxs:   UserWalletTx[];
  checkedAt:   string;
}

/** Returns cached user wallet data if fresh, or null if stale/missing. */
export function getUserWalletSnapshot(address: string): UserWalletData | null {
  const entry = _userWalletCache.get(address);
  if (!entry) return null;
  if (Date.now() - entry.cachedAt > USER_CACHE_TTL_MS) return null;
  return entry.data;
}

/** Fetch & cache wallet data for a single BTC address. */
async function fetchUserWallet(address: string): Promise<UserWalletData | null> {
  try {
    const [addrData, txsRaw, utxos] = await Promise.all([
      esplora(`/address/${address}`),
      esplora(`/address/${address}/txs`),
      esplora(`/address/${address}/utxo`).catch(() => []),
    ]);

    const confirmed   = (addrData.chain_stats.funded_txo_sum  - addrData.chain_stats.spent_txo_sum);
    const unconfirmed = (addrData.mempool_stats.funded_txo_sum - addrData.mempool_stats.spent_txo_sum);

    const recentTxs: UserWalletTx[] = (txsRaw as any[]).slice(0, 10).map((tx: any) => {
      // Net value for this address: sum outputs to addr minus sum inputs from addr
      let netSats = 0;
      for (const vout of (tx.vout ?? [])) {
        if (vout.scriptpubkey_address === address) netSats += vout.value;
      }
      for (const vin of (tx.vin ?? [])) {
        if (vin.prevout?.scriptpubkey_address === address) netSats -= vin.prevout.value;
      }
      return {
        txid:       tx.txid,
        confirmed:  !!tx.status?.confirmed,
        value:      netSats,
        blockHeight: tx.status?.block_height,
        blockTime:   tx.status?.block_time,
      };
    });

    const data: UserWalletData = {
      address,
      confirmed,
      unconfirmed,
      total: confirmed + unconfirmed,
      txCount:   addrData.chain_stats.tx_count + addrData.mempool_stats.tx_count,
      utxoCount: (utxos as any[]).length,
      recentTxs,
      checkedAt: new Date().toISOString(),
    };

    _userWalletCache.set(address, { data, cachedAt: Date.now() });
    return data;
  } catch (e: any) {
    console.warn(`[Sentinel] User wallet fetch error for ${address.slice(0, 12)}…:`, e.message);
    return null;
  }
}

/** In-flight guard — prevents overlapping batch-poll runs. */
let _userPollRunning = false;

/** Batch-poll ALL registered user addresses (runs non-blocking after each service-wallet cycle). */
async function pollUserWallets(): Promise<void> {
  if (_userPollRunning) return; // prevent overlap
  _userPollRunning = true;
  try {
    const { db } = await import("./db");
    const { sql: S } = await import("drizzle-orm");
    // Page through all rows — no LIMIT so every registered address is covered
    const PAGE = 50;
    let offset = 0;
    while (true) {
      const rows = await db.execute(S`
        SELECT btc_address FROM btc_address_registry
        ORDER BY id OFFSET ${offset} LIMIT ${PAGE}
      `);
      const page = (rows.rows as any[]);
      if (page.length === 0) break;
      for (const row of page) {
        if (!_running) return; // bail if sentinel stopped
        await fetchUserWallet(row.btc_address).catch(() => {});
        // Small delay between addresses to stay polite to the API
        await new Promise(r => setTimeout(r, 400));
      }
      if (page.length < PAGE) break; // last page
      offset += PAGE;
    }
  } catch { /* table may not exist yet — silently skip */ }
  finally { _userPollRunning = false; }
}

/** Public: fetch user wallet data from cache or live. Used by the API proxy endpoint. */
export async function getOrFetchUserWallet(address: string): Promise<UserWalletData | null> {
  const cached = getUserWalletSnapshot(address);
  if (cached) return cached;
  return fetchUserWallet(address);
}
