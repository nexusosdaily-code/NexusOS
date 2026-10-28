import { invoicePaymentHash, lightningProviderSchema, type WithdrawalEvidenceReader } from "./withdrawal-reconciliation";

/** Server-controlled credentials/endpoint, never supplied by the review request.
 * LNbits uses its invoice/read key; no adapter sends or settles a payment. */
export interface EvidenceCredentials {
  coinosToken?: () => string | undefined;
  albyToken?: () => string | undefined;
  lnbits?: () => { url?: string; invoiceKey?: string };
}
const defaults: EvidenceCredentials = {
  coinosToken: () => process.env.COINOS_JWT ||
    (process.env.COINOS_TOKEN?.startsWith("ey") ? process.env.COINOS_TOKEN : undefined),
  albyToken: () => process.env.ALBY_ACCESS_TOKEN,
  lnbits: () => ({ url: process.env.LNBITS_URL, invoiceKey: process.env.LNBITS_INVOICE_KEY }),
};

function principal(value: unknown, unit = 1) {
  if (!Number.isSafeInteger(value) || (value as number) <= 0 || (value as number) % unit !== 0) {
    throw new Error("Outgoing principal amount not verified");
  }
  return String(BigInt(value as number) / BigInt(unit));
}
function negativePrincipal(value: unknown, unit = 1) {
  if (typeof value !== "number" || value >= 0) throw new Error("Outgoing direction not verified");
  return principal(-value, unit);
}
function credential(value: string | undefined) {
  if (!value) throw new Error("Outgoing read credential not configured");
  return value;
}

/** Read-only production adapters. No payment, invoice-settlement or broadcast
 * endpoint exists in this module. Dependency injection is for isolated tests. */
