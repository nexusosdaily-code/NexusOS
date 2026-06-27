import { Pool } from "pg";

const BATCH_SIZE  = 100;
const INTERVAL_MS = 2 * 60 * 1000;

export const ipCountryCache = new Map<string, string>();

async function enrichBatch() {
  let pool: Pool | null = null;
  try {
    pool = new Pool({ connectionString: process.env.DATABASE_URL });

    const { rows } = await pool.query<{ ip: string }>(
      `SELECT DISTINCT ip FROM traffic_logs
       WHERE ip IS NOT NULL AND (country IS NULL OR country = '')
       LIMIT $1`,
      [BATCH_SIZE]
    );

    if (rows.length === 0) return;

    const ips = rows.map(r => r.ip);

    const resp = await fetch("http://ip-api.com/batch?fields=query,countryCode,status", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(ips.map(ip => ({ query: ip }))),
    });

    if (!resp.ok) return;

    const results: Array<{ query: string; countryCode: string; status: string }> = await resp.json();

    let enriched = 0;
    for (const r of results) {
      const code = r.status === "success" && r.countryCode ? r.countryCode : "XX";
      ipCountryCache.set(r.query, code);
      await pool.query(
        `UPDATE traffic_logs SET country = $1 WHERE ip = $2 AND (country IS NULL OR country = '')`,
        [code, r.query]
      );
      if (code !== "XX") enriched++;
    }

    console.log(`[GeoIP] Enriched ${enriched}/${ips.length} IPs with country codes`);
  } catch (err: any) {
    console.warn("[GeoIP] Enrichment skipped:", err.message);
  } finally {
    await pool?.end().catch(() => {});
  }
}

export function startGeoIpEnricher() {
  console.log("[GeoIP] Enricher started — running every 2 min");
  enrichBatch();
  setInterval(enrichBatch, INTERVAL_MS);
}
