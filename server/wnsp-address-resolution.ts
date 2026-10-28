import type { Pool, PoolClient } from "pg";
import { ElectionError } from "./governance/community-election-service";

type Queryable = Pick<Pool | PoolClient, "query">;
/** Shared with /api/wnsp/resolve: exact URI wins, then the registered Ψ channel. */
export async function resolveWnspRegistry(client: Queryable, uri: string, psi: string) {
  const exact = (await client.query("SELECT * FROM wnsp_registry WHERE wnsp_uri=$1", [uri])).rows;
  return exact.length || !psi ? exact :
    (await client.query("SELECT * FROM wnsp_registry WHERE psi_channel=$1 ORDER BY is_canonical DESC,id", [psi])).rows;
}

/** Never use a profile label, computed unregistered address, or HTTP target as account authority. */
export async function resolveWalletWave(client: Queryable, address: string) {
  const wallet = (await client.query(`
    SELECT w.user_id,w.address FROM wallets w JOIN users u ON u.id=w.user_id
    WHERE w.address=$1 AND u.is_active=true
  `, [address])).rows[0];
  if (wallet) return { userId: wallet.user_id as string, address: wallet.address as string };
  if (!/^(?:wnsp:\/\/)?Ψ\(\d+,\d+,[HV]\)(?:\/[^\s?#]*)?$/.test(address))
    throw new ElectionError(400, "Use an exact wallet address or registered wnsp://Ψ address");
  const uri = address.startsWith("wnsp://") ? address : `wnsp://${address}`;
  const psi = uri.match(/Ψ\([^)]+\)/)![0];
  const entries = await resolveWnspRegistry(client, uri.replace(/\/+$/, ""), psi);
  // An alias must be registered by its actual owner. resource_id alone is not a proof.
  const owners = new Set<string>();
  for (const e of entries) {
    if (e.resource_type === "user" && e.registered_by &&
      (e.resource_id === e.registered_by || e.resource_id === null)) {
      // Historical self-registered aliases did not always populate resource_id.
      owners.add(e.registered_by);
    } else if (e.resource_type === "wallet" && e.resource_id && e.registered_by) {
      const w = (await client.query("SELECT user_id FROM wallets WHERE id=$1 AND user_id=$2", [e.resource_id, e.registered_by])).rows[0];
      if (w) owners.add(w.user_id);
    }
  }
  if (owners.size !== 1) throw new ElectionError(409, "Address is unregistered or ambiguous; use the exact owner URI");
  const found = (await client.query(`
    SELECT w.user_id,w.address FROM wallets w JOIN users u ON u.id=w.user_id
    WHERE w.user_id=$1 AND u.is_active=true
  `, [[...owners][0]])).rows[0];
  if (!found) throw new ElectionError(404, "No active wallet owns this registered address");
  return { userId: found.user_id as string, address: found.address as string };
}

export async function walletWaveForUser(client: Queryable, userId: string) {
  const row = (await client.query(`
    SELECT w.address,r.wnsp_uri FROM wallets w JOIN users u ON u.id=w.user_id
    LEFT JOIN LATERAL (
      SELECT wnsp_uri FROM wnsp_registry WHERE registered_by=w.user_id AND
        ((resource_type='user' AND (resource_id=w.user_id OR resource_id IS NULL)) OR
         (resource_type='wallet' AND resource_id=w.id))
      ORDER BY is_canonical DESC,created_at,id LIMIT 1
    ) r ON true WHERE w.user_id=$1 AND u.is_active=true
  `, [userId])).rows[0];
  if (!row) throw new ElectionError(403, "An active registered wallet is required");
  return (row.wnsp_uri ?? row.address) as string;
}
