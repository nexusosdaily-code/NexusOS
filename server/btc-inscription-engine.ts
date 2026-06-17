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

// ── Rune Guard ────────────────────────────────────────────────────────────────
// Queries ordinals.com to identify Rune-bearing UTXOs so they are NEVER spent
// without an explicit Runestone transfer instruction. This prevents the NEXUS•WAVELENGTH
// burn incident (where CPFP sweeps consumed Rune-bearing dust without a Runestone,
// causing the protocol to permanently burn those tokens).

export async function getRuneBearingUtxoIds(address: string): Promise<Set<string>> {
  const runeIds = new Set<string>();
  try {
    const res = await fetch(`https://ordinals.com/address/${address}`, {
      signal: AbortSignal.timeout(10_000),
      headers: { Accept: "text/html" },
    });
    if (!res.ok) return runeIds;
    const html = await res.text();

    // Isolate the rune balances section (appears before "outputs" heading)
    const runeSection = html.match(/rune.{0,10}balance[\s\S]*?(?=<h\d|outputs\s*\n|$)/i)?.[0] ?? "";
    // Extract txid:vout patterns (64 hex chars + colon + 1-3 digits)
    const matches = runeSection.matchAll(/([a-f0-9]{64}):(\d{1,3})/g);
    for (const m of matches) runeIds.add(`${m[1]}:${m[2]}`);

    if (runeIds.size > 0) {
      console.warn(`[Rune Guard] 🛡️ ${runeIds.size} Rune-bearing UTXO(s) detected at ${address.slice(0, 22)}…`);
      for (const id of runeIds) console.warn(`  ↳ ${id} [PROTECTED — DO NOT SPEND WITHOUT RUNESTONE]`);
    }
  } catch (err) {
    // Log but do not throw — we apply the dust fallback below
    console.warn(`[Rune Guard] ordinals.com check failed for ${address.slice(0, 22)}…: ${(err as Error).message}`);
  }
  return runeIds;
}

export interface SafeUtxoResult {
  utxos:        UTXO[];
  blockedCount: number;
  blockedSats:  number;
  blockedIds:   string[];
}

/**
 * Returns only UTXOs safe to spend — Rune-bearing outputs are excluded.
 * Two-layer protection:
 *   1. ordinals.com Rune index check (primary)
 *   2. Exact-546-sat dust filter (fallback when ordinals.com is unreachable)
 *      — 546 sats is the canonical Rune dust limit; never spend it without verification.
 */
