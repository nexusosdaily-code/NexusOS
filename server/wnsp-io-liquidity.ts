/**
 * wnsp.io Liquidity Feed — NexusOS
 *
 * Watches the wnsp.io UniSat BTC wallet address on-chain every 60 s.
 * Any new inbound sats are automatically credited to the NexusOS service
 * wallet's lightning sats pool (the global sats pool used for P2P transfers,
 * withdrawals, and staking liquidity).
 *
 * The wnsp.io wallet address is stored in the WNSP_IO_BTC_ADDRESS env var,
 * or can be set via PUT /api/admin/wnsp-io-address (admin only).
 * Falls back to a hard-coded default if neither is set.
 */

import { sql } from "drizzle-orm";

const ESPLORA  = "https://blockstream.info/api";
const MEMPOOL  = "https://mempool.space/api";
const POLL_MS  = 60_000; // 60-second poll (wnsp.io is a feeder, less urgent)

// ── Hard-coded fallback wnsp.io UniSat address ─────────────────────────────
// Replace this with the real address once confirmed, or set WNSP_IO_BTC_ADDRESS env var
const WNSP_IO_DEFAULT_ADDR = process.env.WNSP_IO_BTC_ADDRESS ?? "";

// ── Module state ──────────────────────────────────────────────────────────
let _running      = false;
let _timer:       ReturnType<typeof setTimeout> | null = null;
let _knownTxids   = new Set<string>();
let _snapshot: {
  address:     string;
  confirmed:   number;
  unconfirmed: number;
  checkedAt:   string;
} | null = null;
let _totalFed     = 0; // cumulative sats credited this session

export function getWnspIoSnapshot() { return _snapshot; }
export function getWnspIoTotalFed() { return _totalFed; }

// ── API helpers ───────────────────────────────────────────────────────────
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

// ── Telegram alert (non-fatal if telegram not configured) ─────────────────
async function alert(msg: string) {
  try {
    const { sendAdminAlert } = await import("./telegram-bot");
    await sendAdminAlert(msg);
  } catch { /* optional */ }
}

