/**
 * Rune Transfer & Mint Processor — NexusOS
 *
 * NEXUS•WAVELENGTH Rune ID: 952596:379  (etched block 952596, tx 379)
 * Divisibility: 0  (raw units = display units)
 * Amount per mint: 21,000,000,000 raw  |  Cap: 1,000 mints
 *
 * Runes Protocol Tag Reference (ord source):
 *   Tag  0 = Body     — separates header tag-value pairs from edict data
 *   Tag 20 = Mint     — Rune ID to mint (block then tx, each as [20, value])
 *   Tag 22 = Pointer  — default output index for unallocated Runes (change)
 *
 * Transfer Runestone integer sequence:
 *   [22, changeOut, 0, block_delta, tx_delta, amount, recipientOut]
 *
 * Mint Runestone integer sequence:
 *   [20, 952596, 20, 379, 22, receiverOut]
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

// NEXUS•WAVELENGTH on-chain parameters
const RUNE_BLOCK         = 952_596n;
const RUNE_TX            = 379n;
const RUNE_AMOUNT_PER_MINT = 21_000_000_000n; // raw units per mint

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

// ── Wrap payload integers into the Runestone OP_RETURN script ─────────────────
// Script: OP_RETURN (0x6a) + OP_13 (0x5d) + <push payload>
function wrapRunestone(integers: bigint[]): Buffer {
  const payload = Buffer.concat(integers.map(encodeVarint));
  const len     = payload.length;
  let prefix: Buffer;
  if (len <= 75)        prefix = Buffer.from([len]);
  else if (len <= 255)  prefix = Buffer.from([0x4c, len]);           // OP_PUSHDATA1
  else                  prefix = Buffer.from([0x4d, len & 0xff, (len >> 8) & 0xff]); // OP_PUSHDATA2
  return Buffer.concat([Buffer.from([0x6a, 0x5d]), prefix, payload]);
}

// ── Transfer Runestone ────────────────────────────────────────────────────────
// Sends exactly `rawAmount` NXWV to output at `recipientIdx`.
// All remaining (unallocated) Runes go to output at `changeIdx` via the Pointer.
//
// Integer sequence: [22, changeIdx, 0, block, tx, amount, recipientIdx]
//   Tag 22 = Pointer (unallocated Runes → changeIdx)
//   Tag  0 = Body    (start of edict section)
//   Edict  = [block_delta, tx_delta, amount, recipientIdx]
function buildTransferRunestone(rawAmount: bigint, recipientIdx: number, changeIdx: number): Buffer {
  return wrapRunestone([
    22n, BigInt(changeIdx),          // Pointer → Rune change output
    0n,                              // Body tag (edict section begins)
    RUNE_BLOCK, RUNE_TX,             // edict: Rune ID (first edict, deltas from 0)
    rawAmount,                       // edict: exact amount to send
    BigInt(recipientIdx),            // edict: output index for recipient
  ]);
}

// ── Mint Runestone ────────────────────────────────────────────────────────────
// Mints one batch of NEXUS•WAVELENGTH and sends minted Runes to `receiverIdx`.
// Integer sequence: [20, block, 20, tx, 22, receiverIdx]
//   Tag 20 (×2) = Mint field: block then tx of the Rune to mint
//   Tag 22      = Pointer: minted Runes → receiverIdx
function buildMintRunestone(receiverIdx: number): Buffer {
  return wrapRunestone([
    20n, RUNE_BLOCK,                 // Mint.block
    20n, RUNE_TX,                    // Mint.tx
    22n, BigInt(receiverIdx),        // Pointer → minted Runes go here
  ]);
}

// ── chain_stats balance (authoritative — /utxo status lags) ──────────────────
async function getConfirmedBalance(address: string): Promise<number> {
  const d = await fetch(`${MEMPOOL}/address/${address}`, {
    signal: AbortSignal.timeout(10_000),
  }).then(r => r.json());
  return d.chain_stats.funded_txo_sum - d.chain_stats.spent_txo_sum;
}

// ── Taproot key tweak ─────────────────────────────────────────────────────────
function getTweakedKeypair(wallet: NonNullable<ReturnType<typeof getServiceWallet>>) {
  const internalPubkey = Buffer.from(wallet.keyPair.publicKey).slice(1, 33);
  const tweak          = bitcoin.crypto.taggedHash("TapTweak", internalPubkey);
  const tweakedPriv    = Buffer.from(tinysecp.privateAdd(wallet.keyPair.privateKey!, tweak)!);
  return {
    tweakedKP:      ECPair.fromPrivateKey(tweakedPriv, { network: NETWORK }),
    internalPubkey,
  };
}

// ── Sign & broadcast ──────────────────────────────────────────────────────────
function signAndFinalize(psbt: bitcoin.Psbt, count: number, tweakedKP: ReturnType<typeof ECPair.fromPrivateKey>): string {
  for (let i = 0; i < count; i++) psbt.signInput(i, tweakedKP);
  psbt.finalizeAllInputs();
  return psbt.extractTransaction().toHex();
}

async function broadcastTx(txHex: string): Promise<string> {
  for (const url of [`${MEMPOOL}/tx`, "https://blockstream.info/api/tx"]) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body:    txHex,
        signal:  AbortSignal.timeout(15_000),
      });
      if (res.ok) return (await res.text()).trim();
    } catch { /* try next */ }
  }
  throw new Error("Broadcast failed on mempool.space and blockstream.info");
}

