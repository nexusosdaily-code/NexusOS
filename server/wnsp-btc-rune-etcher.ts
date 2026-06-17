/**
 * WNSP•BTC Rune Etcher — NexusOS
 *
 * 2-step commit/reveal etch for short Rune names (<13 chars):
 *
 *   Phase 1 — COMMIT:
 *     Build a tapscript containing the 5-byte name commitment.
 *     Send sats to that P2TR address (commit TX).
 *     Store commit_txid in DB — state = "committed".
 *
 *   Phase 2 — REVEAL (after 6+ confirmations):
 *     Spend the commit UTXO via script-path.
 *     Attach the Runestone OP_RETURN.
 *     Premine 100% to service wallet.
 *     State = "etched".
 *
 *   Rune spec:
 *     Name        : WNSP•BTC
 *     Supply      : 21,000,000,000.00000000  (21 billion × 10^8 base units)
 *     Divisibility: 8
 *     Symbol      : Ψ  (U+03A8)
 *     Premine     : 100% to service wallet — no open minting
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
const ETCH_THRESHOLD_SATS  = 8_000;
const CHECK_INTERVAL_MS    = 60_000;
const COMMIT_CONFIRMATIONS = 6;      // ord protocol requires ≥6 blocks before reveal

// ── WNSP•BTC Rune spec ────────────────────────────────────────────────────────
// "WNSPBTC" base-26 encoded (ord formula):
//   n=0; for each char c (i>0: n = (n+1)*26 + (c-'A')); first char starts at (c-'A')
//   → W=22 → N → S → P → B → T → C = 7,280,367,746
const RUNE_NAME_INT      = 7_280_367_746n;
const RUNE_SPACERS       = 8n;                         // bullet at position 3 → WNSP•BTC
const RUNE_DIVISIBILITY  = 8n;                         // 8 decimal places
const RUNE_SYMBOL        = 936n;                       // Ψ  (U+03A8)
const RUNE_SUPPLY        = 2_100_000_000_000_000_000n; // 21B × 10^8 base units
const DUST               = 546n;

// Commitment bytes = little-endian bytes of RUNE_NAME_INT, trailing zeros stripped
// RUNE_NAME_INT = 7280367746 → 0x82 0x98 0xf1 0xb1 0x01 (5 bytes LE)
const COMMITMENT_BYTES = Buffer.from([0x82, 0x98, 0xf1, 0xb1, 0x01]);

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
    5n,  RUNE_SPACERS,               // Tag 5  → Spacers → WNSP•BTC
    7n,  RUNE_SYMBOL,                // Tag 7  → Symbol Ψ
    6n,  RUNE_SUPPLY,                // Tag 6  → Premine = full supply
    22n, BigInt(premineOutputIdx),   // Tag 22 → Pointer → premined runes go here
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

// ── Mempool confirmation checker ──────────────────────────────────────────────
async function getTxConfirmations(txid: string): Promise<number> {
  try {
    const r = await fetch(`${MEMPOOL}/tx/${txid}`, { signal: AbortSignal.timeout(10_000) });
    if (!r.ok) return 0;
    const d = await r.json();
    if (!d.status?.confirmed) return 0;
    const blockR = await fetch(`${MEMPOOL}/blocks/tip/height`, { signal: AbortSignal.timeout(10_000) });
    if (!blockR.ok) return 0;
    const tip = parseInt(await blockR.text());
    return tip - d.status.block_height + 1;
  } catch { return 0; }
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
      id             SERIAL PRIMARY KEY,
      status         TEXT NOT NULL DEFAULT 'pending',
      commit_txid    TEXT,
      commit_sats    INTEGER,
      etch_txid      TEXT,
      rune_id        TEXT,
      sats_used      INTEGER,
      fee_rate       INTEGER,
      etched_at      TIMESTAMP,
      error_msg      TEXT,
      updated_at     TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);
  await db.execute(sql`
    ALTER TABLE wnsp_btc_etch_state ADD COLUMN IF NOT EXISTS commit_txid TEXT;
    ALTER TABLE wnsp_btc_etch_state ADD COLUMN IF NOT EXISTS commit_sats INTEGER;
  `);
  const rows = await db.execute(sql`SELECT id FROM wnsp_btc_etch_state LIMIT 1`);
  if ((rows.rows as any[]).length === 0) {
    await db.execute(sql`INSERT INTO wnsp_btc_etch_state (status) VALUES ('pending')`);
  }
}

async function getState(): Promise<{
  status: string;
  commit_txid: string | null;
  commit_sats: number | null;
  etch_txid: string | null;
}> {
  const { db } = await import("./db");
  const { sql } = await import("drizzle-orm");
  const rows = await db.execute(sql`
    SELECT status, commit_txid, commit_sats, etch_txid
    FROM wnsp_btc_etch_state ORDER BY id LIMIT 1
  `);
  const r = (rows.rows as any[])[0];
  return r ?? { status: "pending", commit_txid: null, commit_sats: null, etch_txid: null };
}

async function setState(status: string, extra: Record<string, any> = {}) {
  const { db } = await import("./db");
  const { sql } = await import("drizzle-orm");
  const fields = Object.entries(extra)
    .map(([k, v]) => `${k} = '${String(v).replace(/'/g, "''")}'`)
    .join(", ");
  const fieldsSql = fields ? `, ${fields}` : "";
  await db.execute(sql.raw(
    `UPDATE wnsp_btc_etch_state SET status = '${status}', updated_at = NOW()${fieldsSql}`
  ));
}

// ── Phase 1: Commit TX ────────────────────────────────────────────────────────
// Builds a P2TR address whose tapscript contains the WNSP•BTC commitment bytes.
// Sends ~3000 sats to it. This proves intent to etch WNSP•BTC to the protocol.
async function commitEtch(): Promise<string> {
  const wallet = getServiceWallet();
  if (!wallet) throw new Error("BTC_INSCRIPTION_WALLET_WIF not set");

  const internalPubkey = Buffer.from(wallet.keyPair.publicKey).slice(1, 33);
  const feeRate = await getFeeRate("medium");

  // Commitment tapscript:
  //   <5-byte commitment>  OP_DROP  <pubkey>  OP_CHECKSIG
  const commitScript = bitcoin.script.compile([
    COMMITMENT_BYTES,
    bitcoin.opcodes.OP_DROP,
    internalPubkey,
    bitcoin.opcodes.OP_CHECKSIG,
  ] as any);

  const redeemArg = { output: commitScript, redeemVersion: 0xC0 as const };
  const commitP2TR = bitcoin.payments.p2tr({
    internalPubkey,
    scriptTree: { output: commitScript },
    redeem: redeemArg,
    network: NETWORK,
  });
  if (!commitP2TR.address) throw new Error("Failed to derive commit P2TR address");

  // Commit amount: 546 (premine dust) + reveal fee estimate + buffer
  const revealEstimateVbytes = 300;
  const revealFee  = revealEstimateVbytes * feeRate;
  const commitSats = DUST + BigInt(revealFee) + 2000n; // extra buffer for fee variation

  const commitVbytes = 150;
  const commitFee = BigInt(commitVbytes * feeRate);

  const { utxos: safeUtxos, blockedCount } = await getSafeUTXOs(wallet.address);
  if (blockedCount > 0) {
    console.warn(`[WNSP•BTC Etcher] 🛡️ Rune Guard blocked ${blockedCount} UTXO(s) from commit inputs`);
  }
  const confirmed = safeUtxos.filter(u => u.status.confirmed);
  if (confirmed.length === 0) throw new Error("No confirmed UTXOs for commit TX");

  const needed = commitSats + commitFee;
  let selected: typeof confirmed = [], total = 0n;
  for (const u of confirmed.sort((a, b) => b.value - a.value)) {
    selected.push(u);
    total += BigInt(u.value);
    if (total >= needed) break;
  }
  if (total < needed) throw new Error(`Insufficient sats for commit TX — need ${needed}, have ${total}`);

  const change = total - commitSats - commitFee;

  const rawPrivKey = wallet.keyPair.privateKey!;
  const tweak = bitcoin.crypto.taggedHash("TapTweak", internalPubkey);
  const tweakedPriv = Buffer.from(tinysecp.privateAdd(rawPrivKey, tweak)!);
  const tweakedKP = ECPair.fromPrivateKey(tweakedPriv, { network: NETWORK });

  const psbt = new bitcoin.Psbt({ network: NETWORK });
  for (const u of selected) {
    psbt.addInput({
      hash: u.txid,
      index: u.vout,
      witnessUtxo: { script: wallet.p2tr.output!, value: BigInt(u.value) },
      tapInternalKey: internalPubkey,
    });
  }
  psbt.addOutput({ address: commitP2TR.address, value: commitSats });
  if (change > DUST) {
    psbt.addOutput({ address: wallet.address, value: change });
  }
  for (let i = 0; i < selected.length; i++) {
    psbt.signInput(i, tweakedKP);
  }
  psbt.finalizeAllInputs();

  const commitTxid = await broadcast(psbt.extractTransaction().toHex());

  await setState("committed", {
    commit_txid: commitTxid,
    commit_sats: commitSats.toString(),
    fee_rate:    feeRate,
  });

  console.log(`[WNSP•BTC Etcher] ✅ Commit TX broadcast! TXID: ${commitTxid}`);
  console.log(`[WNSP•BTC Etcher] ⏳ Waiting for ${COMMIT_CONFIRMATIONS} confirmations before reveal etch…`);

  await tgAlert(
    `📦 <b>WNSP•BTC Commit TX Broadcast!</b>\n\n` +
    `TXID: <code>${commitTxid}</code>\n` +
    `Amount: ${commitSats.toLocaleString()} sats sent to commitment address\n\n` +
    `⏳ Waiting for <b>${COMMIT_CONFIRMATIONS} confirmations</b> (~1 hour) before reveal etch.\n\n` +
    `<a href="https://mempool.space/tx/${commitTxid}">Watch on mempool.space</a>`
  );

  return commitTxid;
}

// ── Phase 2: Reveal/Etch TX ────────────────────────────────────────────────────
// Spends the commit UTXO via the tapscript path (proves commitment).
// Attaches the Runestone OP_RETURN for the etch.
// Premines 100% of WNSP•BTC to the service wallet.
async function revealEtch(commitTxid: string, commitSatsNum: number): Promise<string> {
  const wallet = getServiceWallet();
  if (!wallet) throw new Error("BTC_INSCRIPTION_WALLET_WIF not set");

  const internalPubkey = Buffer.from(wallet.keyPair.publicKey).slice(1, 33);
  const feeRate = await getFeeRate("medium");

  // Rebuild commitment tapscript (deterministic — same params = same script)
  const commitScript = bitcoin.script.compile([
    COMMITMENT_BYTES,
    bitcoin.opcodes.OP_DROP,
    internalPubkey,
    bitcoin.opcodes.OP_CHECKSIG,
  ] as any);

  const redeemArg = { output: commitScript, redeemVersion: 0xC0 as const };
  const commitP2TR = bitcoin.payments.p2tr({
    internalPubkey,
    scriptTree: { output: commitScript },
    redeem: redeemArg,
    network: NETWORK,
  });
  if (!commitP2TR.witness || commitP2TR.witness.length < 2) {
    throw new Error("Failed to derive P2TR witness for reveal TX");
  }
  const controlBlock = commitP2TR.witness[commitP2TR.witness.length - 1];
  const commitSats = BigInt(commitSatsNum);

  // Also get additional UTXOs for fees (key-path spends from service wallet)
  const { utxos: safeUtxos, blockedCount } = await getSafeUTXOs(wallet.address);
  if (blockedCount > 0) {
    console.warn(`[WNSP•BTC Etcher] 🛡️ Rune Guard blocked ${blockedCount} UTXO(s) from reveal inputs`);
  }
  const feeUtxos = safeUtxos.filter(u => u.status.confirmed);

  // ── Estimate fees ──────────────────────────────────────────────────────────
  // Reveal TX: commit input (tapscript) + N key-path inputs + 3 outputs
  // Tapscript input vsize: ~200 vbytes base + script overhead
  const scriptVbytes = Math.ceil(commitScript.length / 4);
  const estimatedVbytes = 200 + scriptVbytes + feeUtxos.length * 58 + 3 * 43;
  const totalFee = BigInt(estimatedVbytes * feeRate);

  // Reveal TX outputs:
  // out0: premine recipient (service wallet, 546 sats — Pointer=0 in Runestone)
  // out1: Runestone OP_RETURN
  // out2: change (service wallet)
  const premineOut = DUST;

  const additionalIn = feeUtxos.reduce((s, u) => s + BigInt(u.value), 0n);
  const totalIn = commitSats + additionalIn;
  const change = totalIn - premineOut - totalFee;
  if (change < 0n) throw new Error(`Insufficient sats for reveal TX — need ${premineOut + totalFee}, have ${totalIn}`);

  // ── Build reveal PSBT ──────────────────────────────────────────────────────
  const psbt = new bitcoin.Psbt({ network: NETWORK });

  // Input 0: commit UTXO — script-path spend through commitment tapscript
  psbt.addInput({
    hash: commitTxid,
    index: 0,
    witnessUtxo: { script: commitP2TR.output!, value: commitSats },
    tapInternalKey: internalPubkey,
    tapLeafScript: [{
      leafVersion: 0xC0,
      script: commitScript,
      controlBlock,
    }],
  });

  // Inputs 1+: service wallet UTXOs for fees (key-path spend)
  const rawPrivKey  = wallet.keyPair.privateKey!;
  const tweak       = bitcoin.crypto.taggedHash("TapTweak", internalPubkey);
  const tweakedPriv = Buffer.from(tinysecp.privateAdd(rawPrivKey, tweak)!);
  const tweakedKP   = ECPair.fromPrivateKey(tweakedPriv, { network: NETWORK });

  for (const u of feeUtxos) {
    psbt.addInput({
      hash: u.txid,
      index: u.vout,
      witnessUtxo: { script: wallet.p2tr.output!, value: BigInt(u.value) },
      tapInternalKey: internalPubkey,
    });
  }

  // Output 0: premine recipient — receives 100% of WNSP•BTC via Pointer=0
  psbt.addOutput({ address: wallet.address, value: premineOut });

  // Output 1: Runestone OP_RETURN — etch instruction
  const runestoneScript = buildEtchRunestone(0);
  psbt.addOutput({ script: runestoneScript, value: 0n });

  // Output 2: BTC change back to service wallet
  if (change > DUST) {
    psbt.addOutput({ address: wallet.address, value: change });
  }

  // ── Sign inputs ──────────────────────────────────────────────────────────
  // Input 0: script-path spend — sign with UN-tweaked key + leaf hash
  psbt.signInput(0, wallet.keyPair);
  psbt.finalizeInput(0);

  // Inputs 1+: key-path spend — sign with tweaked key
  for (let i = 1; i <= feeUtxos.length; i++) {
    psbt.signInput(i, tweakedKP);
  }
  if (feeUtxos.length > 0) {
    psbt.finalizeAllInputs();
  }

  const txHex  = psbt.extractTransaction().toHex();
  const txid   = await broadcast(txHex);
  const feeSats = Number(totalFee);

  await setState("etched", {
    etch_txid: txid,
    sats_used: feeSats,
    fee_rate:  feeRate,
    etched_at: new Date().toISOString().replace("T", " ").slice(0, 19),
  });

  console.log(`[WNSP•BTC Etcher] ✅ Reveal/Etch TX broadcast! TXID: ${txid}`);

  await tgAlert(
    `🔥 <b>WNSP•BTC Rune Etched!</b>\n\n` +
    `Name:    <b>WNSP•BTC</b>\n` +
    `Symbol:  <b>Ψ</b>\n` +
    `Supply:  <b>21,000,000,000.00000000</b>\n` +
    `Div:     8 decimals\n` +
    `Premine: 100% to service wallet\n\n` +
    `Commit TX: <code>${commitTxid}</code>\n` +
    `Etch TX:   <code>${txid}</code>\n` +
    `Fee:  ${feeSats.toLocaleString()} sats @ ${feeRate} sat/vB\n\n` +
    `<a href="https://mempool.space/tx/${txid}">Watch on mempool.space</a>`
  );

  const launchMsg =
    `⚡ <b>WNSP•BTC IS LIVE ON BITCOIN</b> ⚡\n\n` +
    `🔷 Ticker:   <b>WNSP•BTC</b>\n` +
    `🔷 Symbol:   <b>Ψ</b> (Psi — spectral channel operator)\n` +
    `🔷 Supply:   <b>21,000,000,000</b> (21 billion, 8 decimals)\n` +
    `🔷 Premine:  100% — no open minting, no rug\n` +
    `🔷 Protocol: NexusOS Physics Stack (WNSP)\n\n` +
    `WNSP•BTC maps to orthogonal Hilbert-space channels on the NexusOS physics stack.\n\n` +
    `🔗 Etch TX: <code>${txid}</code>\n` +
    `🔗 <a href="https://mempool.space/tx/${txid}">View on mempool.space</a>\n` +
    `🌐 <a href="https://wnsp.io">wnsp.io</a>\n\n` +
    `#WNSPBTC #Bitcoin #Runes #NexusOS #PhotonicComputing`;

  try {
    const { sendChannelPost } = await import("./telegram-bot");
    await sendChannelPost(launchMsg);
  } catch { /* channel optional */ }

  try {
    const { publishToNostr } = await import("./nostr-service");
    await publishToNostr({
      content:
        `⚡ WNSP•BTC IS LIVE ON BITCOIN ⚡\n\n` +
        `Ticker: WNSP•BTC | Symbol: Ψ | Supply: 21,000,000,000 (8 decimals)\n` +
        `Premine: 100% — no open minting\n\n` +
        `WNSP•BTC maps to orthogonal Hilbert-space Ψ channels on the NexusOS physics stack.\n\n` +
        `TX: ${txid}\nApp: https://wnsp.io\n\n` +
        `#WNSPBTC #Bitcoin #Runes #NexusOS`,
      tags: [
        ["t", "WNSPBTC"], ["t", "Bitcoin"], ["t", "Runes"], ["t", "NexusOS"],
        ["r", `https://mempool.space/tx/${txid}`],
        ["r", "https://wnsp.io"],
      ],
    });
  } catch { /* nostr optional */ }

  return txid;
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
    _watcherRunning = false;
    return;
  }

  console.log(`[WNSP•BTC Etcher] Starting 2-step commit/reveal watcher for WNSP•BTC…`);

  const check = async () => {
    if (!_watcherRunning) return;

    try {
      const current = await getState();

      // ── State: etched ──────────────────────────────────────────────────────
      if (current.status === "etched") {
        console.log("[WNSP•BTC Etcher] ✅ Etch complete — watcher shutting down.");
        _watcherRunning = false;
        return;
      }

      // ── State: committed — wait for 6 confirmations ────────────────────────
      if (current.status === "committed" && current.commit_txid) {
        const confs = await getTxConfirmations(current.commit_txid);
        console.log(`[WNSP•BTC Etcher] Commit TX ${current.commit_txid.slice(0, 16)}… has ${confs}/${COMMIT_CONFIRMATIONS} confirmations`);

        if (confs >= COMMIT_CONFIRMATIONS) {
          console.log(`[WNSP•BTC Etcher] 🚀 Commitment confirmed — broadcasting reveal/etch TX now…`);
          await setState("in_progress");
          await tgAlert(
            `🚀 <b>WNSP•BTC Reveal Triggered!</b>\n\n` +
            `Commit TX has <b>${confs} confirmations</b> — broadcasting reveal etch now…\n` +
            `<a href="https://mempool.space/tx/${current.commit_txid}">Commit TX</a>`
          );
          await revealEtch(current.commit_txid, current.commit_sats ?? 3000);
        } else {
          const needed = COMMIT_CONFIRMATIONS - confs;
          console.log(`[WNSP•BTC Etcher] Waiting for ${needed} more confirmation(s)…`);
        }
        setTimeout(check, CHECK_INTERVAL_MS);
        return;
      }

      // ── State: in_progress — wait for it to resolve ────────────────────────
      if (current.status === "in_progress") {
        setTimeout(check, CHECK_INTERVAL_MS);
        return;
      }

      // ── State: pending — check balance then commit ─────────────────────────
      const wallet = getServiceWallet();
      if (!wallet) {
        setTimeout(check, CHECK_INTERVAL_MS);
        return;
      }
      const utxos = await getUTXOs(wallet.address);
      const spendableSats = utxos.filter(u => u.status.confirmed).reduce((s, u) => s + u.value, 0);
      const unconfirmedSats = utxos.filter(u => !u.status.confirmed).reduce((s, u) => s + u.value, 0);

      if (spendableSats < ETCH_THRESHOLD_SATS) {
        console.log(`[WNSP•BTC Etcher] ${spendableSats.toLocaleString()} spendable / ${ETCH_THRESHOLD_SATS.toLocaleString()} needed (${unconfirmedSats.toLocaleString()} unconfirmed) — waiting…`);
        setTimeout(check, CHECK_INTERVAL_MS);
        return;
      }

      console.log(`[WNSP•BTC Etcher] 🚀 Balance OK (${spendableSats.toLocaleString()} sats) — broadcasting commit TX…`);
      await setState("in_progress");
      await tgAlert(
        `🚀 <b>WNSP•BTC Commit Triggered!</b>\n\n` +
        `Service wallet: <b>${spendableSats.toLocaleString()} confirmed sats</b>\n` +
        `Broadcasting commitment TX for WNSP•BTC…\n\n` +
        `Step 1 of 2: Commit → wait 6 blocks (~1 hour) → Step 2: Reveal etch`
      );
      await commitEtch(); // commitEtch() sets state to "committed" with commit_txid internally

    } catch (e: any) {
      console.error("[WNSP•BTC Etcher] Error:", e.message);
      await setState("error", { error_msg: e.message.slice(0, 200) });
      await tgAlert(
        `❌ <b>WNSP•BTC Etcher Error</b>\n\n` +
        `<code>${e.message.slice(0, 300)}</code>\n\n` +
        `Retrying in 60 s…`
      );
      setTimeout(async () => {
        await setState("pending");
        setTimeout(check, CHECK_INTERVAL_MS);
      }, 60_000);
    }
  };

  setTimeout(check, 30_000);
}

