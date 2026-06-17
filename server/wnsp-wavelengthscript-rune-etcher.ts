/**
 * WNSP•WAVELENGTHSCRIPT Rune Etcher — NexusOS
 *
 * Single-TX etch (no commitment required — name is 20 characters, > 13 char threshold).
 *
 * Rune spec:
 *   Name        : WNSP•WAVELENGTHSCRIPT
 *   Supply      : 21,000,000,000.00000000  (21 billion × 10^8 base units)
 *   Divisibility: 8
 *   Symbol      : Ψ  (U+03A8)
 *   Premine     : 100% to service wallet — no open minting
 */

import * as bitcoin from "bitcoinjs-lib";
import * as tinysecp from "tiny-secp256k1";
import { ECPairFactory } from "ecpair";
import { getServiceWallet, getUTXOs, getSafeUTXOs, getFeeRate } from "./btc-inscription-engine.js";

bitcoin.initEccLib(tinysecp);
const ECPair  = ECPairFactory(tinysecp);
const NETWORK = bitcoin.networks.bitcoin;
const ESPLORA = "https://blockstream.info/api";
const MEMPOOL = "https://mempool.space/api";

// ── Config ────────────────────────────────────────────────────────────────────
const ETCH_THRESHOLD_SATS = 8_000;
const CHECK_INTERVAL_MS   = 60_000;

// ── WNSP•WAVELENGTHSCRIPT Rune spec ──────────────────────────────────────────
// "WNSPWAVELENGTHSCRIPT" (20 chars) — ord base-26 encoding gives:
//   18,063,739,397,869,409,947,070,632,023
const RUNE_NAME_INT     = 18063739397869409947070632023n;
const RUNE_SPACERS      = 8n;                         // bit 3 → WNSP•WAVELENGTHSCRIPT
const RUNE_DIVISIBILITY = 8n;
const RUNE_SYMBOL       = 936n;                       // Ψ (U+03A8)
const RUNE_SUPPLY       = 2_100_000_000_000_000_000n; // 21B × 10^8 base units
const DUST              = 546n;

// ── LEB128 varint encoder ─────────────────────────────────────────────────────
function encodeVarint(n: bigint): Buffer {
  if (n < 0n) throw new Error("Varint must be non-negative");
  const bytes: number[] = [];
  do {
    let byte = Number(n & 0x7fn);
    n >>= 7n;
    if (n > 0n) byte |= 0x80;
    bytes.push(byte);
  } while (n > 0n);
  return Buffer.from(bytes);
}

// ── Build the Etch Runestone OP_RETURN script ──────────────────────────────────
function buildEtchRunestone(premineOutputIdx: number): Buffer {
  const integers: bigint[] = [
    2n,  1n,                         // Tag 2  → Flags = 1 (etch bit)
    4n,  RUNE_NAME_INT,              // Tag 4  → Rune name integer
    3n,  RUNE_DIVISIBILITY,          // Tag 3  → Divisibility = 8
    5n,  RUNE_SPACERS,               // Tag 5  → Spacers
    7n,  RUNE_SYMBOL,                // Tag 7  → Symbol Ψ
    6n,  RUNE_SUPPLY,                // Tag 6  → Premine = full supply
    22n, BigInt(premineOutputIdx),   // Tag 22 → Pointer
  ];
  const payload = Buffer.concat(integers.map(encodeVarint));
  const len = payload.length;
  let prefix: Buffer;
  if      (len <= 75)  prefix = Buffer.from([len]);
  else if (len <= 255) prefix = Buffer.from([0x4c, len]);
  else                 prefix = Buffer.from([0x4d, len & 0xff, (len >> 8) & 0xff]);
  return Buffer.concat([Buffer.from([0x6a, 0x5d]), prefix, payload]);
}

// ── Broadcast helper ──────────────────────────────────────────────────────────
async function broadcast(hex: string): Promise<string> {
  for (const url of [`${ESPLORA}/tx`, `${MEMPOOL}/tx`]) {
    try {
      const r = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: hex,
        signal: AbortSignal.timeout(15_000),
      });
      if (r.ok) return (await r.text()).trim();
    } catch { /* try next */ }
  }
  throw new Error("Failed to broadcast TX via all endpoints");
}