// ── Core: send Runes to an external address ───────────────────────────────────
export async function sendRuneTransfer(
  recipientAddress: string,
  rawAmount: bigint,
): Promise<string> {
  const wallet = getServiceWallet();
  if (!wallet) throw new Error("BTC_INSCRIPTION_WALLET_WIF not set");

  const feeRate = await getFeeRate("low");
  const utxos   = await getUTXOs(wallet.address);
  if (utxos.length === 0) throw new Error("Service wallet has no UTXOs");

  // Separate Rune-carrier dust from BTC-funding UTXOs.
  // Rune carriers: 546-sat outputs from mints — must be included as inputs so
  //   Runes enter the tx; the Pointer then routes change back to out2.
  // BTC funding: larger outputs that cover fees and change.
  const runeCarriers = utxos.filter(u => u.value === 546);
  const btcFunding   = utxos.filter(u => u.value > 546);

  // Use total spendable (confirmed + unconfirmed mempool change) so recent
  // unconfirmed mint-change UTXOs don't block order fulfillment.
  const spendable    = utxos.reduce((s, u) => s + u.value, 0);

  // Tx layout:
  //   in:  all UTXOs (P2TR, 58 vB each)
  //   out0: OP_RETURN Runestone (~15 vB)
  //   out1: recipient 546 sats  (P2TR 43 vB)
  //   out2: service wallet 546 sats Rune change (P2TR 43 vB, via Pointer)
  //   out3: service wallet BTC change (P2TR 43 vB)
  //   overhead: 10 vB
  const estVbytes = 10 + utxos.length * 58 + 15 + 43 + 43 + 43;
  const fee       = BigInt(estVbytes * feeRate);
  const totalNeed = DUST + DUST + fee; // out1 + out2 + fee

  if (BigInt(spendable) < totalNeed)
    throw new Error(`Need ${totalNeed} sats, have ${spendable} (confirmed+unconfirmed)`);
  if (runeCarriers.length === 0)
    throw new Error("No Rune-carrier UTXOs found in service wallet — run a mint first");

  const allInputs = [...runeCarriers, ...btcFunding]; // Rune carriers first → index stable

  const { tweakedKP, internalPubkey } = getTweakedKeypair(wallet);
  const psbt = new bitcoin.Psbt({ network: NETWORK });

  for (const u of allInputs) {
    psbt.addInput({
      hash:           u.txid,
      index:          u.vout,
      witnessUtxo:    { script: wallet.p2tr.output!, value: BigInt(u.value) },
      tapInternalKey: internalPubkey,
    });
  }

  const runestone = buildTransferRunestone(rawAmount, 1, 2);
  psbt.addOutput({ script: runestone, value: 0n });            // out0: Runestone
  psbt.addOutput({ address: recipientAddress, value: DUST });  // out1: recipient gets Runes
  psbt.addOutput({ address: wallet.address, value: DUST });    // out2: Rune change back to us

  const totalIn = BigInt(allInputs.reduce((s, u) => s + u.value, 0));
  const change  = totalIn - DUST - DUST - fee;
  if (change > DUST)
    psbt.addOutput({ address: wallet.address, value: change }); // out3: BTC change

  const txHex = signAndFinalize(psbt, allInputs.length, tweakedKP);
  const txid  = await broadcastTx(txHex);
  console.log(`[Rune Processor] ✓ Transfer ${rawAmount} raw NXWV → ${recipientAddress} | txid: ${txid}`);
  return txid;
}

