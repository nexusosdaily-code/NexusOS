-- Additive election storage only. Does not commission protected review.
CREATE TABLE IF NOT EXISTS community_persons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id varchar(36) NOT NULL UNIQUE REFERENCES users(id),
  person_reference_digest text NOT NULL UNIQUE,
  evidence_reference text NOT NULL,
  verified_by varchar(36) NOT NULL REFERENCES users(id),
  verified_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz
);
CREATE TABLE IF NOT EXISTS community_nominations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id uuid NOT NULL REFERENCES community_persons(id),
  public_name text NOT NULL,
  role text NOT NULL CHECK (role IN ('constitutional-legal','technical-security','human-life-safety')),
  statement text NOT NULL,
  public_key text NOT NULL CHECK (public_key ~ '^[a-f0-9]{64}$'),
  withdrawn_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS community_nomination_active_role
  ON community_nominations(person_id,role) WHERE withdrawn_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS community_nomination_active_key
  ON community_nominations(public_key) WHERE withdrawn_at IS NULL;
CREATE TABLE IF NOT EXISTS community_elections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL CHECK (kind IN ('reviewer','policy')),
  nomination_id uuid REFERENCES community_nominations(id),
  scope text NOT NULL CHECK (scope IN ('constitutional-legal','technical-security','human-life-safety','community-representation','welfare','wnsp-technology')),
  title text NOT NULL,
  body text NOT NULL,
  opens_at timestamptz NOT NULL,
  closes_at timestamptz NOT NULL CHECK (closes_at > opens_at),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','cancelled')),
  created_by varchar(36) NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  finalised_at timestamptz,
  record_digest text UNIQUE,
  record_content text,
  block_number integer,
  term_starts_at timestamptz,
  term_ends_at timestamptz,
  CHECK ((kind='reviewer' AND nomination_id IS NOT NULL) OR (kind='policy' AND nomination_id IS NULL))
);
CREATE TABLE IF NOT EXISTS community_ballots (
  election_id uuid NOT NULL REFERENCES community_elections(id),
  person_id uuid NOT NULL REFERENCES community_persons(id),
  choice text NOT NULL CHECK (choice IN ('yes','no')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (election_id,person_id)
);
CREATE TABLE IF NOT EXISTS community_election_audit (
  id bigserial PRIMARY KEY,
  actor_id varchar(36) NOT NULL REFERENCES users(id),
  action text NOT NULL,
  resource_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
