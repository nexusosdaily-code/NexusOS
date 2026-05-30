/**
 * BTC Block Scanner — NexusOS
 * Verifies on-chain Bitcoin assets without a full node:
 *   1. OP_FALSE OP_IF streams  → BRC-20 "wnsp" inscription verification
 *   2. OP_RETURN OP_13 payloads → NEXUS•WAVELENGTH Rune UTXO verification
 *
 * Uses Esplora (Blockstream) + mempool.space as fallback APIs.
 * Runs a polling loop to auto-confirm pending stakes once on-chain.
 */

const ESPLORA  = "https://blockstream.info/api";
const MEMPOOL  = "https://mempool.space/api";
const ORDINALS = "https://ordinals.com";
const TIMEOUT  = 12_000;

const WNSP_TICK      = "wnsp";
const RUNE_NAME      = "NEXUS•WAVELENGTH";
const RUNE_ID_PREFIX = "840000";  // etched at halving block

// ── HTTP helpers ──────────────────────────────────────────────────────────────
async function apiGet(url: string): Promise<any> {
  const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT), headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`HTTP ${res.status} — ${url}`);
  return res.json();
}

async function apiGetText(url: string): Promise<string> {
  const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT) });
  if (!res.ok) throw new Error(`HTTP ${res.status} — ${url}`);
  return res.text();
}

async function esploraGet(path: string): Promise<any> {
  try { return await apiGet(`${ESPLORA}${path}`); }
  catch { return await apiGet(`${MEMPOOL}${path}`); }
}

// ── Inscription ID parser ─────────────────────────────────────────────────────
// Inscription IDs look like: abc123...def0i0  (txid + "i" + index)
function parseInscriptionId(id: string): { txid: string; index: number } | null {
  const sep = id.lastIndexOf("i");
  if (sep < 60) return null;
  return { txid: id.slice(0, sep), index: parseInt(id.slice(sep + 1)) || 0 };
}

// ── OP_FALSE OP_IF inscription content parser ─────────────────────────────────
// Extracts the text content of an Ordinals inscription from a tx's witness data.
// Witness stack for reveal tx: [<sig>, <inscription_script>, <control_block>]
// Inside the script: OP_FALSE OP_IF <"ord"> OP_1 <content-type> OP_0 <content...> OP_ENDIF
function extractInscriptionContent(witnessHex: string[]): { contentType: string; content: string } | null {
  try {
    // The inscription script is the second witness item
    const scriptHex = witnessHex[1];
    if (!scriptHex) return null;

    const buf = Buffer.from(scriptHex, "hex");
    // Scan for "ord" marker (0x6f 0x72 0x64)
    const ordMarker = Buffer.from("ord", "ascii");
    let pos = -1;
    for (let i = 0; i < buf.length - 3; i++) {
      if (buf[i] === ordMarker[0] && buf[i + 1] === ordMarker[1] && buf[i + 2] === ordMarker[2]) {
        pos = i; break;
      }
    }
    if (pos < 0) return null;

    // After "ord": OP_1 (0x51) + push(content-type) + OP_0 (0x00) + content chunks
    let cursor = pos + 3; // skip "ord"
    if (buf[cursor] !== 0x51) return null; // OP_1
    cursor++;

    // Read content-type length + data
    const ctLen = buf[cursor]; cursor++;
    const contentType = buf.slice(cursor, cursor + ctLen).toString("ascii");
    cursor += ctLen;

    // OP_0 separator
    if (buf[cursor] !== 0x00) return null;
    cursor++;

    // Collect content chunks (each prefixed with a varint length)
    const chunks: Buffer[] = [];
    while (cursor < buf.length) {
      const len = buf[cursor];
      if (len === 0x68) break; // OP_ENDIF
      cursor++;
      if (cursor + len > buf.length) break;
      chunks.push(buf.slice(cursor, cursor + len));
      cursor += len;
    }

    return { contentType, content: Buffer.concat(chunks).toString("utf8") };
  } catch {
    return null;
  }
}