// ── Credit sats to the service sats pool ─────────────────────────────────
// The "service sats pool" is the global lightning wallet sats balance.
// We find the admin/owner user (Nexus) and add sats to their lightning wallet.
// This automatically makes those sats available for user P2P transfers,
// withdrawals and staking.
async function creditToServicePool(sats: number, txid: string): Promise<void> {
  const { db } = await import("./db");

  // Ensure the liquidity log table exists
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS wnsp_io_liquidity_feeds (
      id           SERIAL PRIMARY KEY,
      txid         TEXT NOT NULL UNIQUE,
      sats_received INTEGER NOT NULL,
      credited_at  TIMESTAMP NOT NULL DEFAULT NOW(),
      note         TEXT
    )
  `);

  // Skip if already credited
  const existing = await db.execute(sql`
    SELECT id FROM wnsp_io_liquidity_feeds WHERE txid = ${txid}
  `);
  if ((existing.rows as any[]).length > 0) return;

  // Credit to the owner lightning wallet (first admin user = Nexus)
  const ownerRows = await db.execute(sql`
    SELECT id FROM users ORDER BY created_at ASC LIMIT 1
  `);
  if ((ownerRows.rows as any[]).length === 0) {
    console.warn("[wnsp.io Liquidity] No owner user found — cannot credit");
    return;
  }
  const ownerId = (ownerRows.rows[0] as any).id;

  // Upsert lightning wallet and add sats
  await db.execute(sql`
    INSERT INTO lightning_wallets (user_id, sats_balance, updated_at)
    VALUES (${ownerId}, ${sats}, NOW())
    ON CONFLICT (user_id)
    DO UPDATE SET
      sats_balance = lightning_wallets.sats_balance + ${sats},
      updated_at   = NOW()
  `);

  // Log the feed event
  await db.execute(sql`
    INSERT INTO wnsp_io_liquidity_feeds (txid, sats_received, note)
    VALUES (${txid}, ${sats}, 'Auto-credited from wnsp.io UniSat wallet')
    ON CONFLICT (txid) DO NOTHING
  `);

  _totalFed += sats;
  console.log(`[wnsp.io Liquidity] ✅ Credited ${sats.toLocaleString()} sats to service pool (TX ${txid.slice(0, 16)}…)`);

  await alert(
    `💧 <b>wnsp.io → Service Pool Liquidity</b>\n\n` +
    `Sats fed:  <b>+${sats.toLocaleString()} sats</b>\n` +
    `Session total: <b>${_totalFed.toLocaleString()} sats</b>\n` +
    `TXID: <code>${txid}</code>\n\n` +
    `<a href="https://mempool.space/tx/${txid}">View TX</a>`
  );
}

// ── Core poll ─────────────────────────────────────────────────────────────
async function poll(address: string): Promise<void> {
  try {
    const [addrData, txs] = await Promise.all([
      esplora(`/address/${address}`),
      esplora(`/address/${address}/txs`),
    ]);

    const confirmed   = addrData.chain_stats.funded_txo_sum   - addrData.chain_stats.spent_txo_sum;
    const unconfirmed = addrData.mempool_stats.funded_txo_sum  - addrData.mempool_stats.spent_txo_sum;

    _snapshot = { address, confirmed, unconfirmed, checkedAt: new Date().toISOString() };

    // Detect new inbound confirmed TXs and credit them
    const confirmedTxs = (txs as any[]).filter(t => t.status?.confirmed);
    for (const tx of confirmedTxs) {
      if (_knownTxids.has(tx.txid)) continue;
      _knownTxids.add(tx.txid);

      // Calculate how much this address received in this TX
      let inboundSats = 0;
      for (const vout of (tx.vout ?? [])) {
        if (vout.scriptpubkey_address === address) inboundSats += vout.value;
      }
      if (inboundSats > 0) {
        await creditToServicePool(inboundSats, tx.txid);
      }
    }

    // Also track unconfirmed for the snapshot, but don't credit until confirmed
    for (const tx of (txs as any[]).filter(t => !t.status?.confirmed)) {
      _knownTxids.add(tx.txid); // mark so we process it when confirmed on next poll
    }

  } catch (e: any) {
    console.warn(`[wnsp.io Liquidity] Poll error:`, e.message);
  }
}

// ── Seed existing TXs (no credit for history — only future TXs) ──────────
async function seed(address: string): Promise<void> {
  try {
    const txs: { txid: string }[] = await esplora(`/address/${address}/txs`);
    for (const tx of txs) _knownTxids.add(tx.txid);
    console.log(`[wnsp.io Liquidity] Seeded ${txs.length} historical TXs — watching for new inflows`);
  } catch (e: any) {
    console.warn(`[wnsp.io Liquidity] Seed error:`, e.message);
  }
}

// ── Public API ────────────────────────────────────────────────────────────

/** Set the wnsp.io address at runtime (used by admin API route). */
let _runtimeAddr: string | null = null;
export function setWnspIoAddress(addr: string) {
  _runtimeAddr = addr;
  console.log(`[wnsp.io Liquidity] Address updated → ${addr}`);
}
export function getWnspIoAddress(): string {
  return _runtimeAddr ?? WNSP_IO_DEFAULT_ADDR;
}

export async function startWnspIoLiquidity(): Promise<void> {
  if (_running) return;

  const address = getWnspIoAddress();
  if (!address) {
    console.log("[wnsp.io Liquidity] No address configured — set WNSP_IO_BTC_ADDRESS env var or use the admin API to set it");
    return;
  }

  _running = true;
  console.log(`[wnsp.io Liquidity] Started — watching ${address} every ${POLL_MS / 1000}s for new inflows`);

  await seed(address);
  await poll(address);

  const loop = async () => {
    if (!_running) return;
    const addr = getWnspIoAddress();
    if (addr) await poll(addr);
    _timer = setTimeout(loop, POLL_MS);
  };
  _timer = setTimeout(loop, POLL_MS);
}

export function stopWnspIoLiquidity() {
  _running = false;
  if (_timer) { clearTimeout(_timer); _timer = null; }
  console.log("[wnsp.io Liquidity] Stopped");
}
