/**
 * WNSP•BTC Rune Auto-Etcher — NexusOS
 *
 * Watches the service wallet via the Sentinel. The moment confirmed sats
 * cross ETCH_THRESHOLD, it automatically etches the WNSP•BTC Rune on Bitcoin:
 *
 *   Name        : WNSP•BTC
 *   Supply      : 21,000,000,000.00000000  (matches NXT exactly)
 *   Divisibility: 8
 *   Symbol      : Ψ
 *   Premine     : 100% to service wallet (no open minting)
 *
 * Only fires ONCE — guarded by wnsp_btc_etch_state table in PostgreSQL.
 * Sends Telegram alert when etched + a mempool link to watch confirmation.
 */

import * as bitcoin from "bitcoinjs-lib";
import * as tinysecp from "tiny-secp256k1";
import { ECPairFactory } from "ecpair";
import { getServiceWallet, getUTXOs, getFeeRate } from "./btc-inscription-engine.js";

bitcoin.initEccLib(tinysecp);
const ECPair  = ECPairFactory(tinysecp);
const NETWORK = bitcoin.networks.bitcoin;
const ESPLORA = "https://blockstream.info/api";
const MEMPOOL = "https://mempool.space/api";

// ── Config ────────────────────────────────────────────────────────────────────
const ETCH_THRESHOLD_SATS = 50_000;   // confirmed sats needed before etching
const CHECK_INTERVAL_MS   = 60_000;   // re-check every 60 s after server boot

