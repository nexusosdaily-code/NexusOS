/**
 * BTC Inscription Engine — Full Automation
 * Creates and broadcasts Bitcoin Ordinal inscriptions automatically.
 *
 * Protocol: Taproot (P2TR) script-path spend with inscription envelope
 * Network:  Bitcoin Mainnet via Blockstream Esplora API
 *
 * SECURITY: Private key stored in BTC_INSCRIPTION_WALLET_WIF env secret.
 * Use a DEDICATED service wallet — never the main Unisat wallet.
 * Fund with only what's needed for fees (~$50–200 at a time).
 */

import * as bitcoin from "bitcoinjs-lib";
import * as tinysecp from "tiny-secp256k1";
import { ECPairFactory } from "ecpair";

bitcoin.initEccLib(tinysecp);
const ECPair = ECPairFactory(tinysecp);

const NETWORK = bitcoin.networks.bitcoin;
const ESPLORA  = "https://blockstream.info/api";
const MEMPOOL  = "https://mempool.space/api";

// ── Types ────────────────────────────────────────────────────────────────────
export interface UTXO {
  txid: string;
  vout: number;
  value: number; // satoshis
  status: { confirmed: boolean; block_height?: number };
}

export interface InscriptionResult {
  commitTxid:  string;
  revealTxid:  string;
  inscriptionId: string; // revealTxid + "i0"
  feeSats:     number;
  contentBytes: number;
  address:     string;
}

// ── Wallet ───────────────────────────────────────────────────────────────────
function loadKeyPair(raw: string): ReturnType<typeof ECPair.fromWIF> | null {
  const trimmed = raw.trim();

  // Try as 64-char hex private key first
  if (/^[0-9a-fA-F]{64}$/.test(trimmed)) {
    try {
      const buf = Buffer.from(trimmed, "hex");
      return ECPair.fromPrivateKey(buf, { network: NETWORK, compressed: true });
    } catch {}
  }

  // Base58 alphabet — "0", "O", "I", "l" are excluded from base58
  const B58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

  // Try WIF as-is (exact string)
  if (/^[KL5]/.test(trimmed)) {
    try { return ECPair.fromWIF(trimmed, NETWORK); } catch {}

    // Sweep every length (handles trailing garbage)
    for (let len = 52; len >= 51; len--) {
      if (trimmed.length >= len) {
        try { return ECPair.fromWIF(trimmed.slice(0, len), NETWORK); } catch {}
      }
    }
    for (let len = 53; len <= trimmed.length; len++) {
      try { return ECPair.fromWIF(trimmed.slice(0, len), NETWORK); } catch {}
    }

    // Strip invalid base58 chars (like '0', 'O', 'I', 'l') and retry
    const stripped = trimmed.split("").filter(c => B58.includes(c)).join("");
    if (stripped !== trimmed && /^[KL5]/.test(stripped)) {
      try { return ECPair.fromWIF(stripped, NETWORK); } catch {}
      for (let len = 51; len <= Math.min(stripped.length, 54); len++) {
        try { return ECPair.fromWIF(stripped.slice(0, len), NETWORK); } catch {}
      }
    }

    // Try every starting position (prefix contamination)
    for (let start = 1; start < trimmed.length - 50; start++) {
      for (const len of [52, 51]) {
        if (start + len <= trimmed.length) {
          const sub = trimmed.slice(start, start + len);
          if (/^[KL5]/.test(sub) && ![...sub].some(c => !B58.includes(c))) {
            try { return ECPair.fromWIF(sub, NETWORK); } catch {}
          }
        }
      }
    }
  }

  // Last resort: try WIF anyway
  try { return ECPair.fromWIF(trimmed, NETWORK); } catch {}
  return null;
}

export function getServiceWallet(): { wif: string; keyPair: ReturnType<typeof ECPair.fromWIF>; address: string; p2tr: bitcoin.payments.Payment } | null {
  const raw = process.env.BTC_INSCRIPTION_WALLET_WIF;
  if (!raw) return null;
  const keyPair = loadKeyPair(raw);
  if (!keyPair) {
    console.error("[BTC Engine] Could not parse BTC_INSCRIPTION_WALLET_WIF — check format (WIF or 64-char hex)");
    return null;
  }
  try {
    const internalPubkey = Buffer.from(keyPair.publicKey).slice(1, 33);
    const p2tr = bitcoin.payments.p2tr({ internalPubkey, network: NETWORK });
    return { wif: keyPair.toWIF(), keyPair, address: p2tr.address!, p2tr };
  } catch (e) {
    console.error("[BTC Engine] Failed to derive Taproot address:", (e as Error).message);
    return null;
  }
}

