import { createHash } from "node:crypto";
import type { PoolClient } from "pg";

export function electionRecordContent(record: Record<string, unknown>): string {
  return `COMMUNITY_ELECTION[v1]:${JSON.stringify(record)}`;
}
export function electionRecordDigest(content: string): string {
  return createHash("sha256").update(content, "utf8").digest("hex");
}

/** Append on the existing NexusOS project chain, not Bitcoin or a constitution amendment. */
export async function appendElectionRecord(client: PoolClient, content: string, recordType = "COMMUNITY_ELECTION"): Promise<number> {
  // A table lock also conflicts with legacy block writers that use different
  // advisory-lock keys. Never mint NXT or touch authority/constitution records.
  await client.query("LOCK TABLE blockchain_blocks IN SHARE ROW EXCLUSIVE MODE");
  const previous = (await client.query(
    "SELECT block_number,psi_channel FROM blockchain_blocks ORDER BY block_number DESC LIMIT 1",
  )).rows[0];
  if (!previous) throw new Error("Blockchain genesis is unavailable");
  const number = previous.block_number + 1;
  const nm = 380 + (160 / 255) * 400;
  const frequency = 299792458 / (nm * 1e-9);
  const energy = 6.62607015e-34 * frequency;
  await client.query(`
    INSERT INTO blockchain_blocks
      (block_number,content,wavelength_nm,psi_channel,wdm,oam,polarisation,band,
       energy_joules,lambda_mass_kg,frequency_hz,previous_psi,nxt_reward,
       miner_address,tx_count,transactions)
    VALUES ($1,$2,$3,$4,160,0,'H','USER',$5,$6,$7,$8,0,'community-election-ledger',1,$9)
  `, [number, content, nm, "Ψ(160,0,H)", energy, energy / (299792458 ** 2),
    frequency, previous.psi_channel, JSON.stringify([{ type: recordType,
      digest: electionRecordDigest(content) }])]);
  // Actual stored-text equality is necessary, not just input hash equality.
  const readback = (await client.query(
    "SELECT content FROM blockchain_blocks WHERE block_number=$1", [number],
  )).rows[0];
  if (readback?.content !== content) throw new Error("Election blockchain readback mismatch");
  return number;
}