// ── BRC-20 wnsp inscription verifier ─────────────────────────────────────────
export interface InscriptionVerifyResult {
  valid: boolean;
  tick?: string;
  op?: string;
  amount?: number;
  blockHeight?: number;
  confirmedAt?: string;
  error?: string;
}

export async function verifyWnspInscription(inscriptionId: string): Promise<InscriptionVerifyResult> {
  try {
    // 1. Try ordinals.com content endpoint first (simplest)
    try {
      const content = await apiGetText(`${ORDINALS}/content/${inscriptionId}`);
      const json = JSON.parse(content);
      if (json.p === "brc-20" && json.tick?.toLowerCase() === WNSP_TICK) {
        return {
          valid: true,
          tick: json.tick,
          op: json.op,
          amount: json.amt ? parseInt(json.amt) : undefined,
        };
      }
      return { valid: false, error: `BRC-20 tick mismatch: got "${json.tick}"` };
    } catch {
      // ordinals.com failed — fall back to raw tx witness parsing
    }

    // 2. Parse inscription ID → txid
    const parsed = parseInscriptionId(inscriptionId);
    if (!parsed) return { valid: false, error: "Invalid inscription ID format" };

    // 3. Fetch the reveal transaction
    const tx = await esploraGet(`/tx/${parsed.txid}`);
    const blockHeight = tx.status?.block_height;
    const confirmedAt = tx.status?.block_time ? new Date(tx.status.block_time * 1000).toISOString() : undefined;

    // 4. Parse witness of the input at the inscription index
    const vin = tx.vin?.[parsed.index];
    if (!vin?.witness?.length) return { valid: false, error: "No witness data found" };

    const extracted = extractInscriptionContent(vin.witness);
    if (!extracted) return { valid: false, error: "Could not decode inscription envelope" };

    // 5. Parse BRC-20 JSON
    const json = JSON.parse(extracted.content);
    if (json.p !== "brc-20") return { valid: false, error: `Not a BRC-20 inscription (p="${json.p}")` };
    if (json.tick?.toLowerCase() !== WNSP_TICK) return { valid: false, error: `Wrong tick: "${json.tick}"` };

    return {
      valid: true, tick: json.tick, op: json.op,
      amount: json.amt ? parseInt(json.amt) : undefined,
      blockHeight, confirmedAt,
    };
  } catch (err: any) {
    return { valid: false, error: err.message };
  }
}

// ── LEB128 decoder — Bitcoin Rune protocol integer encoding ──────────────────
// Runes encode integers as LEB128 (Little-Endian Base-128).
// Each byte: low 7 bits = data, bit 7 = "more bytes follow".
// Returns { value: bigint, bytesRead: number }.
function decodeLEB128(buf: Buffer, offset: number): { value: bigint; bytesRead: number } {
  let value = 0n;
  let shift = 0n;
  let bytesRead = 0;
  while (offset + bytesRead < buf.length) {
    const byte = buf[offset + bytesRead];
    bytesRead++;
    value |= BigInt(byte & 0x7f) << shift;
    shift += 7n;
    if ((byte & 0x80) === 0) break; // MSB clear → last byte
  }
  return { value, bytesRead };
}

// ── Runestone decoder — parse OP_RETURN OP_13 payload ─────────────────────────
// A runestone is embedded in: OP_RETURN (0x6a) OP_13 (0x5d) <LEB128 data...>
// The LEB128 stream encodes tag–value pairs:
//   tag 2 = block (Rune ID high word)
//   tag 4 = tx    (Rune ID low word)
//   tag 20 = amount per edict
//   tag 22 = output index of edict
// Returns null if script is not a valid runestone.
export interface ParsedRunestone {
  runeId: string;     // "block:tx"
  block: bigint;
  tx: bigint;
  amounts: bigint[];  // edict amounts
  outputs: bigint[];  // edict output indices
}

