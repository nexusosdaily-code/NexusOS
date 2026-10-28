import type { Pool } from "pg";

const registeredUri = /^wnsp:\/\/Ψ\(\d+,\d+,[HV]\)(?:\/[^\s?#]*)?$/;

/** Directory labels are not delivery authority: only public, self-owned registrations qualify. */
export async function waveRecipientDirectory(
  pool: Pick<Pool, "query">, viewerId: string, search: unknown,
) {
  if (search !== undefined && (typeof search !== "string" || search.length > 80)) {
    throw new Error("Search must be text of at most 80 characters");
  }
  const query = (search ?? "") as string;
  const { rows } = await pool.query(`
    SELECT u.username, r.wnsp_uri AS wave_address
    FROM users u
    JOIN LATERAL (
      SELECT registry.wnsp_uri FROM wnsp_registry registry
      WHERE registry.registered_by=u.id AND registry.is_public=true
        AND ((registry.resource_type='user'
          AND (registry.resource_id=u.id OR registry.resource_id IS NULL))
          OR (registry.resource_type='wallet' AND EXISTS (
            SELECT 1 FROM wallets owned
            WHERE owned.id=registry.resource_id AND owned.user_id=u.id)))
        AND registry.wnsp_uri ~ '^wnsp://Ψ\\([0-9]+,[0-9]+,[HV]\\)(/[^[:space:]?#]*)?$'
      ORDER BY registry.is_canonical DESC, registry.created_at, registry.id LIMIT 1
    ) r ON true
    WHERE u.is_active=true AND u.id<>$1
      AND EXISTS (SELECT 1 FROM wallets w WHERE w.user_id=u.id)
      AND (strpos(lower(u.username), lower($2))>0
        OR strpos(lower(r.wnsp_uri), lower($2))>0)
    ORDER BY lower(u.username),u.id LIMIT 31
  `, [viewerId, query.trim()]);
  const recipients = rows
    .filter(row => typeof row.username === "string" && registeredUri.test(row.wave_address))
    .map(row => ({ username: row.username as string, waveAddress: row.wave_address as string }));
  return { recipients: recipients.slice(0, 30), hasMore: recipients.length > 30 };
}
