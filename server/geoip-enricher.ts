import { Pool } from "pg";

const BATCH_SIZE  = 100;
const INTERVAL_MS = 2 * 60 * 1000;

export const ipCountryCache = new Map<string, string>();
export const ipHostingCache = new Map<string, boolean>();

// Real browsers always advertise a rendering engine token. Kept in sync with
// server/traffic-logger.ts's BROWSER_ENGINE_TOKENS.
const BROWSER_ENGINE_TOKENS = /(Chrome\/|CriOS\/|FxiOS\/|Firefox\/|Safari\/|Edg(e|A|iOS)?\/|Gecko\/|OPR\/)/i;

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

    // ip-api.com free tier requires HTTP (HTTPS needs a paid plan).
    // `hosting` flags known datacenter/cloud-hosting ASNs (AWS, GCP, Azure,
    // OVH, Hetzner, etc.); `proxy` flags known VPN/proxy exit nodes.
    const resp = await fetch("http://ip-api.com/batch?fields=query,countryCode,status,hosting,proxy", { // nosemgrep: react-insecure-request
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(ips.map(ip => ({ query: ip }))),
    });

    if (!resp.ok) return;

    const results: Array<{ query: string; countryCode: string; status: string; hosting?: boolean; proxy?: boolean }> = await resp.json();

    let enriched = 0;
    let reclassified = 0;
    for (const r of results) {
      const code       = r.status === "success" && r.countryCode ? r.countryCode : "XX";
      const isDatacenter = r.status === "success" && (r.hosting === true || r.proxy === true);

      ipCountryCache.set(r.query, code);
      ipHostingCache.set(r.query, isDatacenter);

      await pool.query(
        `UPDATE traffic_logs
         SET country = $1, is_datacenter_ip = $3
         WHERE ip = $2 AND (country IS NULL OR country = '')`,
        [code, r.query, isDatacenter]
      );
      if (code !== "XX") enriched++;

      // Defense-in-depth reclassification: a confirmed datacenter/hosting IP
      // whose stored user agent carries no real browser rendering-engine
      // token is a script or spoofed client, even if it slipped past the
      // synchronous pattern list at ingestion time (e.g. a signature we
      // haven't catalogued yet).
      if (isDatacenter) {
        const { rowCount } = await pool.query(
          `UPDATE traffic_logs
           SET is_bot = true, bot_name = COALESCE(bot_name, 'Cloud-Datacenter-NonBrowser')
           WHERE ip = $1
             AND is_bot = false
             AND (user_agent IS NULL OR user_agent !~* $2)`,
          [r.query, BROWSER_ENGINE_TOKENS.source]
        );
        reclassified += rowCount ?? 0;
      }
    }

    console.log(`[GeoIP] Enriched ${enriched}/${ips.length} IPs with country codes${reclassified ? `, reclassified ${reclassified} row(s) as datacenter bot traffic` : ""}`);
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