// ── WNSP•BTC Rune spec ────────────────────────────────────────────────────────
// Rune name "WNSPBTC" encoded as a base-26 integer (ord protocol):
//   each char: x = (x+1)*26 + (char - 'A')  from left to right, except first
//   W=22 → N → S → P → B → T → C = 7,280,367,746
const RUNE_NAME_INT   = 7_280_367_746n;
const RUNE_SPACERS    = 8n;            // bullet at position 3 → WNSP•BTC
const RUNE_DIVISIBILITY = 8n;         // 8 decimal places (matches NXT)
const RUNE_SYMBOL     = 936n;         // Ψ  (U+03A8)
const RUNE_SUPPLY     = 2_100_000_000_000_000_000n; // 21B × 10^8 base units
const DUST            = 546n;

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
// Runestone layout for a full-premine etch (no open minting):
//   Tag 2  → Flags    = 1  (etch bit set; no mint-terms bit)
//   Tag 4  → Rune     = name integer
//   Tag 3  → Divisibility
//   Tag 5  → Spacers
//   Tag 7  → Symbol
//   Tag 6  → Premine  = full 21B supply
//   Tag 22 → Pointer  = 0  (output 0 receives all premined runes)
function buildEtchRunestone(premineOutputIdx: number): Buffer {
  const integers: bigint[] = [
    2n,  1n,                       // Flags = 1 (etch)
    4n,  RUNE_NAME_INT,            // Rune name
    3n,  RUNE_DIVISIBILITY,        // Divisibility = 8
    5n,  RUNE_SPACERS,             // Spacers → WNSP•BTC
    7n,  RUNE_SYMBOL,              // Symbol Ψ
    6n,  RUNE_SUPPLY,              // Premine = full supply
    22n, BigInt(premineOutputIdx), // Pointer → premined runes go here
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
  throw new Error("Failed to broadcast etch TX via all endpoints");
}

// ── Telegram alert (optional) ─────────────────────────────────────────────────
async function tgAlert(msg: string) {
  try {
    const { sendAdminAlert } = await import("./telegram-bot");
    await sendAdminAlert(msg);
  } catch { /* telegram optional */ }
}

// ── DB state helpers ──────────────────────────────────────────────────────────
async function ensureTable() {
  const { db } = await import("./db");
  const { sql } = await import("drizzle-orm");
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS wnsp_btc_etch_state (
      id          SERIAL PRIMARY KEY,
      status      TEXT NOT NULL DEFAULT 'pending',
      etch_txid   TEXT,
      rune_id     TEXT,
      sats_used   INTEGER,
      fee_rate    INTEGER,
      etched_at   TIMESTAMP,
      error_msg   TEXT,
      updated_at  TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);
  const { db: db2 } = await import("./db");
  const rows = await db2.execute(sql`SELECT id FROM wnsp_btc_etch_state LIMIT 1`);
  if ((rows.rows as any[]).length === 0) {
    await db2.execute(sql`INSERT INTO wnsp_btc_etch_state (status) VALUES ('pending')`);
  }
}

async function getState(): Promise<{ status: string; etch_txid: string | null }> {
  const { db } = await import("./db");
  const { sql } = await import("drizzle-orm");
  const rows = await db.execute(sql`SELECT status, etch_txid FROM wnsp_btc_etch_state ORDER BY id LIMIT 1`);
  const r = (rows.rows as any[])[0];
  return r ?? { status: "pending", etch_txid: null };
}

async function setState(status: string, extra: Record<string, any> = {}) {
  const { db } = await import("./db");
  const { sql } = await import("drizzle-orm");
  const fields = Object.entries(extra).map(([k, v]) => `${k} = '${String(v).replace(/'/g, "''")}'`).join(", ");
  const fieldsSql = fields ? `, ${fields}` : "";
  await db.execute(sql.raw(`UPDATE wnsp_btc_etch_state SET status = '${status}', updated_at = NOW()${fieldsSql}`));
}

// ── Core etch function ────────────────────────────────────────────────────────
async function etchWnspBtc(confirmedSats: number): Promise<void> {
  const wallet = getServiceWallet();
  if (!wallet) throw new Error("BTC_INSCRIPTION_WALLET_WIF not set");

  const feeRate = await getFeeRate("medium");

  // TX structure:
  //   Input 0+: confirmed UTXOs from service wallet
  //   Output 0: P2TR to service wallet (receives all premined WNSP•BTC)
  //   Output 1: OP_RETURN Runestone (etch instruction)
  //   Output 2: change back to service wallet (if > dust)

  const utxos = (await getUTXOs(wallet.address)).filter(u => u.status.confirmed);
  if (utxos.length === 0) throw new Error("No confirmed UTXOs");

  // Estimate fee: ~200 vbytes for P2TR single-input + OP_RETURN
  const estimatedVbytes = 200 + utxos.length * 58;
  const fee = BigInt(estimatedVbytes * feeRate);

  const totalIn  = utxos.reduce((s, u) => s + BigInt(u.value), 0n);
  const premineOut = DUST;          // sat that carries the inscription
  const change   = totalIn - premineOut - fee;
  if (change < 0n) throw new Error(`Insufficient balance: ${totalIn} sats in, need ${premineOut + fee}`);

  const internalPubkey = Buffer.from(wallet.keyPair.publicKey).slice(1, 33);
  const rawPrivKey     = wallet.keyPair.privateKey!;
  const tweak          = bitcoin.crypto.taggedHash("TapTweak", internalPubkey);
  const tweakedPriv    = Buffer.from(tinysecp.privateAdd(rawPrivKey, tweak)!);
  const tweakedKP      = ECPair.fromPrivateKey(tweakedPriv, { network: NETWORK });

  const psbt = new bitcoin.Psbt({ network: NETWORK });

  for (const u of utxos) {
    psbt.addInput({
      hash: u.txid,
      index: u.vout,
      witnessUtxo: { script: wallet.p2tr.output!, value: BigInt(u.value) },
      tapInternalKey: internalPubkey,
    });
  }

  // Output 0 — premine recipient (our wallet, index 0 = matches Pointer tag)
  psbt.addOutput({ address: wallet.address, value: premineOut });

  // Output 1 — Runestone (OP_RETURN)
  const runestoneScript = buildEtchRunestone(0);
  psbt.addOutput({ script: runestoneScript, value: 0n });

  // Output 2 — change
  if (change > DUST) {
    psbt.addOutput({ address: wallet.address, value: change });
  }

  for (let i = 0; i < utxos.length; i++) {
    psbt.signInput(i, tweakedKP);
  }
  psbt.finalizeAllInputs();

  const txHex = psbt.extractTransaction().toHex();
  const txid  = await broadcast(txHex);

  const feeSats = Number(fee);
  await setState("etched", {
    etch_txid: txid,
    sats_used: feeSats,
    fee_rate: feeRate,
    etched_at: new Date().toISOString().replace("T", " ").slice(0, 19),
  });

  console.log(`[WNSP•BTC Etcher] ✅ Etch TX broadcast! TXID: ${txid}`);
  console.log(`[WNSP•BTC Etcher] Rune ID will be: ${txid}:0 (block:tx determined at confirmation)`);

  await tgAlert(
    `🔥 <b>WNSP•BTC Rune Etched!</b>\n\n` +
    `Name:    <b>WNSP•BTC</b>\n` +
    `Symbol:  <b>Ψ</b>\n` +
    `Supply:  <b>21,000,000,000.00000000</b>\n` +
    `Div:     8 decimals\n` +
    `Premine: 100% to service wallet\n\n` +
    `TXID: <code>${txid}</code>\n` +
    `Fee:  ${feeSats.toLocaleString()} sats @ ${feeRate} sat/vB\n\n` +
    `<a href="https://mempool.space/tx/${txid}">Watch on mempool.space</a>\n` +
    `<a href="https://unisat.io/runes">Track on UniSat Runes</a>\n\n` +
    `Once confirmed, the Rune ID will appear on:\n` +
    `• <a href="https://magiceden.us/ordinals/runes">Magic Eden</a>\n` +
    `• <a href="https://ord.io">ord.io</a>`
  );
}

// ── Watcher loop ──────────────────────────────────────────────────────────────
let _watcherRunning = false;

export async function startWnspBtcEtcher() {
  if (_watcherRunning) return;
  _watcherRunning = true;

  try {
    await ensureTable();
  } catch (e: any) {
    console.error("[WNSP•BTC Etcher] Table setup error:", e.message);
    return;
  }

  const state = await getState();
  if (state.status === "etched") {
    console.log(`[WNSP•BTC Etcher] Already etched — TXID: ${state.etch_txid}. Watcher idle.`);
    return;
  }

  console.log(`[WNSP•BTC Etcher] Watching for ${ETCH_THRESHOLD_SATS.toLocaleString()} confirmed sats to auto-etch WNSP•BTC…`);

  const check = async () => {
    if (!_watcherRunning) return;

    try {
      const current = await getState();
      if (current.status === "etched") {
        console.log("[WNSP•BTC Etcher] Etch complete — watcher shutting down.");
        _watcherRunning = false;
        return;
      }
      if (current.status === "in_progress") {
        // Previous attempt in flight — wait
        setTimeout(check, CHECK_INTERVAL_MS);
        return;
      }

      // Check live confirmed balance from the sentinel snapshot
      const { getSnapshot } = await import("./btc-wallet-sentinel");
      const snap = getSnapshot();
      const confirmed = snap?.confirmed ?? 0;

      if (confirmed < ETCH_THRESHOLD_SATS) {
        console.log(`[WNSP•BTC Etcher] ${confirmed.toLocaleString()} / ${ETCH_THRESHOLD_SATS.toLocaleString()} confirmed sats — waiting…`);
        setTimeout(check, CHECK_INTERVAL_MS);
        return;
      }

      // Threshold crossed — fire the etch
      console.log(`[WNSP•BTC Etcher] 🚀 Threshold reached! ${confirmed.toLocaleString()} sats confirmed — etching WNSP•BTC now…`);
      await setState("in_progress");

      await tgAlert(
        `🚀 <b>WNSP•BTC Etch Triggered!</b>\n\n` +
        `Service wallet has <b>${confirmed.toLocaleString()} confirmed sats</b> — etching now…\n\n` +
        `Building commit TX for WNSP•BTC Rune (21B supply, Ψ symbol, 8 decimals)`
      );

      await etchWnspBtc(confirmed);

    } catch (e: any) {
      console.error("[WNSP•BTC Etcher] Error:", e.message);
      await setState("error", { error_msg: e.message.slice(0, 200) });
      await tgAlert(
        `❌ <b>WNSP•BTC Etch Failed</b>\n\n` +
        `Error: <code>${e.message.slice(0, 300)}</code>\n\n` +
        `Will retry in 60 seconds…`
      );
      // Reset to pending so it retries
      setTimeout(async () => {
        await setState("pending");
        setTimeout(check, CHECK_INTERVAL_MS);
      }, 60_000);
    }
  };

  // Start checking after 30 s (let sentinel warm up first)
  setTimeout(check, 30_000);
}

export async function getEtchStatus() {
  try {
    await ensureTable();
    return await getState();
  } catch {
    return { status: "unknown", etch_txid: null };
  }
}
