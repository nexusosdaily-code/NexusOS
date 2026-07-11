/**
 * WNSP Lattice Identity — Stage A
 *
 * Provides post-quantum document signing using CRYSTALS-Dilithium (ML-DSA-65),
 * standardised by NIST as FIPS 204.  Each NexusOS user gets a deterministic
 * ML-DSA-65 keypair anchored to their spectral wavelength and a server-side
 * secret, so signing requires knowledge of neither the server secret (held
 * server-side) nor anything the signer can guess from public data alone.
 *
 * Security properties
 * ───────────────────
 * • Quantum-resistant: ML-DSA-65 is believed hard for both classical AND
 *   quantum computers (no known Shor/Grover speedup on lattice problems).
 * • Server-side private key: the secret key is re-derived on demand and
 *   never persisted — it only exists in memory during signing.
 * • Deterministic: same (userId, wavelength, secret) always produces the
 *   same keypair, so the public key can be reproduced for verification
 *   without storing the private key.
 * • Domain-separated: the KDF input includes a version string
 *   ("wnsp-ml-dsa-v1") so any future scheme change cannot produce collisions.
 *
 * Key sizes (ML-DSA-65)
 * ──────────────────────
 * Public key  : 1,952 bytes  → 3,904 hex chars
 * Secret key  : 4,032 bytes  (re-derived; never stored)
 * Signature   : 3,309 bytes  → 6,618 hex chars
 * Security level: NIST Level 3 (~AES-192 equivalent)
 */

import { ml_dsa65 } from "@noble/post-quantum/ml-dsa.js";
import { pbkdf2Sync, createHash } from "crypto";

const LATTICE_SECRET =
  process.env.WNSP_LATTICE_SECRET ??
  "wnsp-lattice-dev-only-MUST-set-WNSP_LATTICE_SECRET-in-production";

if (!process.env.WNSP_LATTICE_SECRET) {
  console.warn(
    "[LatticeID] ⚠ WNSP_LATTICE_SECRET not set — using insecure dev fallback. " +
    "Set this secret in production before signing real contracts."
  );
}

/**
 * Deterministically derive a ML-DSA-65 keypair for a given user.
 * The private key is derived from PBKDF2(userId::wavelength::version, serverSecret).
 * Returns { publicKey, secretKey } as Uint8Arrays.
 */
function deriveKeypair(
  userId: string,
  wavelengthNm: number
): { publicKey: Uint8Array; secretKey: Uint8Array } {
  const seed = pbkdf2Sync(
    `${userId}::${wavelengthNm.toFixed(12)}::wnsp-ml-dsa-v1`,
    LATTICE_SECRET,
    100_000,
    32,
    "sha256"
  );
  return ml_dsa65.keygen(seed);
}

/**
 * Build the canonical message bytes that are signed for a given document.
 * All fields that uniquely identify the document + signer are included so
 * that neither the content nor the physics parameters can be swapped after signing.
 */
export function documentMessage(
  userId: string,
  lambdaSignature: string,
  originalName: string,
  energyHash: string
): Uint8Array {
  const digest = createHash("sha256")
    .update(
      `${userId}::${lambdaSignature}::${originalName}::${energyHash}::wnsp-ml-dsa-v1`
    )
    .digest("hex");
  return Buffer.from(digest, "utf8");
}

/**
 * Build the canonical message bytes for a governance proposal.
 * Binds proposer identity + proposal ID + key params so no field
 * can be swapped after the signature is stored.
 */
export function governanceMessage(
  userId: string,
  proposalId: number,
  title: string,
  parameterKey: string,
  proposedValue: string
): Uint8Array {
  const digest = createHash("sha256")
    .update(
      `${userId}::gov-proposal-sig::${proposalId}::${title}::${parameterKey}::${proposedValue}::wnsp-ml-dsa-v1`
    )
    .digest("hex");
  return Buffer.from(digest, "utf8");
}

/**
 * Sign a document on behalf of userId.
 * Returns hex-encoded publicKey and signature for storage.
 */
export function latticeSign(
  userId: string,
  wavelengthNm: number,
  message: Uint8Array
): { publicKey: string; signature: string; scheme: string } {
  const { publicKey, secretKey } = deriveKeypair(userId, wavelengthNm);
  const sig = ml_dsa65.sign(message, secretKey);
  return {
    publicKey: Buffer.from(publicKey).toString("hex"),
    signature: Buffer.from(sig).toString("hex"),
    scheme: "ML-DSA-65/FIPS-204",
  };
}

/**
 * Verify a stored lattice signature.
 * Returns true only if the signature is valid under the stored public key.
 */
export function latticeVerify(
  pubKeyHex: string,
  sigHex: string,
  message: Uint8Array
): boolean {
  try {
    return ml_dsa65.verify(
      Buffer.from(sigHex, "hex"),
      message,
      Buffer.from(pubKeyHex, "hex")
    );
  } catch {
    return false;
  }
}

/**
 * Derive and return only the public key for a user (safe to share / store).
 */
export function getPublicKey(userId: string, wavelengthNm: number): string {
  const { publicKey } = deriveKeypair(userId, wavelengthNm);
  return Buffer.from(publicKey).toString("hex");
}

/**
 * Build canonical message bytes for a lambda message signature.
 * Binds sender + message ID + recipient so the sig cannot be replayed.
 */
export function lambdaMessage(
  senderId: string,
  messageId: string,
  recipientId: string,
  spectralHash: string | null
): Uint8Array {
  const digest = createHash("sha256")
    .update(
      `${senderId}::lambda-msg-sig::${messageId}::${recipientId}::${spectralHash ?? "none"}::wnsp-ml-dsa-v1`
    )
    .digest("hex");
  return Buffer.from(digest, "utf8");
}

/**
 * Stage B — update every user that has a spectral channel but no lattice
 * public key yet.  Called once at startup; safe to re-run (idempotent).
 */
export async function backfillLatticePubKeys(): Promise<number> {
  const { db } = await import("./db");
  const { users } = await import("../shared/schema");
  const { isNull, isNotNull } = await import("drizzle-orm");

  const rows = await db
    .select({ id: users.id, spectralNm: users.spectralNm })
    .from(users)
    .where(
      /* spectralNm set AND latticePubKey missing */
      isNull(users.latticePubKey)
    );

  let updated = 0;
  for (const row of rows) {
    if (!row.spectralNm) continue;
    try {
      const pubKeyHex = getPublicKey(row.id, row.spectralNm);
      await db.update(users)
        .set({ latticePubKey: pubKeyHex })
        .where((await import("drizzle-orm")).eq(users.id, row.id));
      updated++;
    } catch { /* skip individual failures */ }
  }
  return updated;
}
