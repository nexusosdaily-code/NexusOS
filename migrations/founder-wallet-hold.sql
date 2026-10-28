-- Reviewed, additive policy only: no balances, accounts, allocations or keys
-- are changed. Apply in development via the scoped bootstrap; production
-- requires an explicitly approved maintenance migration, not startup DDL.
CREATE OR REPLACE FUNCTION founder_wallet_outgoing_denied(target_user_id text)
RETURNS boolean LANGUAGE plpgsql AS $$
DECLARE
  holder record;
  latest_action text;
BEGIN
  SELECT username, withdrawals_blocked INTO holder FROM users WHERE id=target_user_id;
  IF NOT FOUND THEN RETURN true; END IF;
  IF NOT COALESCE(holder.withdrawals_blocked,false) AND lower(holder.username)<>'uncjuddy' THEN
    RETURN false;
  END IF;
  -- Serialise held-wallet execution with Nexus's release/relock transaction.
  SELECT username, withdrawals_blocked INTO holder FROM users WHERE id=target_user_id FOR UPDATE;
  IF NOT FOUND THEN RETURN true; END IF;
  IF COALESCE(holder.withdrawals_blocked,false) THEN RETURN true; END IF;
  IF lower(holder.username)<>'uncjuddy' THEN RETURN false; END IF;
  SELECT a.action INTO latest_action FROM audit_logs a JOIN users founder ON founder.id=a.user_id
    WHERE a.resource='founder_wallet_lock' AND a.resource_id=target_user_id AND a.status='success'
      AND a.action IN ('founder_wallet_locked','founder_wallet_released')
      AND founder.username='Nexus' AND founder.role='admin'
    ORDER BY a.created_at DESC,a.id DESC LIMIT 1;
  RETURN latest_action IS DISTINCT FROM 'founder_wallet_released';
END;
$$;

CREATE OR REPLACE FUNCTION enforce_founder_currency_hold()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  outgoing boolean;
BEGIN
  IF TG_OP='DELETE' THEN
    outgoing := true;
  ELSE
    outgoing := NEW.user_id IS DISTINCT FROM OLD.user_id
      OR (to_jsonb(NEW)->>TG_ARGV[0])::numeric < (to_jsonb(OLD)->>TG_ARGV[0])::numeric
      OR COALESCE((to_jsonb(NEW)->>'locked_balance')::numeric,0) > COALESCE((to_jsonb(OLD)->>'locked_balance')::numeric,0)
      OR COALESCE((to_jsonb(NEW)->>'total_withdrawn')::numeric,0) > COALESCE((to_jsonb(OLD)->>'total_withdrawn')::numeric,0);
  END IF;
  IF outgoing AND founder_wallet_outgoing_denied(OLD.user_id::text) THEN
    RAISE EXCEPTION USING ERRCODE='P0001', MESSAGE='FOUNDER_WALLET_LOCKED';
  END IF;
  IF TG_OP='DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION enforce_founder_bundle_hold()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP<>'INSERT' AND founder_wallet_outgoing_denied(OLD.user_id::text) THEN
    RAISE EXCEPTION USING ERRCODE='P0001', MESSAGE='FOUNDER_WALLET_LOCKED';
  END IF;
  IF TG_OP<>'DELETE' AND founder_wallet_outgoing_denied(NEW.user_id::text) THEN
    RAISE EXCEPTION USING ERRCODE='P0001', MESSAGE='FOUNDER_WALLET_LOCKED';
  END IF;
  IF TG_OP='DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS founder_currency_hold ON wallets;
CREATE TRIGGER founder_currency_hold BEFORE UPDATE OR DELETE ON wallets
  FOR EACH ROW EXECUTE FUNCTION enforce_founder_currency_hold('balance');
DROP TRIGGER IF EXISTS founder_currency_hold ON lightning_wallets;
CREATE TRIGGER founder_currency_hold BEFORE UPDATE OR DELETE ON lightning_wallets
  FOR EACH ROW EXECUTE FUNCTION enforce_founder_currency_hold('sats_balance');
DROP TRIGGER IF EXISTS founder_bundle_hold ON spectral_bundles;
CREATE TRIGGER founder_bundle_hold BEFORE INSERT OR UPDATE OR DELETE ON spectral_bundles
  FOR EACH ROW EXECUTE FUNCTION enforce_founder_bundle_hold();