export function createWithdrawalEvidenceReader(
  blinkApiKey: () => string | undefined,
  http: typeof fetch = fetch,
  credentials: EvidenceCredentials = defaults,
): WithdrawalEvidenceReader {
  async function json(url: string, headers: Record<string, string>) {
    const res = await http(url, { method: "GET", headers, signal: AbortSignal.timeout(15000), redirect: "error" });
    if (!res.ok) throw new Error("Outgoing evidence unavailable; keep reservation");
    return res.json();
  }
  async function coinos(account: string, paymentHash: string) {
    const headers = { Authorization: `Bearer ${credential(credentials.coinosToken?.())}` };
    const me = await json("https://coinos.io/api/me", headers);
    if (me.id !== account) throw new Error("Outgoing evidence account mismatch");
    // Coinos documents authenticated history, not a definitive failed-send
    // lookup. Only a confirmed negative Lightning record with a valid preimage
    // can resolve a reservation. Never use the public /invoice/:hash endpoint.
    const matches: any[] = [];
    const ids = new Set<string>();
    for (let offset = 0; offset < 1000; offset += 100) {
      const page = await json(`https://coinos.io/api/payments?limit=100&offset=${offset}`, headers);
      if (!Array.isArray(page.payments) || page.payments.length > 100) throw new Error("Invalid outgoing history");
      for (const tx of page.payments) {
        if (!tx || typeof tx.id !== "string" || !tx.id || ids.has(tx.id)) throw new Error("Ambiguous outgoing history");
        ids.add(tx.id);
        if (tx.type !== "lightning" || typeof tx.hash !== "string") continue;
        let identity: string;
        try { identity = invoicePaymentHash(tx.hash); } catch { continue; }
        if (identity === paymentHash && typeof tx.amount === "number" && tx.amount < 0) matches.push(tx);
      }
      if (page.payments.length === 100) continue;
      if (matches.length !== 1) throw new Error("Unique outgoing payment record required");
      const tx = matches[0];
      if (tx.confirmed !== true || typeof tx.ref !== "string" || !/^[a-f0-9]{64}$/.test(tx.ref) ||
          (tx.tip !== undefined && tx.tip !== 0)) throw new Error("Outgoing payment is not verified settled");
      return { provider: "coinos", account, reference: tx.id, direction: "SEND",
        invoice: tx.hash, paymentHash, amountSats: negativePrincipal(tx.amount),
        outcome: "paid", definitive: false, preimage: tx.ref };
    }
    throw new Error("Outgoing history limit reached; keep reservation");
  }
  async function alby(account: string, paymentHash: string) {
    const headers = { Authorization: `Bearer ${credential(credentials.albyToken?.())}` };
    const me = await json("https://api.getalby.com/user/me", headers);
    if (me.identifier !== account) throw new Error("Outgoing evidence account mismatch");
    const tx = await json(`https://api.getalby.com/invoices/${paymentHash}`, headers);
    // This endpoint returns BOTH directions. CREATED/unsettled/404 is not
    // outgoing failure. The deprecated Wallet API documents SETTLED only.
    if (tx.type !== "outgoing" || tx.currency !== "btc" || tx.settled !== true || tx.state !== "SETTLED") {
      throw new Error("Outgoing payment is not verified settled");
    }
    if (tx.value !== undefined && tx.value !== tx.amount) throw new Error("Conflicting outgoing amounts");
    if (tx.r_hash_str !== undefined && tx.r_hash_str !== tx.payment_hash) throw new Error("Conflicting outgoing hashes");
    return { provider: "alby", account, reference: tx.identifier, direction: "SEND",
      invoice: tx.payment_request, paymentHash: tx.payment_hash, amountSats: principal(tx.amount),
      outcome: "paid", definitive: false, preimage: tx.preimage };
  }
  async function lnbits(account: string, paymentHash: string) {
    const config = credentials.lnbits?.();
    const key = credential(config?.invoiceKey);
    const url = new URL(config?.url ?? "");
    if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash) {
      throw new Error("Invalid server-configured LNbits endpoint");
    }
    const base = url.href.replace(/\/$/, "");
    const tx = await json(`${base}/api/v1/payments/${paymentHash}`, { "X-Api-Key": key });
    const detail = tx.details;
    // Public paid:true responses have no authenticated wallet details. Bind
    // the instance as well as wallet ID: different LNbits hosts are not the
    // same account. Raw Payment.amount is signed millisatoshis, NOT sats.
    if (!detail || typeof detail.wallet_id !== "string" || !detail.wallet_id ||
        account !== `${base}#${detail.wallet_id}`) throw new Error("Outgoing evidence wallet mismatch");
    const amountSats = negativePrincipal(detail.amount, 1000);
    // LNbits' GET returns an already-failed local row WITHOUT rechecking its
    // funding source. _verify_external_payment can subsequently discover that
    // this same failed row was actually paid. A cached failed status is not
    // authoritative outgoing rejection, even when paid:false accompanies it.
    if (detail.status !== "success" || tx.paid !== true) {
      throw new Error("Outgoing settlement not verified; cached failure cannot release reservation");
    }
    if ((tx.status !== undefined && tx.status !== detail.status) ||
        (tx.preimage && detail.preimage && tx.preimage !== detail.preimage)) {
      throw new Error("Contradictory outgoing settlement evidence");
    }
    const preimage = tx.preimage || detail.preimage;
    return { provider: "lnbits", account, reference: detail.checking_id, direction: "SEND",
      invoice: detail.bolt11, paymentHash: detail.payment_hash, amountSats,
      outcome: "paid", definitive: false,
      ...(preimage ? { preimage } : {}) };
  }
  async function get(url: string) {
    const res = await http(url, { signal: AbortSignal.timeout(15000), redirect: "error" });
    if (!res.ok) throw new Error("Broadcast evidence unavailable; keep reservation");
    return res;
  }
  return {
    async outgoingLightning(account, paymentHash, provider) {
      lightningProviderSchema.parse(provider);
      if (!/^[a-f0-9]{64}$/.test(paymentHash)) throw new Error("Invalid outgoing payment hash");
      if (provider === "coinos") return coinos(account, paymentHash);
      if (provider === "alby") return alby(account, paymentHash);
      if (provider === "lnbits") return lnbits(account, paymentHash);
      const apiKey = blinkApiKey();
      if (!apiKey) throw new Error("Blink read credential not configured");
      const res = await http("https://api.blink.sv/graphql", {
        method: "POST", redirect: "error", signal: AbortSignal.timeout(15000),
        headers: { "X-API-KEY": apiKey, "Content-Type": "application/json" },
        body: JSON.stringify({
          query: `query OutgoingEvidence($walletId: WalletId!, $hash: PaymentHash!) {
            me { defaultAccount { walletById(walletId: $walletId) {
              id walletCurrency
              ... on BTCWallet { transactionsByPaymentHash(paymentHash: $hash) {
                id status direction settlementAmount
                initiationVia { ... on InitiationViaLn { paymentRequest paymentHash } }
                settlementVia {
                  ... on SettlementViaLn { preImage }
                  ... on SettlementViaIntraLedger { preImage }
                }
              } }
            } } }
          }`,
          variables: { walletId: account, hash: paymentHash },
        }),
      });
      if (!res.ok) throw new Error("Outgoing evidence unavailable; keep reservation");
      const data = await res.json();
      if (data.errors?.length) throw new Error("Outgoing evidence query rejected; keep reservation");
      const wallet = data.data?.me?.defaultAccount?.walletById;
      if (wallet?.id !== account || wallet.walletCurrency !== "BTC") throw new Error("Outgoing evidence wallet mismatch");
      const outgoing = wallet.transactionsByPaymentHash?.filter((tx: any) => tx.direction === "SEND") ?? [];
      // Do not choose a convenient record out of conflicting attempts.
      if (outgoing.length !== 1) throw new Error("Unique outgoing payment record required");
      const tx = outgoing[0];
      if (!["SUCCESS", "FAILURE"].includes(tx.status)) throw new Error("Outgoing payment is not terminal");
      if (!Number.isSafeInteger(tx.settlementAmount) || tx.settlementAmount >= 0) throw new Error("Outgoing BTC amount not verified");
      return {
        provider: "blink", account, reference: tx.id, direction: tx.direction,
        invoice: tx.initiationVia?.paymentRequest, paymentHash: tx.initiationVia?.paymentHash,
        amountSats: String(-tx.settlementAmount), outcome: tx.status === "SUCCESS" ? "paid" : "rejected",
        definitive: tx.status === "FAILURE",
        ...(tx.settlementVia?.preImage ? { preimage: tx.settlementVia.preImage } : {}),
      };
    },
    async bitcoinTransaction(txid) {
      if (!/^[a-f0-9]{64}$/.test(txid)) throw new Error("Invalid broadcast identity");
      const base = `https://blockstream.info/api/tx/${txid}`;
      const metadata = await (await get(base)).json();
      if (metadata.txid !== txid) throw new Error("Broadcast provider identity mismatch");
      const hex = (await (await get(`${base}/hex`)).text()).trim();
      if (!/^(?:[a-f0-9]{2})+$/.test(hex) || hex.length > 8000000) throw new Error("Invalid broadcast evidence");
      return { hex, observed: true };
    },
  };
}
