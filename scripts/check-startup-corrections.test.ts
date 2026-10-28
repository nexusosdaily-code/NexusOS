import { describe, expect, it } from "vitest";
import { checkStartupCorrections } from "./check-startup-corrections";

describe("production startup artifact regression check", () => {
  it.each([
    "UPDATE lightning_wallets SET sats_balance = 961, total_deposited=49961",
    "UPDATE lightning_wallets\nSET sats_balance=961;",
    "'da62b876-4f10-4fbb-a979-f23b3032cc80'",
    "RAISE NOTICE 'UncJuddy sats restored: % sats credited'",
    "v_restore := v_expected - v_current;",
    'console.log("[MIGRATION] Startup schema migrations complete.");',
    "RAISE NOTICE 'sats_stakes.amount_sats upgraded to bigint'",
    "RAISE NOTICE 'lightning_transactions.amount_sats upgraded to bigint'",
    "UPDATE users SET withdrawals_blocked=false",
  ])("refuses a stale or unsafe built entrypoint: %s", bundle => {
    expect(() => checkStartupCorrections(bundle)).toThrow("Unsafe production startup artifact");
  });
  it("allows legitimate runtime ledger arithmetic and preserved restrictions", () => {
    expect(() => checkStartupCorrections(`
      UPDATE lightning_wallets SET sats_balance=sats_balance+$1 WHERE user_id=$2;
      SELECT withdrawals_blocked FROM users;
    `)).not.toThrow();
  });
});