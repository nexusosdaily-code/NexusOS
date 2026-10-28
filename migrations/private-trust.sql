-- Private metadata only. No electoral credentials, blockchain records or wallet changes.
CREATE TABLE IF NOT EXISTS private_trust_request_windows (
  user_id varchar(36) PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  requests integer NOT NULL,
  expires_at timestamptz NOT NULL
);
CREATE TABLE IF NOT EXISTS private_trust_workspaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id varchar(36) NOT NULL REFERENCES users(id),
  kind text NOT NULL CHECK (kind IN ('family','charitable')),
  payload text NOT NULL,
  confirmation_invalidated boolean NOT NULL DEFAULT false,
  expires_at timestamptz NOT NULL DEFAULT now()+interval '365 days',
  closed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE private_trust_workspaces ADD COLUMN IF NOT EXISTS confirmation_invalidated boolean NOT NULL DEFAULT false;
ALTER TABLE private_trust_workspaces ADD COLUMN IF NOT EXISTS expires_at timestamptz NOT NULL DEFAULT now()+interval '365 days';
ALTER TABLE private_trust_workspaces ADD COLUMN IF NOT EXISTS closed_at timestamptz;
CREATE TABLE IF NOT EXISTS private_trust_members (
  workspace_id uuid NOT NULL REFERENCES private_trust_workspaces(id),
  user_id varchar(36) NOT NULL REFERENCES users(id),
  role text NOT NULL CHECK (role IN ('custodian','contributor','reviewer','reader')),
  consent_version text,
  consent_at timestamptz,
  revoked_at timestamptz,
  PRIMARY KEY (workspace_id,user_id)
);
CREATE TABLE IF NOT EXISTS private_trust_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES private_trust_workspaces(id),
  author_id varchar(36) NOT NULL REFERENCES users(id),
  type text NOT NULL CHECK (type IN ('lineage','beneficiary','discussion','instrument','birth-certificate','lineage-evidence','authority-evidence')),
  version integer NOT NULL,
  payload text NOT NULL,
  object_id uuid,
  state text NOT NULL DEFAULT 'draft' CHECK (state IN ('draft','under-review','approved','rejected')),
  expires_at timestamptz NOT NULL,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(workspace_id,version)
);
CREATE INDEX IF NOT EXISTS private_trust_records_expiry ON private_trust_records(expires_at) WHERE deleted_at IS NULL;
CREATE TABLE IF NOT EXISTS private_trust_reviews (
  record_id uuid NOT NULL REFERENCES private_trust_records(id),
  reviewer_id varchar(36) NOT NULL REFERENCES users(id),
  controller_id text NOT NULL,
  decision text NOT NULL CHECK (decision IN ('approve','reject')),
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(record_id,reviewer_id),
  UNIQUE(record_id,controller_id)
);
CREATE TABLE IF NOT EXISTS private_trust_audit (
  id bigserial PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES private_trust_workspaces(id),
  actor_id varchar(36) NOT NULL REFERENCES users(id),
  action text NOT NULL,
  target_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
-- The application can only append audit entries. No sensitive payload in the audit.
CREATE OR REPLACE FUNCTION private_trust_audit_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Private trust audit entries are immutable'; END $$;
DROP TRIGGER IF EXISTS private_trust_audit_immutable ON private_trust_audit;
CREATE TRIGGER private_trust_audit_immutable BEFORE UPDATE OR DELETE ON private_trust_audit
FOR EACH ROW EXECUTE FUNCTION private_trust_audit_immutable();
