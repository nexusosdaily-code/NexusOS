/**
 * Rune Transfer Processor — NexusOS
 *
 * Polls rune_swaps for pending/queued orders every 60s.
 * When the service wallet has confirmed BTC for fees, automatically
 * builds a Runestone transfer transaction, signs it with the existing
 * BTC_INSCRIPTION_WALLET_WIF key, broadcasts it, and marks the order complete.
 *
 * NEXUS•WAVELENGTH Rune ID: 840000:8472
 */

import * as bitcoin from "bitcoinjs-lib";
import * as tinysecp from "tiny-secp256k1";
import { ECPairFactory } from "ecpair";
import { getServiceWallet, getUTXOs, getFeeRate } from "./btc-inscription-engine.js";

bitcoin.initEccLib(tinysecp);
const ECPair  = ECPairFactory(tinysecp);
const NETWORK = bitcoin.networks.bitcoin;
const MEMPOOL = "https://mempool.space/api";
const DUST    = 546n;

// NEXUS•WAVELENGTH on-chain parameters — actual etching block 952596:379
const RUNE_BLOCK  = 952_596n;
const RUNE_TX     = 379n;
// Divisibility: fetch once, cache
let RUNE_DIVISOR  = 0n; // 10^decimals — resolved on first use
let RUNE_DIV_FETCHED = false;

// ── LEB128 varint encoder (Runes protocol uses 128-bit LEB128) ────────────────
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

// ── Runestone builder (transfer edict) ───────────────────────────────────────
// Spec: OP_RETURN OP_13 <push[tag=20, block, tx, amount, output]>
// Tag 20 = edict body; values are [block_delta, tx_delta, amount, output_idx]
function buildRunestone(rawAmount: bigint, recipientOutputIndex: number): Buffer {
  const tag20 = encodeVarint(20n);
  const block  = encodeVarint(RUNE_BLOCK);
  const tx     = encodeVarint(RUNE_TX);
  const amount = encodeVarint(rawAmount);
  const outIdx = encodeVarint(BigInt(recipientOutputIndex));

  const payload = Buffer.concat([tag20, block, tx, amount, outIdx]);

  // Script: OP_RETURN (0x6a) + OP_13 (0x5d) + minimal push of payload
  const pushLen = payload.length;
  let pushPrefix: Buffer;
  if (pushLen <= 75) {
    pushPrefix = Buffer.from([pushLen]);
  } else if (pushLen <= 255) {
    pushPrefix = Buffer.from([0x4c, pushLen]); // OP_PUSHDATA1
  } else {
    pushPrefix = Buffer.from([0x4d, pushLen & 0xff, (pushLen >> 8) & 0xff]); // OP_PUSHDATA2
  }

  return Buffer.concat([Buffer.from([0x6a, 0x5d]), pushPrefix, payload]);
}

// ── Fetch Rune decimals once ──────────────────────────────────────────────────
async function fetchRuneDivisor(): Promise<bigint> {
  if (RUNE_DIV_FETCHED) return RUNE_DIVISOR;
  try {
    const r = await fetch(`${MEMPOOL}/runes/952596:379`, {
      signal: AbortSignal.timeout(10_000),
      headers: { Accept: "application/json" },
    });
    if (r.ok) {
      const d = await r.json();
      const decimals = d?.entry?.divisibility ?? d?.divisibility ?? 0;
      RUNE_DIVISOR = 10n ** BigInt(decimals);
      console.log(`[Rune Processor] NXWV divisibility=${decimals} → divisor=${RUNE_DIVISOR}`);
    }
  } catch {
    // Fall back to 0 decimals (raw = display)
    RUNE_DIVISOR = 1n;
    console.warn("[Rune Processor] Could not fetch Rune divisibility — assuming 0 decimals");
  }
  RUNE_DIV_FETCHED = true;
  return RUNE_DIVISOR;
}

// ── Broadcast ─────────────────────────────────────────────────────────────────
async function broadcastTx(txHex: string): Promise<string> {
  for (const url of [`${MEMPOOL}/tx`, "https://blockstream.info/api/tx"]) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: txHex,
        signal: AbortSignal.timeout(15_000),
      });
      if (res.ok) return (await res.text()).trim();
    } catch { /* try next */ }
  }
  throw new Error("Failed to broadcast via mempool.space and blockstream.info");
}

