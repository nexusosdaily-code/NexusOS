/**
 * BTC Withdrawal Processor
 * Reads pending sats → BTC withdrawal requests and broadcasts real on-chain transactions.
 * Uses the same service wallet and signing flow as the inscription engine.
 */

import * as bitcoin from "bitcoinjs-lib";
import * as tinysecp from "tiny-secp256k1";
import { getServiceWallet, getUTXOs, getFeeRate } from "./btc-inscription-engine.js";
import { ECPairFactory } from "ecpair";

bitcoin.initEccLib(tinysecp);
const ECPair   = ECPairFactory(tinysecp);
const NETWORK  = bitcoin.networks.bitcoin;
const ESPLORA  = "https://blockstream.info/api";
const MEMPOOL  = "https://mempool.space/api";
const DUST     = 546;

async function broadcastTx(txHex: string): Promise<string> {
  for (const url of [`${ESPLORA}/tx`, `${MEMPOOL}/tx`]) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: txHex,
        signal: AbortSignal.timeout(15000),
      });
      if (res.ok) return (await res.text()).trim();
    } catch { /* try next */ }
  }
  throw new Error("Failed to broadcast via Blockstream and mempool.space");
}

export async function sendBtcOnChain(destAddress: string, amountSats: number): Promise<string> {
  const wallet = getServiceWallet();
  if (!wallet) throw new Error("BTC service wallet not configured (BTC_INSCRIPTION_WALLET_WIF missing)");

  const feeRate = await getFeeRate("medium");
  const utxos   = await getUTXOs(wallet.address);
  const spendable = utxos.filter(u => u.status.confirmed).length > 0
    ? utxos.filter(u => u.status.confirmed)
    : utxos;

  if (spendable.length === 0)
    throw new Error(`Service wallet ${wallet.address} has no UTXOs — fund the wallet first`);

  // Estimate vbytes: 1 P2TR input (57.5 vbytes) + 2 outputs (P2TR + any format ~31-43 vbytes each) + overhead 10
  const estVbytes = 10 + spendable.length * 58 + 2 * 43;
  const networkFee = estVbytes * feeRate;
  const totalNeeded = amountSats + networkFee;

  let selected: typeof spendable = [];
  let total = 0;
  for (const u of spendable.sort((a, b) => b.value - a.value)) {
    selected.push(u); total += u.value;
    if (total >= totalNeeded) break;
  }
  if (total < totalNeeded)
    throw new Error(`Service wallet has ${total} sats but needs ${totalNeeded} (${amountSats} + ${networkFee} fee)`);

  const change = total - amountSats - networkFee;

  // BIP341: tweak private key for key-path spend
  const internalPubkey = Buffer.from(wallet.keyPair.publicKey).slice(1, 33);
  const tweak = bitcoin.crypto.taggedHash("TapTweak", internalPubkey);
  const tweakedPriv = Buffer.from(tinysecp.privateAdd(wallet.keyPair.privateKey!, tweak)!);
  const tweakedKeyPair = ECPair.fromPrivateKey(tweakedPriv, { network: NETWORK });

  const psbt = new bitcoin.Psbt({ network: NETWORK });

  for (const u of selected) {
    psbt.addInput({
      hash:         u.txid,
      index:        u.vout,
      witnessUtxo:  { script: wallet.p2tr.output!, value: BigInt(u.value) },
      tapInternalKey: internalPubkey,
    });
  }

  psbt.addOutput({ address: destAddress, value: BigInt(amountSats) });
  if (change > DUST) {
    psbt.addOutput({ address: wallet.address, value: BigInt(change) });
  }

  for (let i = 0; i < selected.length; i++) {
    psbt.signInput(i, tweakedKeyPair);
  }
  psbt.finalizeAllInputs();

  const txHex = psbt.extractTransaction().toHex();
  const txid  = await broadcastTx(txHex);
  console.log(`[BTC Withdrawal] ✓ Sent ${amountSats} sats → ${destAddress} | txid: ${txid}`);
  return txid;
}

export async function processWithdrawalQueue(): Promise<void> {
  const { db }  = await import("./db.js");
  const { lightningTransactions } = await import("../shared/schema.js");
  const { eq, and } = await import("drizzle-orm");

  const pending = await db.select().from(lightningTransactions)
    .where(and(
      eq(lightningTransactions.type, "withdrawal"),
      eq(lightningTransactions.status, "pending"),
    ));

  if (pending.length === 0) return;
  console.log(`[BTC Withdrawal] Processing ${pending.length} pending withdrawal(s)…`);

  for (const tx of pending) {
    if (!tx.btcAddress) {
      // Legacy records without btc_address — try to extract from memo
      const match = tx.memo?.match(/to\s+(bc1[a-z0-9]+|[13][a-zA-HJ-NP-Z0-9]+)/);
      if (!match) {
        await db.update(lightningTransactions)
          .set({ status: "failed", completedAt: new Date() })
          .where(eq(lightningTransactions.id, tx.id));
        console.warn(`[BTC Withdrawal] TX #${tx.id} has no btc_address — marked failed`);
        continue;
      }
      // Patch the record with the extracted address so next run works cleanly
      await db.update(lightningTransactions)
        .set({ btcAddress: match[1] })
        .where(eq(lightningTransactions.id, tx.id));
      tx.btcAddress = match[1];
    }

    try {
      const txid = await sendBtcOnChain(tx.btcAddress, tx.amountSats);
      await db.update(lightningTransactions)
        .set({ status: "completed", btcTxid: txid, completedAt: new Date() })
        .where(eq(lightningTransactions.id, tx.id));
      console.log(`[BTC Withdrawal] ✓ TX #${tx.id} completed → ${txid}`);
    } catch (err: any) {
      console.error(`[BTC Withdrawal] ✗ TX #${tx.id} failed: ${err.message}`);
      await db.update(lightningTransactions)
        .set({ status: "failed", memo: `${tx.memo} | ERROR: ${err.message}`, completedAt: new Date() })
        .where(eq(lightningTransactions.id, tx.id));
    }
  }
}

export function startWithdrawalProcessor(intervalMs = 60_000): NodeJS.Timeout {
  console.log(`[BTC Withdrawal] Processor started — checking every ${intervalMs / 1000}s`);
  processWithdrawalQueue().catch(console.error); // run immediately on boot
  return setInterval(() => processWithdrawalQueue().catch(console.error), intervalMs);
}