export function deriveServiceAddress(raw: string): string | null {
  const keyPair = loadKeyPair(raw);
  if (!keyPair) return null;
  try {
    const internalPubkey = Buffer.from(keyPair.publicKey).slice(1, 33);
    const p2tr = bitcoin.payments.p2tr({ internalPubkey, network: NETWORK });
    return p2tr.address!;
  } catch { return null; }
}

// ── Esplora helpers ───────────────────────────────────────────────────────────
async function esploraGet(path: string): Promise<any> {
  const res = await fetch(`${ESPLORA}${path}`, { signal: AbortSignal.timeout(10000) });
  if (!res.ok) throw new Error(`Esplora ${path}: ${res.status}`);
  return res.json();
}

async function mempoolGet(path: string): Promise<any> {
  const res = await fetch(`${MEMPOOL}${path}`, { signal: AbortSignal.timeout(10000) });
  if (!res.ok) throw new Error(`Mempool ${path}: ${res.status}`);
  return res.json();
}

export async function getUTXOs(address: string): Promise<UTXO[]> {
  try {
    return await esploraGet(`/address/${address}/utxo`);
  } catch {
    // fallback to mempool.space
    return await mempoolGet(`/address/${address}/utxo`);
  }
}

export async function getWalletBalance(address: string): Promise<{ confirmed: number; unconfirmed: number; total: number }> {
  const utxos = await getUTXOs(address);
  const confirmed   = utxos.filter(u => u.status.confirmed).reduce((s, u) => s + u.value, 0);
  const unconfirmed = utxos.filter(u => !u.status.confirmed).reduce((s, u) => s + u.value, 0);
  return { confirmed, unconfirmed, total: confirmed + unconfirmed };
}

export async function getFeeRate(target: "fast" | "medium" | "slow" = "medium"): Promise<number> {
  try {
    const rates = await esploraGet("/fee-estimates");
    const map = { fast: rates["1"] ?? rates["2"], medium: rates["3"] ?? rates["6"], slow: rates["144"] };
    return Math.ceil(map[target] ?? 10);
  } catch {
    return target === "fast" ? 20 : target === "medium" ? 10 : 5;
  }
}

async function broadcastTx(txHex: string): Promise<string> {
  // Try Blockstream first, fallback to mempool.space
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
  throw new Error("Failed to broadcast transaction via all available APIs");
}

// ── Inscription script builder ────────────────────────────────────────────────
function chunkBuffer(buf: Buffer, size: number): Buffer[] {
  const chunks: Buffer[] = [];
  for (let i = 0; i < buf.length; i += size) chunks.push(buf.slice(i, i + size));
  return chunks;
}

function buildInscriptionScript(
  internalPubkey: Buffer,
  contentType: string,
  content: Buffer,
  parentInscriptionId?: string
): Buffer {
  const ops: (number | Buffer)[] = [
    internalPubkey,
    bitcoin.opcodes.OP_CHECKSIG,
    bitcoin.opcodes.OP_0,
    bitcoin.opcodes.OP_IF,
    Buffer.from("ord", "utf8"),
    bitcoin.opcodes.OP_1,
    Buffer.from(contentType, "utf8"),
  ];

  // Parent inscription pointer (child-of wnsp.sats)
  if (parentInscriptionId) {
    ops.push(bitcoin.opcodes.OP_3);
    ops.push(Buffer.from(parentInscriptionId, "hex"));
  }

  ops.push(bitcoin.opcodes.OP_0);

  // Content in 520-byte chunks (OP_PUSH limit)
  chunkBuffer(content, 520).forEach(chunk => ops.push(chunk));

  ops.push(bitcoin.opcodes.OP_ENDIF);

  return bitcoin.script.compile(ops as any);
}