// ── Telegram alert (optional) ─────────────────────────────────────────────────
async function tgAlert(msg: string) {
  try {
    const { sendAdminAlert } = await import("./telegram-bot");
    await sendAdminAlert(msg);
  } catch { /* optional */ }
}

// ── DB state helpers ──────────────────────────────────────────────────────────
async function ensureTable() {
  const { db } = await import("./db");
  const { sql } = await import("drizzle-orm");
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS wnsp_wavelengthscript_etch_state (
      id         SERIAL PRIMARY KEY,
      status     TEXT NOT NULL DEFAULT 'pending',
      etch_txid  TEXT,
      rune_id    TEXT,
      sats_used  INTEGER,
      fee_rate   INTEGER,
      etched_at  TIMESTAMP,
      error_msg  TEXT,
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);
  const rows = await db.execute(sql`SELECT id FROM wnsp_wavelengthscript_etch_state LIMIT 1`);
  if ((rows.rows as any[]).length === 0) {
    await db.execute(sql`INSERT INTO wnsp_wavelengthscript_etch_state (status) VALUES ('pending')`);
  }
}

async function getState(): Promise<{ status: string; etch_txid: string | null }> {
  const { db } = await import("./db");
  const { sql } = await import("drizzle-orm");
  const rows = await db.execute(sql`
    SELECT status, etch_txid FROM wnsp_wavelengthscript_etch_state ORDER BY id LIMIT 1
  `);
  const r = (rows.rows as any[])[0];
  return r ?? { status: "pending", etch_txid: null };
}

async function setState(status: string, extra: Record<string, any> = {}) {
  const { db } = await import("./db");
  const { sql } = await import("drizzle-orm");
  const fields = Object.entries(extra)
    .map(([k, v]) => `${k} = '${String(v).replace(/'/g, "''")}'`)
    .join(", ");
  const fieldsSql = fields ? `, ${fields}` : "";
  await db.execute(sql.raw(
    `UPDATE wnsp_wavelengthscript_etch_state SET status = '${status}', updated_at = NOW()${fieldsSql}`
  ));
}

