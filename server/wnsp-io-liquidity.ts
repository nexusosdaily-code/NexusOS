/**
 * Multi-Wallet BTC Liquidity Watcher — NexusOS
 *
 * Watches any number of BTC addresses (UniSat, Ledger, any wallet).
 * Every confirmed inbound TX at any watched address is automatically
 * credited to the Nexus admin sats balance.
 *
 * Addresses are persisted in `watched_btc_wallets` (survives restarts).
 * Poll interval: 60 s per address.
 */

import { sql } from "drizzle-orm";

const ESPLORA = "https://blockstream.info/api";
const MEMPOOL = "https://mempool.space/api";
const POLL_MS = 60_000;

// ── Per-address state ─────────────────────────────────────────────────────
interface WalletState {
  address:   string;
  label:     string;
  knownTxids: Set<string>;
  snapshot: {
    confirmed:   number;
    unconfirmed: number;
    checkedAt:   string;
  } | null;
  satsFed: number; // credited this session
}

const _wallets = new Map<string, WalletState>();
let _running  = false;
let _timer:   ReturnType<typeof setTimeout> | null = null;
let _totalFed = 0;

// ── Helpers ───────────────────────────────────────────────────────────────
async function fetchJson(url: string): Promise<any> {
  const r = await fetch(url, {
    signal: AbortSignal.timeout(15_000),
    headers: { Accept: "application/json" },
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

async function esplora(path: string): Promise<any> {
  try  { return await fetchJson(`${ESPLORA}${path}`); }
  catch { return await fetchJson(`${MEMPOOL}${path}`); }
}

async function tgAlert(msg: string) {
  try {
    const { sendAdminAlert } = await import("./telegram-bot");
    await sendAdminAlert(msg);
  } catch { /* optional */ }
}

// ── DB helpers ────────────────────────────────────────────────────────────
async function ensureTables() {
  const { db } = await import("./db");
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS watched_btc_wallets (
      address     TEXT PRIMARY KEY,
      label       TEXT NOT NULL DEFAULT '',
      added_at    TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS watched_btc_feeds (
      id           SERIAL PRIMARY KEY,
      address      TEXT NOT NULL,
      txid         TEXT NOT NULL UNIQUE,
      sats_received INTEGER NOT NULL,
      credited_at  TIMESTAMP NOT NULL DEFAULT NOW(),
      note         TEXT
    )
  `);
}

async function loadPersistedAddresses(): Promise<{ address: string; label: string }[]> {
  try {
    const { db } = await import("./db");
    const rows = await db.execute(sql`SELECT address, label FROM watched_btc_wallets ORDER BY added_at ASC`);
    return (rows.rows as any[]).map(r => ({ address: r.address, label: r.label ?? "" }));
  } catch { return []; }
}

async function persistAddress(address: string, label: string) {
  const { db } = await import("./db");
  await db.execute(sql`
    INSERT INTO watched_btc_wallets (address, label)
    VALUES (${address}, ${label})
    ON CONFLICT (address) DO UPDATE SET label = ${label}
  `);
}

async function unpersistAddress(address: string) {
  const { db } = await import("./db");
  await db.execute(sql`DELETE FROM watched_btc_wallets WHERE address = ${address}`);
}

async function isAlreadyCredited(txid: string): Promise<boolean> {
  const { db } = await import("./db");
  const rows = await db.execute(sql`SELECT id FROM watched_btc_feeds WHERE txid = ${txid}`);
  return (rows.rows as any[]).length > 0;
}

async function creditToBalance(sats: number, txid: string, address: string, label: string) {
  const { db } = await import("./db");

  // Find owner (first user = Nexus admin)
  const ownerRows = await db.execute(sql`SELECT id FROM users ORDER BY created_at ASC LIMIT 1`);
  if ((ownerRows.rows as any[]).length === 0) return;
  const ownerId = (ownerRows.rows[0] as any).id;

  await db.execute(sql`
    INSERT INTO lightning_wallets (user_id, sats_balance, updated_at)
    VALUES (${ownerId}, ${sats}, NOW())
    ON CONFLICT (user_id)
    DO UPDATE SET
      sats_balance = lightning_wallets.sats_balance + ${sats},
      updated_at   = NOW()
  `);

  await db.execute(sql`
    INSERT INTO watched_btc_feeds (address, txid, sats_received, note)
    VALUES (${address}, ${txid}, ${sats}, ${`Auto-credited from ${label || address}`})
    ON CONFLICT (txid) DO NOTHING
  `);

  const w = _wallets.get(address);
  if (w) w.satsFed += sats;
  _totalFed += sats;

  console.log(`[BTC Watcher] ✅ +${sats.toLocaleString()} sats from ${label || address} (TX ${txid.slice(0, 14)}…)`);

  await tgAlert(
    `💰 <b>BTC Received → NexusOS Sats</b>\n\n` +
    `Wallet: <b>${label || address.slice(0, 20)}…</b>\n` +
    `Sats:   <b>+${sats.toLocaleString()} sats</b>\n` +
    `Total session: <b>${_totalFed.toLocaleString()} sats</b>\n` +
    `TXID: <code>${txid}</code>\n` +
    `<a href="https://mempool.space/tx/${txid}">View TX</a>`
  );
}

// ── Seed & poll ───────────────────────────────────────────────────────────
async function seedAddress(w: WalletState) {
  try {
    const txs: { txid: string }[] = await esplora(`/address/${w.address}/txs`);
    for (const tx of txs) w.knownTxids.add(tx.txid);
    console.log(`[BTC Watcher] Seeded ${txs.length} existing TXs for ${w.label || w.address.slice(0, 16)}…`);
  } catch (e: any) {
    console.warn(`[BTC Watcher] Seed error for ${w.address}: ${e.message}`);
  }
}

async function pollAddress(w: WalletState) {
  try {
    const [addrData, txs] = await Promise.all([
      esplora(`/address/${w.address}`),
      esplora(`/address/${w.address}/txs`),
    ]);

    const confirmed   = addrData.chain_stats.funded_txo_sum  - addrData.chain_stats.spent_txo_sum;
    const unconfirmed = addrData.mempool_stats.funded_txo_sum - addrData.mempool_stats.spent_txo_sum;
    w.snapshot = { confirmed, unconfirmed, checkedAt: new Date().toISOString() };

    // Credit new confirmed inbound TXs
    for (const tx of (txs as any[]).filter(t => t.status?.confirmed)) {
      if (w.knownTxids.has(tx.txid)) continue;
      w.knownTxids.add(tx.txid);

      let inbound = 0;
      for (const vout of (tx.vout ?? [])) {
        if (vout.scriptpubkey_address === w.address) inbound += vout.value;
      }

      if (inbound > 0) {
        if (!(await isAlreadyCredited(tx.txid))) {
          await creditToBalance(inbound, tx.txid, w.address, w.label);
        }
      }
    }

    // Track unconfirmed so we detect them when confirmed
    for (const tx of (txs as any[]).filter(t => !t.status?.confirmed)) {
      w.knownTxids.add(tx.txid);
    }
  } catch (e: any) {
    console.warn(`[BTC Watcher] Poll error for ${w.address}: ${e.message}`);
  }
}

// ── Main loop ─────────────────────────────────────────────────────────────
async function loop() {
  if (!_running) return;
  await Promise.allSettled([..._wallets.values()].map(pollAddress));
  _timer = setTimeout(loop, POLL_MS);
}

// ── Public API ────────────────────────────────────────────────────────────

export function getWatchedWallets() {
  return [..._wallets.values()].map(w => ({
    address:   w.address,
    label:     w.label,
    snapshot:  w.snapshot,
    satsFed:   w.satsFed,
  }));
}

export function getWalletSnapshot(address: string) {
  return _wallets.get(address)?.snapshot ?? null;
}

export function getTotalFed() { return _totalFed; }

export async function addWatchedWallet(address: string, label = ""): Promise<void> {
  if (_wallets.has(address)) {
    // Update label only
    _wallets.get(address)!.label = label;
    await persistAddress(address, label);
    return;
  }

  const w: WalletState = { address, label, knownTxids: new Set(), snapshot: null, satsFed: 0 };
  _wallets.set(address, w);
  await persistAddress(address, label);

  console.log(`[BTC Watcher] + Watching ${label || address}`);

  // Seed immediately so we don't double-credit history
  await seedAddress(w);
  // Initial poll
  await pollAddress(w);

  // Make sure the loop is running
  if (!_running) {
    _running = true;
    _timer = setTimeout(loop, POLL_MS);
  }
}

export async function removeWatchedWallet(address: string): Promise<void> {
  _wallets.delete(address);
  await unpersistAddress(address);
  console.log(`[BTC Watcher] - Removed ${address}`);
}

// Legacy compat — used by old single-address admin route
export async function setWnspIoAddress(addr: string) {
  await addWatchedWallet(addr, "wnsp.io UniSat");
}
export function getWnspIoAddress(): string {
  return [..._wallets.keys()][0] ?? "";
}
export function getWnspIoSnapshot() {
  return [..._wallets.values()][0]?.snapshot ?? null;
}
export function getWnspIoTotalFed() { return _totalFed; }

export async function startWnspIoLiquidity(): Promise<void> {
  await ensureTables();

  // Load persisted addresses
  const saved = await loadPersistedAddresses();

  // Also check env var fallback
  const envAddr = process.env.WNSP_IO_BTC_ADDRESS;
  if (envAddr && !saved.find(s => s.address === envAddr)) {
    saved.push({ address: envAddr, label: "wnsp.io (env)" });
  }

  if (saved.length === 0) {
    console.log("[BTC Watcher] No addresses configured — add via UniSat tab or admin API");
    return;
  }

  _running = true;

  // Seed all, then start polling
  for (const { address, label } of saved) {
    const w: WalletState = { address, label, knownTxids: new Set(), snapshot: null, satsFed: 0 };
    _wallets.set(address, w);
    await seedAddress(w);
    await pollAddress(w);
  }

  console.log(`[BTC Watcher] Started — watching ${saved.length} wallet(s) every ${POLL_MS / 1000}s`);
  _timer = setTimeout(loop, POLL_MS);
}

export function stopWnspIoLiquidity() {
  _running = false;
  if (_timer) { clearTimeout(_timer); _timer = null; }
  console.log("[BTC Watcher] Stopped");
}