// ── Core: send Runes ──────────────────────────────────────────────────────────
export async function sendRuneTransfer(
  recipientAddress: string,
  displayAmount: number,   // e.g. 1000 NXWV
): Promise<string> {
  const wallet = getServiceWallet();
  if (!wallet) throw new Error("BTC_INSCRIPTION_WALLET_WIF not set");

  const divisor    = await fetchRuneDivisor();
  const rawAmount  = BigInt(displayAmount) * divisor || BigInt(displayAmount);
  const feeRate    = await getFeeRate("low");

  // Use chain_stats (same method as wallet sentinel) for accurate confirmed balance —
  // the /utxo endpoint lags on confirmation status but /address chain_stats is authoritative.
  const addrData = await fetch(`${MEMPOOL}/address/${wallet.address}`, {
    signal: AbortSignal.timeout(10_000),
  }).then(r => r.json());
  const totalConfirmed = (addrData.chain_stats.funded_txo_sum - addrData.chain_stats.spent_txo_sum) as number;
  console.log(`[Rune Processor] chain_stats confirmed: ${totalConfirmed} sats`);

  const utxos = await getUTXOs(wallet.address);
  // Use all UTXOs — chain_stats already confirmed the balance; /utxo status flag lags
  const spendable = utxos.length > 0 ? utxos : [];
  if (spendable.length === 0)
    throw new Error(`Service wallet has no UTXOs`);

  // Estimate: 1 OP_RETURN output (~45 vB) + 1 recipient P2PKH/P2TR (~43 vB) +
  //           N inputs P2TR (~58 vB each) + overhead 10 vB
  const estVbytes  = 10 + spendable.length * 58 + 43 + 45;
  const fee        = estVbytes * feeRate;
  const totalNeed  = Number(DUST) + fee; // 546 sats recipient output + fee

  if (totalConfirmed < totalNeed)
    throw new Error(`Need ${totalNeed} sats confirmed, have ${totalConfirmed}`);

  // BIP341 Taproot key tweak
  const internalPubkey = Buffer.from(wallet.keyPair.publicKey).slice(1, 33);
  const tweak     = bitcoin.crypto.taggedHash("TapTweak", internalPubkey);
  const tweakedPriv = Buffer.from(tinysecp.privateAdd(wallet.keyPair.privateKey!, tweak)!);
  const tweakedKP = ECPair.fromPrivateKey(tweakedPriv, { network: NETWORK });

  const psbt = new bitcoin.Psbt({ network: NETWORK });

  // Inputs — all spendable UTXOs
  for (const u of spendable) {
    psbt.addInput({
      hash:           u.txid,
      index:          u.vout,
      witnessUtxo:    { script: wallet.p2tr.output!, value: BigInt(u.value) },
      tapInternalKey: internalPubkey,
    });
  }

  // Output 0: Runestone OP_RETURN (carries the Rune transfer instruction)
  // recipient is output index 1
  const runestoneScript = buildRunestone(rawAmount, 1);
  psbt.addOutput({ script: runestoneScript, value: 0n });

  // Output 1: recipient (gets the Rune — Runes travel with the UTXO dust)
  psbt.addOutput({ address: recipientAddress, value: DUST });

  // Output 2: change back to service wallet
  const totalIn = spendable.reduce((s, u) => s + u.value, 0);
  const change  = BigInt(totalIn) - DUST - BigInt(fee);
  if (change > DUST) {
    psbt.addOutput({ address: wallet.address, value: change });
  }

  // Sign all inputs
  for (let i = 0; i < spendable.length; i++) {
    psbt.signInput(i, tweakedKP);
  }
  psbt.finalizeAllInputs();

  const txHex = psbt.extractTransaction().toHex();
  const txid  = await broadcastTx(txHex);
  console.log(`[Rune Processor] ✓ Sent ${displayAmount} NXWV (${rawAmount} raw) → ${recipientAddress} | txid: ${txid}`);
  return txid;
}

// ── Queue processor ───────────────────────────────────────────────────────────
export async function processRuneOrders(): Promise<void> {
  const { db }        = await import("./db.js");
  const { runeSwaps } = await import("../shared/schema.js");
  const { or, eq }    = await import("drizzle-orm");

  const pending = await db.select().from(runeSwaps).where(
    or(eq(runeSwaps.status, "pending"), eq(runeSwaps.status, "queued"))
  );

  if (pending.length === 0) return;
  console.log(`[Rune Processor] ${pending.length} pending order(s) — attempting auto-fulfil…`);

  for (const order of pending) {
    if (!order.btcAddress || !order.runeAmount) continue;
    if (order.direction !== "nxt_to_rune") continue; // only NXT→NXWV delivery

    try {
      const txid = await sendRuneTransfer(order.btcAddress, order.runeAmount);

      await db.update(runeSwaps).set({
        status:      "completed",
        btcTxid:     txid,
        completedAt: new Date(),
        note:        `${order.note ?? ""} | Auto-fulfilled by Rune Processor`,
      }).where(eq(runeSwaps.id, order.id));

      // Telegram alert
      try {
        const { sendAdminAlert } = await import("./telegram-bot.js");
        await sendAdminAlert(
          `💜 <b>NXWV Auto-Delivered!</b>\n\n` +
          `Order #${order.id} · <b>${order.runeAmount.toLocaleString()} NXWV</b>\n` +
          `User: ${order.username}\n` +
          `To: <code>${order.btcAddress}</code>\n` +
          `Txid: <code>${txid}</code>\n\n` +
          `<a href="https://mempool.space/tx/${txid}">View on mempool.space</a>`
        );
      } catch { /* non-fatal */ }

      // Nostr broadcast
      try {
        const { publishToNostr } = await import("./nostr-service.js");
        await publishToNostr({
          content: [
            `💜 NEXUS•WAVELENGTH Rune delivered on Bitcoin!`,
            ``,
            `${order.runeAmount.toLocaleString()} NXWV sent automatically via the NexusOS pipeline.`,
            `NXT → sats → NXWV on Bitcoin in under 60 seconds.`,
            ``,
            `Start your pipeline: wnsp.tech/rune-pipeline`,
            ``,
            `#Bitcoin #Runes #NEXUSWAVELENGTH #WNSP #NexusOS`,
          ].join("\n"),
          hashtags: ["Bitcoin", "Runes", "NEXUSWAVELENGTH", "WNSP", "NexusOS"],
        });
      } catch { /* non-fatal */ }

    } catch (err: any) {
      console.warn(`[Rune Processor] ✗ Order #${order.id} failed: ${err.message} — will retry next cycle`);
    }
  }
}

// ── Start loop ────────────────────────────────────────────────────────────────
export function startRuneProcessor(intervalMs = 60_000): NodeJS.Timeout {
  console.log(`[Rune Processor] Started — checking every ${intervalMs / 1000}s`);
  processRuneOrders().catch(console.error);
  return setInterval(() => processRuneOrders().catch(console.error), intervalMs);
}