// ── Public status ─────────────────────────────────────────────────────────────
export async function getEtchStatus() {
  try {
    await ensureTable();
    const state = await getState();
    let confirmed = 0, unconfirmed = 0, address = "";
    let commitConfirmations = 0;
    try {
      const wallet = getServiceWallet();
      if (wallet) {
        address = wallet.address;
        const utxos = await getUTXOs(wallet.address);
        confirmed   = utxos.filter(u =>  u.status.confirmed).reduce((s, u) => s + u.value, 0);
        unconfirmed = utxos.filter(u => !u.status.confirmed).reduce((s, u) => s + u.value, 0);
      }
      if (state.commit_txid) {
        commitConfirmations = await getTxConfirmations(state.commit_txid);
      }
    } catch { /* wallet not ready */ }
    return {
      ...state,
      confirmed,
      unconfirmed,
      address,
      commitConfirmations,
      commitRequired: COMMIT_CONFIRMATIONS,
      etchThreshold: ETCH_THRESHOLD_SATS,
    };
  } catch {
    return { status: "unknown", etch_txid: null, confirmed: 0, unconfirmed: 0 };
  }
}

// ── Force trigger (admin) ─────────────────────────────────────────────────────
export async function forceEtch(): Promise<{ ok: boolean; txid?: string; error?: string }> {
  try {
    await ensureTable();
    const state = await getState();
    if (state.status === "etched") {
      return { ok: false, error: `Already etched — TXID: ${state.etch_txid}` };
    }
    if (state.status === "in_progress") {
      return { ok: false, error: "Etch already in progress" };
    }

    // If committed and 6+ confirmations → force reveal
    if (state.status === "committed" && state.commit_txid) {
      const confs = await getTxConfirmations(state.commit_txid);
      if (confs >= COMMIT_CONFIRMATIONS) {
        await setState("in_progress");
        await revealEtch(state.commit_txid, state.commit_sats ?? 3000);
        const newState = await getState();
        return { ok: true, txid: newState.etch_txid ?? undefined };
      }
      return { ok: false, error: `Commit TX has ${confs}/${COMMIT_CONFIRMATIONS} confirmations — need ${COMMIT_CONFIRMATIONS - confs} more` };
    }

    // Otherwise start from commit step
    await setState("in_progress");
    await commitEtch();
    const newState = await getState();
    return { ok: true, txid: newState.commit_txid ?? undefined };
  } catch (e: any) {
    await setState("pending", { error_msg: e.message.slice(0, 200) });
    return { ok: false, error: e.message };
  }
}

// ── Reset (admin only — use when DB shows etched but chain shows no Rune) ─────
export async function resetEtchState(): Promise<void> {
  const { db } = await import("./db");
  const { sql } = await import("drizzle-orm");
  await db.execute(sql`
    UPDATE wnsp_btc_etch_state
    SET status = 'pending', commit_txid = NULL, commit_sats = NULL,
        etch_txid = NULL, rune_id = NULL, sats_used = NULL, etched_at = NULL,
        error_msg = NULL, updated_at = NOW()
  `);
  console.log("[WNSP•BTC Etcher] State reset to pending.");
}