// ── Single-TX etch ────────────────────────────────────────────────────────────
async function etchWnspWavelengthscript(): Promise<string> {
  const wallet = getServiceWallet();
  if (!wallet) throw new Error("BTC_INSCRIPTION_WALLET_WIF not set");

  const internalPubkey = Buffer.from(wallet.keyPair.publicKey).slice(1, 33);
  const feeRate = await getFeeRate("medium");

  const { utxos: safeUtxos, blockedCount } = await getSafeUTXOs(wallet.address);
  if (blockedCount > 0) {
    console.warn(`[WNSP•WAVELENGTHSCRIPT Etcher] 🛡️ Rune Guard blocked ${blockedCount} UTXO(s)`);
  }
  const utxos = safeUtxos.filter(u => u.status.confirmed);
  if (utxos.length === 0) throw new Error("No confirmed UTXOs available");

  // Estimate fee: P2TR key-path inputs + 3 outputs (premine, OP_RETURN, change)
  const estimatedVbytes = 200 + utxos.length * 58;
  const fee = BigInt(estimatedVbytes * feeRate);

  const totalIn  = utxos.reduce((s, u) => s + BigInt(u.value), 0n);
  const change   = totalIn - DUST - fee;
  if (change < 0n) throw new Error(`Insufficient sats — need ${DUST + fee}, have ${totalIn}`);

  // Tweaked keypair for key-path P2TR spend
  const rawPrivKey  = wallet.keyPair.privateKey!;
  const tweak       = bitcoin.crypto.taggedHash("TapTweak", internalPubkey);
  const tweakedPriv = Buffer.from(tinysecp.privateAdd(rawPrivKey, tweak)!);
  const tweakedKP   = ECPair.fromPrivateKey(tweakedPriv, { network: NETWORK });

  const psbt = new bitcoin.Psbt({ network: NETWORK });
  for (const u of utxos) {
    psbt.addInput({
      hash: u.txid,
      index: u.vout,
      witnessUtxo: { script: wallet.p2tr.output!, value: BigInt(u.value) },
      tapInternalKey: internalPubkey,
    });
  }

  // Output 0: premine recipient (service wallet, Pointer=0)
  psbt.addOutput({ address: wallet.address, value: DUST });
  // Output 1: Runestone OP_RETURN
  psbt.addOutput({ script: buildEtchRunestone(0), value: 0n });
  // Output 2: change
  if (change > DUST) {
    psbt.addOutput({ address: wallet.address, value: change });
  }

  for (let i = 0; i < utxos.length; i++) {
    psbt.signInput(i, tweakedKP);
  }
  psbt.finalizeAllInputs();

  const txHex  = psbt.extractTransaction().toHex();
  const txid   = await broadcast(txHex);
  const feeSats = Number(fee);

  await setState("etched", {
    etch_txid: txid,
    sats_used: feeSats,
    fee_rate:  feeRate,
    etched_at: new Date().toISOString().replace("T", " ").slice(0, 19),
  });

  console.log(`[WNSP•WAVELENGTHSCRIPT Etcher] ✅ Etch TX broadcast! TXID: ${txid}`);

  await tgAlert(
    `🔥 <b>WNSP•WAVELENGTHSCRIPT Rune Etched!</b>\n\n` +
    `Name:    <b>WNSP•WAVELENGTHSCRIPT</b>\n` +
    `Symbol:  <b>Ψ</b>\n` +
    `Supply:  <b>21,000,000,000.00000000</b>\n` +
    `Div:     8 decimals\n` +
    `Premine: 100% to service wallet\n\n` +
    `TXID: <code>${txid}</code>\n` +
    `Fee:  ${feeSats.toLocaleString()} sats @ ${feeRate} sat/vB\n\n` +
    `<a href="https://mempool.space/tx/${txid}">Watch on mempool.space</a>`
  );

  try {
    const { sendChannelPost } = await import("./telegram-bot");
    await sendChannelPost(
      `⚡ <b>WNSP•WAVELENGTHSCRIPT IS LIVE ON BITCOIN</b> ⚡\n\n` +
      `🔷 Ticker:   <b>WNSP•WAVELENGTHSCRIPT</b>\n` +
      `🔷 Symbol:   <b>Ψ</b>\n` +
      `🔷 Supply:   <b>21,000,000,000</b> (8 decimals)\n` +
      `🔷 Premine:  100% to NexusOS service wallet\n\n` +
      `WNSP•WAVELENGTHSCRIPT is the canonical Bitcoin Rune for WavelengthScript — the spectral programming language of NexusOS.\n\n` +
      `🔗 <a href="https://mempool.space/tx/${txid}">View on mempool.space</a>\n` +
      `🌐 <a href="https://wnsp.io">wnsp.io</a>\n\n#WNSPWAVELENGTHSCRIPT #Bitcoin #Runes #NexusOS`
    );
  } catch { /* optional */ }

  try {
    const { publishToNostr } = await import("./nostr-service");
    await publishToNostr({
      content:
        `⚡ WNSP•WAVELENGTHSCRIPT IS LIVE ON BITCOIN ⚡\n\n` +
        `Ticker: WNSP•WAVELENGTHSCRIPT | Symbol: Ψ | Supply: 21B (8 dec)\n` +
        `The canonical Bitcoin Rune for the WavelengthScript spectral language.\n\n` +
        `TX: ${txid}\nApp: https://wnsp.io\n\n#WNSPWAVELENGTHSCRIPT #Bitcoin #Runes`,
      tags: [
        ["t", "WNSPWAVELENGTHSCRIPT"], ["t", "Bitcoin"], ["t", "Runes"],
        ["r", `https://mempool.space/tx/${txid}`], ["r", "https://wnsp.io"],
      ],
    });
  } catch { /* optional */ }

  return txid;
}

// ── Watcher loop ──────────────────────────────────────────────────────────────
let _watcherRunning = false;

