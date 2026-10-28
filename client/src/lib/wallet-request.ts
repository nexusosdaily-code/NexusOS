export const LEGACY_WALLET_MUTATIONS = new Set([
  "/api/keys", "/api/governance/proposals", "/api/community/mint",
  "/api/lightning/pay", "/api/lightning/invoice",
  "/api/lightning/swap/to-nxt", "/api/lightning/swap/to-sats",
  "/api/lightning/withdraw-to-btc", "/api/lightning/send-to-ln-address",
  "/api/lightning/send", "/api/lightning/tip", "/api/lightning/stake",
  "/api/pipeline/step2", "/api/rune-swap/sats-to-rune",
  "/api/wnusd/mint", "/api/wsats/mint", "/api/lp/add", "/api/lp/remove", "/api/lp/swap",
]);

// Retain a retry identity across network errors and page reloads. Storage keys
// contain a digest, never the request's financial/private fields.
export async function walletRequest(url: string, init: RequestInit = {}): Promise<Response> {
  const body = typeof init.body === "string" ? init.body : "";
  const bytes = new TextEncoder().encode(`${init.method ?? "POST"}:${url}:${body}`);
  const digest = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)), b => b.toString(16).padStart(2, "0")).join("");
  const storageKey = `wallet-retry:${digest}`;
  const headers = new Headers(init.headers);
  const identity = headers.get("Idempotency-Key") ?? sessionStorage.getItem(storageKey) ?? crypto.randomUUID();
  // Fail explicitly rather than sending a request whose retry ID cannot survive.
  sessionStorage.setItem(storageKey, identity);
  headers.set("Idempotency-Key", identity);
  const response = await fetch(url, { ...init, headers, credentials: "include" });
  if (response.status < 500) sessionStorage.removeItem(storageKey);
  return response;
}