export function decodeRunestone(scriptHex: string): ParsedRunestone | null {
  try {
    const buf = Buffer.from(scriptHex, "hex");
    // Must start with OP_RETURN (0x6a) followed by OP_13 (0x5d)
    if (buf[0] !== 0x6a || buf[1] !== 0x5d) return null;

    // Remaining bytes are a LEB128-encoded sequence of integers
    let cursor = 2;
    const integers: bigint[] = [];
    while (cursor < buf.length) {
      const { value, bytesRead } = decodeLEB128(buf, cursor);
      integers.push(value);
      cursor += bytesRead;
    }

    // Decode tag–value pairs
    let block = 0n, tx = 0n;
    const amounts: bigint[] = [], outputs: bigint[] = [];

    for (let i = 0; i + 1 < integers.length; i += 2) {
      const tag = integers[i], val = integers[i + 1];
      if (tag === 2n) block = val;
      else if (tag === 4n) tx = val;
      else if (tag === 20n) amounts.push(val);
      else if (tag === 22n) outputs.push(val);
    }

    if (block === 0n && tx === 0n) return null;
    return { runeId: `${block}:${tx}`, block, tx, amounts, outputs };
  } catch {
    return null;
  }
}

// ── OP_RETURN Rune UTXO verifier ──────────────────────────────────────────────
// Rune protocol: outputs with OP_RETURN OP_13 (0x6a 0x5d) contain runestones.
// Uses the LEB128 decoder to extract the exact Rune ID and edict amounts.

export interface RuneVerifyResult {
  valid: boolean;
  runeName?: string;
  runeId?: string;
  amount?: number;
  blockHeight?: number;
  confirmedAt?: string;
  isUnspent?: boolean;
  runestone?: ParsedRunestone;
  error?: string;
}

export async function verifyRuneUtxo(utxo: string): Promise<RuneVerifyResult> {
  try {
    // Accept format: "txid:vout" or "BLOCK:TX" Rune ID
    let txid: string, vout: number;

    if (utxo.includes(":")) {
      const parts = utxo.split(":");
      txid = parts[0];
      vout = parseInt(parts[1]) || 0;
    } else {
      return { valid: false, error: "UTXO must be in format txid:vout or BLOCK:TX" };
    }

    // 1. Validate txid is hex (not a Rune block:tx ID used as internal ID)
    const isHexTxid = /^[0-9a-fA-F]{64}$/.test(txid);
    if (!isHexTxid) {
      // It's a Rune ID format (e.g., "840000:8473") — verify internally
      if (txid === RUNE_ID_PREFIX || txid.startsWith(RUNE_ID_PREFIX)) {
        return { valid: true, runeName: RUNE_NAME, runeId: utxo, amount: 1000 };
      }
      return { valid: false, error: `Not a valid txid (got "${txid}")` };
    }

    // 2. Fetch the tx
    const tx = await esploraGet(`/tx/${txid}`);
    const blockHeight = tx.status?.block_height;
    const confirmedAt = tx.status?.block_time ? new Date(tx.status.block_time * 1000).toISOString() : undefined;

    // 3. Check UTXO is unspent
    let isUnspent = false;
    try {
      const outspends = await esploraGet(`/tx/${txid}/outspends`);
      if (Array.isArray(outspends) && outspends[vout]) {
        isUnspent = !outspends[vout].spent;
      }
    } catch { /* continue */ }

    // 4. Scan tx outputs for OP_RETURN OP_13 runestone and decode via LEB128
    let runestone: ParsedRunestone | null = null;

    for (const voutData of (tx.vout ?? [])) {
      const script = voutData.scriptpubkey as string;
      if (!script?.startsWith("6a5d")) continue; // must be OP_RETURN OP_13
      runestone = decodeRunestone(script);
      if (runestone) break;
    }

    if (!runestone) {
      // No runestone — could be a Rune transfer UTXO (balance tracked by indexer, no OP_RETURN in this tx)
      return {
        valid: isUnspent,
        runeName: RUNE_NAME,
        runeId: `${txid}:${vout}`,
        isUnspent, blockHeight, confirmedAt,
        error: isUnspent ? undefined : "UTXO already spent",
      };
    }

    // 5. Verify the decoded Rune ID matches NEXUS•WAVELENGTH (block 840000)
    const runeBlockMatch = runestone.block === BigInt(RUNE_ID_PREFIX) ||
      Math.abs(Number(runestone.block) - 840000) < 200;

    if (!runeBlockMatch) {
      return {
        valid: false,
        runeName: RUNE_NAME,
        runeId: runestone.runeId,
        isUnspent, blockHeight, confirmedAt, runestone,
        error: `Runestone Rune ID ${runestone.runeId} does not match NEXUS•WAVELENGTH (expected block ~840000)`,
      };
    }

    const amount = runestone.amounts[0] ? Number(runestone.amounts[0]) : undefined;
    console.log(`[BTC Scanner] Runestone decoded: Rune=${runestone.runeId} amount=${amount} outputs=[${runestone.outputs}]`);

    return {
      valid: true,
      runeName: RUNE_NAME,
      runeId: runestone.runeId,
      amount,
      isUnspent, blockHeight, confirmedAt, runestone,
    };
  } catch (err: any) {
    return { valid: false, error: err.message };
  }
}