// ── Commit + Reveal ───────────────────────────────────────────────────────────
export async function inscribeText(
  content: string,
  opts: {
    contentType?: string;
    feeRate?: number;
    parentInscriptionId?: string;
    changeAddress?: string;
  } = {}
): Promise<InscriptionResult> {
  const wallet = getServiceWallet();
  if (!wallet) throw new Error("BTC_INSCRIPTION_WALLET_WIF not set. Add it as a secret to enable full automation.");

  const contentType = opts.contentType ?? "text/plain;charset=utf-8";
  const contentBuf  = Buffer.from(content, "utf8");
  const feeRate     = opts.feeRate ?? await getFeeRate("medium");
  const internalPubkey = Buffer.from(wallet.keyPair.publicKey).slice(1, 33);

  // ── Build inscription script ────────────────────────────────────────────
  const inscScript = buildInscriptionScript(internalPubkey, contentType, contentBuf, opts.parentInscriptionId);
  const scriptTree = { output: inscScript };

  // Commit P2TR address (script-path)
  const commitP2tr = bitcoin.payments.p2tr({
    internalPubkey,
    scriptTree,
    network: NETWORK,
  });
  const commitAddress = commitP2tr.address!;

  // ── Estimate fees ───────────────────────────────────────────────────────
  // Commit: ~150 vbytes base + content overhead
  // Reveal: ~200 vbytes base + inscription script size
  const revealVbytes = 200 + Math.ceil(inscScript.length / 4);
  const commitVbytes = 150;
  const revealFee    = revealVbytes * feeRate;
  const commitFee    = commitVbytes * feeRate;
  const postageValue = 546; // dust limit (satoshis) — the sat that carries the inscription
  const commitAmount = postageValue + revealFee; // commit sends enough for reveal + postage

  // ── Get UTXOs from service wallet ───────────────────────────────────────
  const utxos = await getUTXOs(wallet.address);
  const confirmed = utxos.filter(u => u.status.confirmed);
  if (confirmed.length === 0) throw new Error(`No confirmed UTXOs on service wallet ${wallet.address}. Send BTC to this address first.`);

  // Select UTXOs to cover commitAmount + commitFee
  const needed = commitAmount + commitFee;
  let selected: UTXO[] = [], total = 0;
  for (const u of confirmed.sort((a, b) => b.value - a.value)) {
    selected.push(u); total += u.value;
    if (total >= needed) break;
  }
  if (total < needed) throw new Error(`Insufficient balance. Need ${needed} sats, have ${total} sats on ${wallet.address}`);

  const change = total - commitAmount - commitFee;
  const changeAddress = opts.changeAddress ?? wallet.address;

  // ── Build Commit TX ─────────────────────────────────────────────────────
  const commitPsbt = new bitcoin.Psbt({ network: NETWORK });
  for (const u of selected) {
    commitPsbt.addInput({
      hash: u.txid,
      index: u.vout,
      witnessUtxo: {
        script: wallet.p2tr.output!,
        value: u.value,
      },
      tapInternalKey: internalPubkey,
    });
  }
  commitPsbt.addOutput({ address: commitAddress, value: commitAmount });
  if (change > 546) commitPsbt.addOutput({ address: changeAddress, value: change });

  // Sign commit inputs
  const tweakedSigner = wallet.keyPair.tweak(
    bitcoin.crypto.taggedHash("TapTweak", internalPubkey)
  );
  for (let i = 0; i < selected.length; i++) {
    commitPsbt.signInput(i, tweakedSigner);
  }
  commitPsbt.finalizeAllInputs();
  const commitTx = commitPsbt.extractTransaction();
  const commitTxid = await broadcastTx(commitTx.toHex());

  // ── Build Reveal TX ─────────────────────────────────────────────────────
  const revealPsbt = new bitcoin.Psbt({ network: NETWORK });
  revealPsbt.addInput({
    hash: commitTxid,
    index: 0,
    witnessUtxo: { script: commitP2tr.output!, value: commitAmount },
    tapInternalKey: internalPubkey,
    tapLeafScript: [{
      leafVersion: 0xC0,
      script: inscScript,
      controlBlock: commitP2tr.witness![commitP2tr.witness!.length - 1],
    }],
  });
  revealPsbt.addOutput({ address: wallet.address, value: postageValue });

  revealPsbt.signInput(0, wallet.keyPair);
  revealPsbt.finalizeInput(0);
  const revealTx = revealPsbt.extractTransaction();
  const revealTxid = await broadcastTx(revealTx.toHex());

  return {
    commitTxid,
    revealTxid,
    inscriptionId: `${revealTxid}i0`,
    feeSats: commitFee + revealFee,
    contentBytes: contentBuf.length,
    address: wallet.address,
  };
}

// ── Wallet info (no secrets exposed) ─────────────────────────────────────────
export function getServiceWalletInfo(): {
  configured: boolean;
  address: string | null;
  network: string;
  hint: string;
} {
  const wallet = getServiceWallet();
  return {
    configured: !!wallet,
    address: wallet?.address ?? null,
    network: "mainnet",
    hint: wallet ? "Service wallet ready." : "Set BTC_INSCRIPTION_WALLET_WIF secret to enable full automation.",
  };
}
