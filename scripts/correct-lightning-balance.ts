import { inspectCorrection, applyApprovedCorrection } from "../server/lightning-balance-correction";

// Intentionally not imported by the application, build or startup workflows.
const [command, id, confirmation, ...extra] = process.argv.slice(2);
if (!id || extra.length || (command !== "inspect" && command !== "apply") ||
    (command === "apply" && !confirmation) || (command === "inspect" && confirmation)) {
  console.error("Usage: npx tsx scripts/correct-lightning-balance.ts inspect <user-id>\n" +
    "       npx tsx scripts/correct-lightning-balance.ts apply <approval-audit-id> <correction-key>");
  process.exitCode = 1;
} else {
  const { pool } = await import("../server/db");
  try {
    const result = command === "inspect"
      ? await inspectCorrection(pool, id)
      : await applyApprovedCorrection(pool, id, confirmation);
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error(error instanceof Error ? error.message : "Correction failed");
    process.exitCode = 1;
  } finally { await pool.end(); }
}