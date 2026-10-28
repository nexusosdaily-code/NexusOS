/**
 * BTC Withdrawal Processor
 * Reads pending sats → BTC withdrawal requests and broadcasts real on-chain transactions.
 * Uses the same service wallet and signing flow as the inscription engine.
 */

import * as bitcoin from "bitcoinjs-lib";
import * as tinysecp from "tiny-secp256k1";
import { getServiceWallet, getSafeUTXOs, getFeeRate } from "./btc-inscription-engine.js";
import { ECPairFactory } from "ecpair";
import type { Pool } from "pg";
import { applyWithdrawalReconciliation, type WithdrawalEvidenceReader } from "./withdrawal-reconciliation";
import { processBtcWithdrawalQueue, type ConstructedWithdrawal } from "./btc-withdrawal-attempt";

/** Operator-only broadcast reconciliation; missing evidence never releases sats. */
export function reconcileBtcWithdrawal(
  pool: Pick<Pool, "connect">, approvalId: string, confirmedKey: string, reader: WithdrawalEvidenceReader,
) {
  return applyWithdrawalReconciliation(pool, approvalId, confirmedKey, "bitcoin", reader);
}

bitcoin.initEccLib(tinysecp);
const ECPair   = ECPairFactory(tinysecp);
const NETWORK  = bitcoin.networks.bitcoin;
const ESPLORA  = "https://blockstream.info/api";
const DUST     = 546;

async function broadcastTx(txHex: string): Promise<string> {
  const res = await fetch(`${ESPLORA}/tx`, {
    method: "POST",
    headers: { "Content-Type": "text/plain" },
    body: txHex,
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error("Broadcast outcome unknown");
  return (await res.text()).trim();
}

export async function constructBtcWithdrawal(destAddress: string, amountSats: number): Promise<ConstructedWithdrawal> {
  const wallet = getServiceWallet();
  if (!wallet) throw new Error("BTC service wallet not configured (BTC_INSCRIPTION_WALLET_WIF missing)");

  const feeRate = await getFeeRate("medium");
  const { utxos: safeUtxos, blockedCount } = await getSafeUTXOs(wallet.address);
  if (blockedCount > 0) {
    console.warn(`[BTC Withdrawal] 🛡️ Rune Guard blocked ${blockedCount} UTXO(s) — they will NOT be used as inputs`);
  }
  const spendable = safeUtxos.filter(u => u.status.confirmed).length > 0
    ? safeUtxos.filter(u => u.status.confirmed)
    : safeUtxos;

  if (spendable.length === 0)
    throw new Error(`Service wallet ${wallet.address} has no spendable UTXOs — fund the wallet first. (Rune-bearing UTXOs are protected and cannot be used.)`);

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
  // BIP340 x-only keys represent the even-Y point. Negate odd-Y private
  // keys before applying the BIP341 tweak, matching the P2TR output key.
  const privateKey = wallet.keyPair.publicKey[0] === 3
    ? tinysecp.privateNegate(wallet.keyPair.privateKey!)
    : wallet.keyPair.privateKey!;
  const tweaked = tinysecp.privateAdd(privateKey, tweak);
  if (!tweaked) throw new Error("Invalid Taproot signing tweak");
  const tweakedPriv = Buffer.from(tweaked);
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

  return {
    txHex: psbt.extractTransaction().toHex(),
    serviceScript: Buffer.from(wallet.p2tr.output!).toString("hex"),
    inputs: selected.map(u => ({
      txid: u.txid, vout: u.vout, valueSats: String(u.value),
      script: Buffer.from(wallet.p2tr.output!).toString("hex"),
    })),
  };
}

export async function processWithdrawalQueue(): Promise<void> {
  const { pool } = await import("./db.js");
  const { isUserOutgoingLocked } = await import("./founder-wallet-lock");
  await processBtcWithdrawalQueue(pool, {
    isLocked: isUserOutgoingLocked, construct: constructBtcWithdrawal, broadcast: broadcastTx,
  });
}

export function startWithdrawalProcessor(intervalMs = 60_000): NodeJS.Timeout {
  console.log(`[BTC Withdrawal] Processor started — checking every ${intervalMs / 1000}s`);
  processWithdrawalQueue().catch(console.error); // run immediately on boot
  return setInterval(() => processWithdrawalQueue().catch(console.error), intervalMs);
}