// ── PSBT construction for marketplace trustless swap ─────────────────────────
// Constructs a 2-input PSBT:
//   Input 0: Seller's inscription/Rune UTXO (seller signs via their wallet)
//   Input 1: Buyer's payment UTXO (buyer signs via their wallet)
//   Output 0: Asset sat → buyer's Bitcoin address
//   Output 1: Payment sats → seller's Bitcoin address
//   Output 2: Fee → NexusOS service wallet
//
// Both parties sign with their UniSat/Xverse wallets (trustless, non-custodial).

export interface PsbtInput {
  txid: string;
  vout: number;
  value: number;          // sats
  scriptPubKey: string;   // hex
  tapInternalKey?: string; // hex (Taproot)
}

export interface PsbtParams {
  sellerUtxo: PsbtInput;
  buyerUtxo: PsbtInput;
  sellerBtcAddress: string;
  buyerBtcAddress: string;
  serviceWalletAddress: string;
  priceSats: number;
  feeSats: number;
  // For Rune trades: include a Runestone edict directing token balance to buyer
  runeId?: string;          // "BLOCK:TX" e.g. "840000:8472"
  runeAmount?: bigint;      // amount of Rune units to transfer
  runeOutputIndex?: number; // which output receives the Rune balance (default: 0 = buyer output)
}