export async function getSafeUTXOs(address: string): Promise<SafeUtxoResult> {
  const [all, runeIds] = await Promise.all([
    getUTXOs(address),
    getRuneBearingUtxoIds(address),
  ]);

  const blocked: UTXO[] = [];
  const safe:    UTXO[] = [];

  for (const u of all) {
    const id = `${u.txid}:${u.vout}`;
    // Primary: ordinals.com confirmed Rune UTXO
    if (runeIds.has(id)) {
      blocked.push(u);
      continue;
    }
    // Fallback: if ordinals.com returned nothing but we have a 546-sat UTXO,
    // treat it as potentially Rune-bearing and skip it to be safe.
    if (runeIds.size === 0 && u.value === 546) {
      console.warn(`[Rune Guard] ⚠️  Skipping 546-sat UTXO ${id} — may carry Rune balance (ordinals.com unreachable)`);
      blocked.push(u);
      continue;
    }
    safe.push(u);
  }

  if (blocked.length > 0) {
    const totalSats = blocked.reduce((s, u) => s + u.value, 0);
    console.warn(
      `[Rune Guard] 🛡️ PROTECTED ${blocked.length} UTXO(s) — ` +
      `${totalSats} sats withheld from spending (Rune-bearing)`
    );
  }

  return {
    utxos:        safe,
    blockedCount: blocked.length,
    blockedSats:  blocked.reduce((s, u) => s + u.value, 0),
    blockedIds:   blocked.map(u => `${u.txid}:${u.vout}`),
  };
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

  // Commit P2TR: script-path spend with inscription envelope.
  // Must pass `redeem` so bitcoinjs-lib generates witness/controlBlock.
  const redeemArg = { output: inscScript, redeemVersion: 0xC0 as const };
  const commitP2tr = bitcoin.payments.p2tr({
    internalPubkey,
    scriptTree,
    redeem: redeemArg,
    network: NETWORK,
  });
  if (!commitP2tr.witness || commitP2tr.witness.length < 2) {
    throw new Error("Failed to derive P2TR witness for commit address — check bitcoinjs-lib version");
  }
  const commitAddress = commitP2tr.address!;
  // Control block is the last item in the witness stack (scriptTree path)
  const controlBlock = commitP2tr.witness[commitP2tr.witness.length - 1];

  // ── Estimate fees ───────────────────────────────────────────────────────
  // Commit: ~150 vbytes base + content overhead
  // Reveal: ~200 vbytes base + inscription script size
  const revealVbytes = 200 + Math.ceil(inscScript.length / 4);
  const commitVbytes = 150;
  const revealFee    = revealVbytes * feeRate;
  const commitFee    = commitVbytes * feeRate;
  const postageValue = 546; // dust limit — the sat that carries the inscription
  const commitAmount = postageValue + revealFee; // commit sends enough for reveal + postage

  // ── Get UTXOs from service wallet (Rune Guard applied) ──────────────────
  const { utxos: safeUtxos, blockedCount } = await getSafeUTXOs(wallet.address);
  if (blockedCount > 0) {
    console.warn(`[BTC Inscription] 🛡️ Rune Guard blocked ${blockedCount} UTXO(s) — they will NOT be used as inputs`);
  }
  const confirmed = safeUtxos.filter(u => u.status.confirmed);
  // Allow unconfirmed UTXOs if no confirmed ones yet (CPFP — both TXs confirm together)
  const spendable = confirmed.length > 0 ? confirmed : safeUtxos;
  if (spendable.length === 0) throw new Error(`No spendable UTXOs on service wallet ${wallet.address}. Send BTC to this address first. (Rune-bearing UTXOs are protected and cannot be used.)`);
  if (confirmed.length === 0) console.log(`[BTC Inscription] Using ${safeUtxos.length} unconfirmed UTXO(s) — CPFP chain`);

  // Select UTXOs to cover commitAmount + commitFee
  const needed = commitAmount + commitFee;
  let selected: UTXO[] = [], total = 0;
  for (const u of spendable.sort((a, b) => b.value - a.value)) {
    selected.push(u); total += u.value;
    if (total >= needed) break;
  }
  if (total < needed) throw new Error(`Insufficient balance. Need ${needed} sats, have ${total} sats on ${wallet.address}`);

  const change = total - commitAmount - commitFee;
  const changeAddress = opts.changeAddress ?? wallet.address;

  // ── Tweak the private key for key-path spend (BIP341) ───────────────────
  // Service wallet is key-path only (no script tree), so tweak = TapTweak(pubkey)
  const rawPrivKey = wallet.keyPair.privateKey!;
  const tweak = bitcoin.crypto.taggedHash("TapTweak", internalPubkey);
  const tweakedPrivKeyBuf = Buffer.from(tinysecp.privateAdd(rawPrivKey, tweak)!);
  const tweakedKeyPair = ECPair.fromPrivateKey(tweakedPrivKeyBuf, { network: NETWORK });

  // ── Build Commit TX ─────────────────────────────────────────────────────
  const commitPsbt = new bitcoin.Psbt({ network: NETWORK });
  for (const u of selected) {
    commitPsbt.addInput({
      hash: u.txid,
      index: u.vout,
      witnessUtxo: {
        script: wallet.p2tr.output!,
        value: BigInt(u.value),
      },
      tapInternalKey: internalPubkey,
    });
  }
  commitPsbt.addOutput({ address: commitAddress, value: BigInt(commitAmount) });
  if (change > 546) commitPsbt.addOutput({ address: changeAddress, value: BigInt(change) });

  for (let i = 0; i < selected.length; i++) {
    commitPsbt.signInput(i, tweakedKeyPair);
  }
  commitPsbt.finalizeAllInputs();
  const commitTx = commitPsbt.extractTransaction();
  const commitTxid = await broadcastTx(commitTx.toHex());

  // ── Build Reveal TX ─────────────────────────────────────────────────────
  const revealPsbt = new bitcoin.Psbt({ network: NETWORK });
  revealPsbt.addInput({
    hash: commitTxid,
    index: 0,
    witnessUtxo: { script: commitP2tr.output!, value: BigInt(commitAmount) },
    tapInternalKey: internalPubkey,
    tapLeafScript: [{
      leafVersion: 0xC0,
      script: inscScript,
      controlBlock,
    }],
  });
  revealPsbt.addOutput({ address: wallet.address, value: BigInt(postageValue) });

  // Script-path spend: sign with the original untweaked key
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
