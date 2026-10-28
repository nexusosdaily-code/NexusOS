-- Additive continuity workflows; never installs protected-review consumption.
BEGIN;
ALTER TABLE community_elections DROP CONSTRAINT IF EXISTS community_elections_kind_check;
ALTER TABLE community_elections ADD CONSTRAINT community_elections_kind_check
  CHECK (kind IN ('reviewer','policy','appeal','recall','commission'));
-- Locate the old anonymous nomination check by its constrained column, not
-- an assumed generated name (the date check can receive the unnumbered name).
DO $$
DECLARE constraint_name text;
BEGIN
  FOR constraint_name IN
    SELECT conname FROM pg_constraint
    WHERE conrelid='community_elections'::regclass AND contype='c'
      AND (SELECT attnum FROM pg_attribute
        WHERE attrelid='community_elections'::regclass AND attname='nomination_id') = ANY(conkey)
  LOOP
    EXECUTE format('ALTER TABLE community_elections DROP CONSTRAINT %I',constraint_name);
  END LOOP;
END;
$$;
ALTER TABLE community_elections ADD CONSTRAINT community_elections_nomination_check
  CHECK ((kind='reviewer' AND nomination_id IS NOT NULL) OR (kind<>'reviewer' AND nomination_id IS NULL));
CREATE TABLE IF NOT EXISTS community_continuity_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL CHECK(kind IN ('appeal','recall','commission')),
  target_id uuid NOT NULL REFERENCES community_elections(id),
  target_digest text NOT NULL,
  filing_ends_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE UNIQUE INDEX IF NOT EXISTS community_single_appeal
  ON community_continuity_requests(target_id) WHERE kind='appeal';
CREATE TABLE IF NOT EXISTS community_continuity_submitters (
  request_id uuid NOT NULL REFERENCES community_continuity_requests(id),
  person_id uuid NOT NULL REFERENCES community_persons(id),
  PRIMARY KEY(request_id,person_id)
);
CREATE TABLE IF NOT EXISTS community_election_links (
  election_id uuid PRIMARY KEY REFERENCES community_elections(id),
  designation text CHECK(designation IN ('principal','alternate')),
  predecessor_id uuid REFERENCES community_elections(id),
  target_id uuid REFERENCES community_elections(id),
  request_id uuid REFERENCES community_continuity_requests(id)
);
-- A historical used nomination stays unchanged; a fresh nomination can
-- supersede it without withdrawing a mandate or losing its public snapshot.
CREATE TABLE IF NOT EXISTS community_nomination_successions (
  predecessor_id uuid PRIMARY KEY REFERENCES community_nominations(id),
  successor_id uuid NOT NULL UNIQUE REFERENCES community_nominations(id),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
DROP INDEX IF EXISTS community_nomination_active_role;
DROP INDEX IF EXISTS community_nomination_active_key;
CREATE TABLE IF NOT EXISTS community_continuity_events (
  id uuid PRIMARY KEY,
  type text NOT NULL,
  target_id uuid NOT NULL REFERENCES community_elections(id),
  related_id uuid,
  content text NOT NULL,
  digest text NOT NULL UNIQUE,
  block_number integer NOT NULL,
  created_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS community_continuity_target ON community_continuity_events(target_id);
CREATE OR REPLACE FUNCTION community_reject_history_mutation() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'Accepted community history is immutable';
END;
$$ LANGUAGE plpgsql;
-- Application/database clients cannot rewrite accepted history through ordinary SQL.
DROP TRIGGER IF EXISTS community_immutable_ballots ON community_ballots;
CREATE TRIGGER community_immutable_ballots BEFORE UPDATE OR DELETE ON community_ballots
  FOR EACH ROW EXECUTE FUNCTION community_reject_history_mutation();
DROP TRIGGER IF EXISTS community_immutable_events ON community_continuity_events;
CREATE TRIGGER community_immutable_events BEFORE UPDATE OR DELETE ON community_continuity_events
  FOR EACH ROW EXECUTE FUNCTION community_reject_history_mutation();
DROP TRIGGER IF EXISTS community_immutable_requests ON community_continuity_requests;
CREATE TRIGGER community_immutable_requests BEFORE UPDATE OR DELETE ON community_continuity_requests
  FOR EACH ROW EXECUTE FUNCTION community_reject_history_mutation();
DROP TRIGGER IF EXISTS community_immutable_links ON community_election_links;
CREATE TRIGGER community_immutable_links BEFORE UPDATE OR DELETE ON community_election_links
  FOR EACH ROW EXECUTE FUNCTION community_reject_history_mutation();
DROP TRIGGER IF EXISTS community_immutable_submitters ON community_continuity_submitters;
CREATE TRIGGER community_immutable_submitters BEFORE UPDATE OR DELETE ON community_continuity_submitters
  FOR EACH ROW EXECUTE FUNCTION community_reject_history_mutation();
DROP TRIGGER IF EXISTS community_immutable_nomination_successions ON community_nomination_successions;
CREATE TRIGGER community_immutable_nomination_successions BEFORE UPDATE OR DELETE ON community_nomination_successions
  FOR EACH ROW EXECUTE FUNCTION community_reject_history_mutation();
COMMIT;