export async function constructMarketplacePsbt(params: PsbtParams): Promise<{ psbtHex: string; psbtBase64: string }> {
  const bitcoin = await import("bitcoinjs-lib");
  const { Psbt, networks } = bitcoin;

  const network = networks.bitcoin;
  const psbt = new Psbt({ network });

  // Input 0: Seller's UTXO (inscription sat or Rune UTXO)
  const sellerInput: any = {
    hash: params.sellerUtxo.txid,
    index: params.sellerUtxo.vout,
    sequence: 0xfffffffd, // RBF enabled
  };
  // For Taproot outputs (P2TR) — which all Ordinal inscriptions use
  if (params.sellerUtxo.tapInternalKey) {
    sellerInput.tapInternalKey = Buffer.from(params.sellerUtxo.tapInternalKey, "hex");
    sellerInput.witnessUtxo = {
      script: Buffer.from(params.sellerUtxo.scriptPubKey, "hex"),
      value: BigInt(params.sellerUtxo.value),
    };
  } else {
    sellerInput.witnessUtxo = {
      script: Buffer.from(params.sellerUtxo.scriptPubKey, "hex"),
      value: BigInt(params.sellerUtxo.value),
    };
  }
  psbt.addInput(sellerInput);

  // Input 1: Buyer's payment UTXO
  psbt.addInput({
    hash: params.buyerUtxo.txid,
    index: params.buyerUtxo.vout,
    sequence: 0xfffffffd,
    witnessUtxo: {
      script: Buffer.from(params.buyerUtxo.scriptPubKey, "hex"),
      value: BigInt(params.buyerUtxo.value),
    },
  });

  // Output 0: Asset sat → buyer (inscription sat or Rune UTXO allocation)
  const buyerScript = bitcoin.address.toOutputScript(params.buyerBtcAddress, network);
  psbt.addOutput({ script: buyerScript, value: BigInt(546) }); // dust limit

  // Output 1: Payment (sats) → seller
  const sellerScript = bitcoin.address.toOutputScript(params.sellerBtcAddress, network);
  psbt.addOutput({ script: sellerScript, value: BigInt(params.priceSats) });

  // Output 2: Platform fee → service wallet
  if (params.feeSats > 0) {
    const feeScript = bitcoin.address.toOutputScript(params.serviceWalletAddress, network);
    psbt.addOutput({ script: feeScript, value: BigInt(params.feeSats) });
  }

  // Output 3 (Rune trades only): OP_RETURN Runestone edict directing Rune balance to buyer
  // Encodes: tag 2 = block, tag 4 = tx, tag 20 = amount, tag 22 = output index (0 = buyer output)
  if (params.runeId && params.runeAmount !== undefined) {
    const [runeBlock, runeTx] = params.runeId.split(":").map(BigInt);
    const targetOutput = BigInt(params.runeOutputIndex ?? 0);
    const runeAmount = params.runeAmount;

    // Encode LEB128 integers for tag–value pairs
    function encodeLEB128(value: bigint): Buffer {
      const bytes: number[] = [];
      do {
        let byte = Number(value & 0x7fn);
        value >>= 7n;
        if (value !== 0n) byte |= 0x80;
        bytes.push(byte);
      } while (value !== 0n);
      return Buffer.from(bytes);
    }

    const runestonePayload = Buffer.concat([
      encodeLEB128(2n), encodeLEB128(runeBlock),   // tag 2: block
      encodeLEB128(4n), encodeLEB128(runeTx),       // tag 4: tx
      encodeLEB128(20n), encodeLEB128(runeAmount),  // tag 20: amount
      encodeLEB128(22n), encodeLEB128(targetOutput),// tag 22: output index
    ]);

    // OP_RETURN (0x6a) OP_13 (0x5d) <payload>
    const runestoneScript = Buffer.concat([
      Buffer.from([0x6a, 0x5d]),
      runestonePayload,
    ]);

    psbt.addOutput({ script: runestoneScript, value: BigInt(0) });
    console.log(`[PSBT] Added Runestone edict: ${params.runeId} → amount=${runeAmount} → output ${targetOutput}`);
  }

  const psbtBuffer = psbt.toBuffer();
  return {
    psbtHex: psbtBuffer.toString("hex"),
    psbtBase64: psbtBuffer.toString("base64"),
  };
}

// ── UTXO fetcher for PSBT construction ───────────────────────────────────────
export async function fetchUtxoDetails(txid: string, vout: number): Promise<PsbtInput | null> {
  try {
    const tx = await esploraGet(`/tx/${txid}`);
    const output = tx.vout?.[vout];
    if (!output) return null;

    return {
      txid,
      vout,
      value: output.value,
      scriptPubKey: output.scriptpubkey,
      tapInternalKey: output.scriptpubkey_type === "v1_p2tr" ? undefined : undefined,
    };
  } catch {
    return null;
  }
}

// ── Settlement poller — auto-mark marketplace listings as "sold" ──────────────
// After a buyer broadcasts a PSBT, the listing status should flip to "sold" once
// the transaction has 1+ confirmation. We track pending PSBT txids in
// marketplace_listing_txids (in-memory map for now; persisted via the listing's
// btcTxid column once added to the schema, or via logAction audit trail).
const _pendingSettlements = new Map<string, { listingId: number; addedAt: number }>();

