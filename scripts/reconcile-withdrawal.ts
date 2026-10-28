import { readFileSync } from "node:fs";
import { inspectWithdrawal, applyWithdrawalReconciliation } from "../server/withdrawal-reconciliation";
import { createWithdrawalEvidenceReader } from "../server/withdrawal-evidence-reader";

// Explicit operator invocation only. No workers, startup imports or auto-approval.
const [command, id, approvalId, key, ...extra] = process.argv.slice(2);
if (extra.length || (command !== "inspect" && command !== "apply") || !id ||
    (command === "inspect" && (approvalId || key)) ||
    (command === "apply" && (!["lightning", "bitcoin"].includes(id) || !approvalId || !key))) {
  console.error("Usage: tsx scripts/reconcile-withdrawal.ts inspect <review-request.json>\n" +
    "       tsx scripts/reconcile-withdrawal.ts apply <lightning|bitcoin> <approval-uuid> <exact-key>");
  process.exitCode = 1;
} else {
  const { pool } = await import("../server/db");
  const reader = createWithdrawalEvidenceReader(() => {
    const direct = process.env.BLINK_API_KEY || process.env.BLINK_KEY || process.env.BLINK_TOKEN;
    if (direct) return direct;
    for (const connection of [process.env.BTCUSD, process.env.BLINK_BTC_CONNECTION,
      process.env.BLINK_USD_CONNECTION, process.env.BLINK_BTC, process.env.BLINK_CONNECTION]) {
      const entry = connection?.split(";").find(p => /^(api-key|apiKey|apikey|api_key)=/.test(p.trim()));
      if (entry) {
        const text = entry.trim();
        return text.slice(text.indexOf("=") + 1);
      }
    }
    return undefined;
  });
  try {
    if (command === "inspect") {
      const { target, request } = JSON.parse(readFileSync(id, "utf8"));
      console.log(JSON.stringify(await inspectWithdrawal(pool, target, request, reader), null, 2));
    } else {
      console.log(JSON.stringify(await applyWithdrawalReconciliation(pool, approvalId, key,
        id as "lightning" | "bitcoin", reader)));
    }
  } catch {
    // Never print a provider response, credential, invoice preimage or DB row.
    console.error("Reconciliation was not confirmed. Do not resend the payment. Inspect the applied audit record or retry the exact approval before obtaining a fresh review.");
    process.exitCode = 1;
  } finally { await pool.end(); }
}