export async function startWnspWavelengthscriptEtcher() {
  if (_watcherRunning) return;
  _watcherRunning = true;

  try { await ensureTable(); }
  catch (e: any) {
    console.error("[WNSP•WAVELENGTHSCRIPT Etcher] Table error:", e.message);
    return;
  }

  const state = await getState();
  if (state.status === "etched") {
    console.log(`[WNSP•WAVELENGTHSCRIPT Etcher] Already etched — TXID: ${state.etch_txid}. Idle.`);
    _watcherRunning = false;
    return;
  }

  console.log(`[WNSP•WAVELENGTHSCRIPT Etcher] Watching for ${ETCH_THRESHOLD_SATS.toLocaleString()} sats to auto-etch…`);

  const check = async () => {
    if (!_watcherRunning) return;
    try {
      const current = await getState();
      if (current.status === "etched") {
        console.log("[WNSP•WAVELENGTHSCRIPT Etcher] ✅ Done — watcher idle.");
        _watcherRunning = false;
        return;
      }
      if (current.status === "in_progress") {
        setTimeout(check, CHECK_INTERVAL_MS);
        return;
      }

      const wallet = getServiceWallet();
      if (!wallet) { setTimeout(check, CHECK_INTERVAL_MS); return; }

      const utxos       = await getUTXOs(wallet.address);
      const spendable   = utxos.filter(u => u.status.confirmed).reduce((s, u) => s + u.value, 0);
      const unconfirmed = utxos.filter(u => !u.status.confirmed).reduce((s, u) => s + u.value, 0);

      if (spendable < ETCH_THRESHOLD_SATS) {
        console.log(`[WNSP•WAVELENGTHSCRIPT Etcher] ${spendable.toLocaleString()} / ${ETCH_THRESHOLD_SATS.toLocaleString()} sats (${unconfirmed.toLocaleString()} unconfirmed)`);
        setTimeout(check, CHECK_INTERVAL_MS);
        return;
      }

      console.log(`[WNSP•WAVELENGTHSCRIPT Etcher] 🚀 Balance OK — etching now…`);
      await setState("in_progress");
      await tgAlert(
        `🚀 <b>WNSP•WAVELENGTHSCRIPT Etch Triggered!</b>\n` +
        `Service wallet: <b>${spendable.toLocaleString()} sats</b>`
      );
      await etchWnspWavelengthscript();

    } catch (e: any) {
      console.error("[WNSP•WAVELENGTHSCRIPT Etcher] Error:", e.message);
      await setState("error", { error_msg: e.message.slice(0, 200) });
      await tgAlert(`❌ <b>WNSP•WAVELENGTHSCRIPT Etch Error</b>\n<code>${e.message.slice(0, 200)}</code>`);
      setTimeout(async () => { await setState("pending"); setTimeout(check, CHECK_INTERVAL_MS); }, 60_000);
    }
  };

  setTimeout(check, 30_000);
}

// ── Public status ─────────────────────────────────────────────────────────────
export async function getWlsEtchStatus() {
  try {
    await ensureTable();
    const state = await getState();
    let confirmed = 0, unconfirmed = 0, address = "";
    try {
      const wallet = getServiceWallet();
      if (wallet) {
        address = wallet.address;
        const utxos = await getUTXOs(wallet.address);
        confirmed   = utxos.filter(u =>  u.status.confirmed).reduce((s, u) => s + u.value, 0);
        unconfirmed = utxos.filter(u => !u.status.confirmed).reduce((s, u) => s + u.value, 0);
      }
    } catch { /* wallet not ready */ }
    return { ...state, confirmed, unconfirmed, address, etchThreshold: ETCH_THRESHOLD_SATS };
  } catch {
    return { status: "unknown", etch_txid: null, confirmed: 0, unconfirmed: 0 };
  }
}

// ── Force trigger (admin) ─────────────────────────────────────────────────────
export async function forceWlsEtch(): Promise<{ ok: boolean; txid?: string; error?: string }> {
  try {
    await ensureTable();
    const state = await getState();
    if (state.status === "etched")      return { ok: false, error: `Already etched — ${state.etch_txid}` };
    if (state.status === "in_progress") return { ok: false, error: "In progress" };
    await setState("in_progress");
    await etchWnspWavelengthscript();
    const newState = await getState();
    return { ok: true, txid: newState.etch_txid ?? undefined };
  } catch (e: any) {
    await setState("pending", { error_msg: e.message.slice(0, 200) });
    return { ok: false, error: e.message };
  }
}