// ── Mint one batch of NEXUS•WAVELENGTH ───────────────────────────────────────
export async function mintOneNXWV(): Promise<string> {
  const wallet = getServiceWallet();
  if (!wallet) throw new Error("BTC_INSCRIPTION_WALLET_WIF not set");

  const feeRate       = await getFeeRate("low");
  const confirmedSats = await getConfirmedBalance(wallet.address);
  const utxos         = await getUTXOs(wallet.address);
  if (utxos.length === 0) throw new Error("Service wallet has no UTXOs");

  // Tx layout:
  //   in:  all UTXOs
  //   out0: OP_RETURN Mint Runestone (~13 vB)
  //   out1: service wallet 546 sats — receives minted Runes
  //   out2: service wallet BTC change
  const estVbytes = 10 + utxos.length * 58 + 13 + 43 + 43;
  const fee       = BigInt(estVbytes * feeRate);
  const totalNeed = DUST + fee;

  if (BigInt(confirmedSats) < totalNeed)
    throw new Error(`Need ${totalNeed} sats confirmed for mint, have ${confirmedSats}`);

  const { tweakedKP, internalPubkey } = getTweakedKeypair(wallet);
  const psbt = new bitcoin.Psbt({ network: NETWORK });

  for (const u of utxos) {
    psbt.addInput({
      hash:           u.txid,
      index:          u.vout,
      witnessUtxo:    { script: wallet.p2tr.output!, value: BigInt(u.value) },
      tapInternalKey: internalPubkey,
    });
  }

  const runestone = buildMintRunestone(1);
  psbt.addOutput({ script: runestone, value: 0n });           // out0: Mint Runestone
  psbt.addOutput({ address: wallet.address, value: DUST });   // out1: receives minted Runes

  const totalIn = BigInt(utxos.reduce((s, u) => s + u.value, 0));
  const change  = totalIn - DUST - fee;
  if (change > DUST)
    psbt.addOutput({ address: wallet.address, value: change }); // out2: BTC change

  const txHex = signAndFinalize(psbt, utxos.length, tweakedKP);
  const txid  = await broadcastTx(txHex);
  console.log(`[Rune Processor] ✓ Minted ${RUNE_AMOUNT_PER_MINT.toLocaleString()} raw NXWV → ${wallet.address} | txid: ${txid}`);
  return txid;
}

// ── Claim remaining mints ─────────────────────────────────────────────────────
export async function claimRemainingMints(): Promise<string[]> {
  const info = await fetch(`https://ordinals.com/rune/NEXUS%E2%80%A2WAVELENGTH`, {
    headers: { Accept: "application/json" },
    signal:  AbortSignal.timeout(10_000),
  }).then(r => r.json()).catch(() => null);

  const minted   = Number(info?.entry?.mints ?? 996);
  const cap      = Number(info?.entry?.terms?.cap ?? 1000);
  const remaining = cap - minted;

  if (remaining <= 0) {
    console.log("[Rune Processor] All mints already claimed — supply is locked.");
    return [];
  }

  console.log(`[Rune Processor] Claiming ${remaining} remaining mint(s) (${minted}/${cap} done)…`);
  const txids: string[] = [];

  for (let i = 0; i < remaining; i++) {
    try {
      const txid = await mintOneNXWV();
      txids.push(txid);
      console.log(`[Rune Processor] Mint ${i + 1}/${remaining} done: ${txid}`);
      // Short pause between mints — let each propagate to mempool
      if (i < remaining - 1) await new Promise(r => setTimeout(r, 5_000));
    } catch (e: any) {
      console.error(`[Rune Processor] Mint ${i + 1} failed: ${e.message}`);
      break;
    }
  }
  return txids;
}

// ── Order queue processor ─────────────────────────────────────────────────────
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
    if (order.direction !== "nxt_to_rune") continue;

    try {
      const rawAmount = BigInt(order.runeAmount); // divisibility=0, raw=display
      const txid = await sendRuneTransfer(order.btcAddress, rawAmount);

      await db.update(runeSwaps).set({
        status:      "completed",
        btcTxid:     txid,
        completedAt: new Date(),
        note:        `${order.note ?? ""} | Auto-fulfilled by Rune Processor`,
      }).where(eq(runeSwaps.id, order.id));

      try {
        const { sendAdminAlert } = await import("./telegram-bot.js");
        await sendAdminAlert(
          `💜 <b>NXWV Auto-Delivered!</b>\n\n` +
          `Order #${order.id} · <b>${order.runeAmount.toLocaleString()} NXWV</b>\n` +
          `To: <code>${order.btcAddress}</code>\n` +
          `Txid: <code>${txid}</code>\n\n` +
          `<a href="https://mempool.space/tx/${txid}">mempool.space</a>`
        );
      } catch { /* non-fatal */ }

      try {
        const { publishToNostr } = await import("./nostr-service.js");
        await publishToNostr({
          content: [
            `💜 NEXUS•WAVELENGTH Rune delivered on Bitcoin!`,
            ``,
            `${order.runeAmount.toLocaleString()} NXWV sent automatically via the NexusOS pipeline.`,
            `NXT → sats → NXWV in under 60 seconds.`,
            ``,
            `wnsp.io/rune-pipeline`,
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

// ── Start polling loop ────────────────────────────────────────────────────────
export function startRuneProcessor(intervalMs = 60_000): NodeJS.Timeout {
  console.log(`[Rune Processor] Started — checking every ${intervalMs / 1000}s`);
  processRuneOrders().catch(console.error);
  return setInterval(() => processRuneOrders().catch(console.error), intervalMs);
}