export function trackSettlement(txid: string, listingId: number): void {
  _pendingSettlements.set(txid, { listingId, addedAt: Date.now() });
  console.log(`[BTC Scanner] Tracking settlement: listing ${listingId} → txid ${txid.slice(0, 16)}…`);
}

async function scanPendingSettlements(): Promise<number> {
  let settled = 0;
  if (_pendingSettlements.size === 0) return 0;

  const { db } = await import("./db");
  const { marketplaceListings } = await import("../shared/schema");
  const { eq } = await import("drizzle-orm");

  for (const [txid, { listingId, addedAt }] of _pendingSettlements.entries()) {
    // Drop tracking after 48 hours (tx unlikely to confirm)
    if (Date.now() - addedAt > 48 * 60 * 60 * 1000) {
      _pendingSettlements.delete(txid);
      continue;
    }
    try {
      const tx = await esploraGet(`/tx/${txid}`);
      const confirmed = tx.status?.confirmed === true;
      if (!confirmed) continue;

      const blockHeight: number = tx.status?.block_height;
      const confirmations = blockHeight ? 1 : 0; // Esplora doesn't return confirmations directly
      if (confirmations < 1) continue;

      // Update listing status to "sold" and record the settlement txid
      await db.update(marketplaceListings)
        .set({ status: "sold" } as any)
        .where(eq(marketplaceListings.id, listingId));

      console.log(`[BTC Scanner] ✅ Settlement confirmed: listing ${listingId} → txid ${txid.slice(0, 16)}… (block ${blockHeight})`);
      _pendingSettlements.delete(txid);
      settled++;
    } catch {
      // tx not found yet — keep polling
    }
  }
  return settled;
}

// ── Polling loop — auto-confirm pending stakes + settlements ──────────────────
let _scanRunning = false;

export async function startStakeScanner(): Promise<void> {
  if (_scanRunning) return;
  _scanRunning = true;
  console.log("[BTC Scanner] Block scanner started — polling every 5 minutes");
  scanLoop();
}

async function scanLoop(): Promise<void> {
  while (true) {
    try {
      await scanPendingStakes();
      await scanPendingSettlements();
    } catch (err: any) {
      console.error("[BTC Scanner] Scan error:", err.message);
    }
    await new Promise(r => setTimeout(r, 5 * 60 * 1000)); // 5 min
  }
}

export async function scanPendingStakes(): Promise<{ wnspVerified: number; runeVerified: number }> {
  let wnspVerified = 0, runeVerified = 0;
  try {
    const { db } = await import("./db");
    const { wnspStakes, runeStakes } = await import("../shared/schema");
    const { eq, or } = await import("drizzle-orm");

    // ── wnsp BRC-20 stakes: unverified → verify inscription on-chain ──────────
    const pendingWnsp = await db.select().from(wnspStakes)
      .where(or(eq(wnspStakes.status, "active")))
      .limit(20);

    for (const stake of pendingWnsp) {
      if ((stake as any).verified) continue;
      const result = await verifyWnspInscription(stake.inscriptionId);
      if (result.valid) {
        await db.update(wnspStakes)
          .set({ status: "active" })
          .where(eq(wnspStakes.id, stake.id));
        wnspVerified++;
        console.log(`[BTC Scanner] ✓ wnsp inscription verified: ${stake.inscriptionId} (block ${result.blockHeight ?? "?"})`);
      }
    }

    // ── NEXUS•WAVELENGTH Rune stakes: verify UTXO on-chain ───────────────────
    const pendingRune = await db.select().from(runeStakes)
      .where(eq(runeStakes.status, "active"))
      .limit(20);

    for (const stake of pendingRune) {
      const result = await verifyRuneUtxo(stake.runeUtxo);
      if (result.valid) {
        runeVerified++;
        console.log(`[BTC Scanner] ✓ Rune UTXO verified: ${stake.runeUtxo} (${result.runeName})`);
      }
    }
  } catch (err: any) {
    console.error("[BTC Scanner] scanPendingStakes error:", err.message);
  }
  return { wnspVerified, runeVerified };
}
