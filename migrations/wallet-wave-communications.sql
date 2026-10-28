BEGIN;
CREATE TABLE IF NOT EXISTS wave_communications (
  id uuid PRIMARY KEY,
  kind text NOT NULL CHECK(kind IN ('private','commission','broadcast')),
  sender_id varchar(36) NOT NULL REFERENCES users(id),
  recipient_id varchar(36) REFERENCES users(id),
  message_id varchar(36) UNIQUE REFERENCES lambda_messages(id),
  commission_id uuid REFERENCES community_elections(id),
  template_index integer,
  topic text CHECK(topic IN ('constitutional-legal','technical-security','human-life-safety')),
  content text NOT NULL,
  envelope jsonb NOT NULL,
  salt text NOT NULL CHECK(length(salt)=64),
  commitment text NOT NULL UNIQUE,
  ledger_content text NOT NULL,
  block_number integer NOT NULL REFERENCES blockchain_blocks(block_number),
  idempotency_key uuid NOT NULL,
  request_digest text NOT NULL,
  created_at timestamptz NOT NULL,
  CHECK ((kind='private' AND recipient_id IS NOT NULL AND message_id IS NOT NULL AND commission_id IS NULL AND topic IS NULL)
    OR (kind='commission' AND recipient_id IS NOT NULL AND commission_id IS NOT NULL AND message_id IS NULL)
    OR (kind='broadcast' AND recipient_id IS NULL AND message_id IS NULL AND commission_id IS NOT NULL AND template_index IS NOT NULL AND topic IS NOT NULL))
);
CREATE UNIQUE INDEX IF NOT EXISTS wave_sender_retry ON wave_communications(sender_id,idempotency_key);
CREATE UNIQUE INDEX IF NOT EXISTS wave_single_commission_delivery ON wave_communications(commission_id,recipient_id) WHERE kind='commission';
CREATE UNIQUE INDEX IF NOT EXISTS wave_single_broadcast_template ON wave_communications(commission_id,template_index) WHERE kind='broadcast';
CREATE INDEX IF NOT EXISTS wave_recipient_time ON wave_communications(recipient_id,created_at);
CREATE INDEX IF NOT EXISTS wave_sender_time ON wave_communications(sender_id,created_at);
CREATE INDEX IF NOT EXISTS wave_broadcast_topic ON wave_communications(topic,created_at) WHERE kind='broadcast';
CREATE TABLE IF NOT EXISTS wave_receipts (
  communication_id uuid NOT NULL REFERENCES wave_communications(id),
  recipient_id varchar(36) NOT NULL REFERENCES users(id),
  salt text NOT NULL CHECK(length(salt)=64),
  envelope jsonb NOT NULL,
  commitment text NOT NULL UNIQUE,
  ledger_content text NOT NULL,
  block_number integer NOT NULL REFERENCES blockchain_blocks(block_number),
  created_at timestamptz NOT NULL,
  PRIMARY KEY(communication_id,recipient_id)
);
CREATE TABLE IF NOT EXISTS wave_consents (
  recipient_id varchar(36) NOT NULL REFERENCES users(id),
  sender_id varchar(36) NOT NULL REFERENCES users(id),
  allowed boolean NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY(recipient_id,sender_id)
);
CREATE TABLE IF NOT EXISTS wave_subscriptions (
  user_id varchar(36) NOT NULL REFERENCES users(id),
  topic text NOT NULL CHECK(topic IN ('constitutional-legal','technical-security','human-life-safety')),
  subscribed boolean NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY(user_id,topic)
);
CREATE OR REPLACE FUNCTION wave_reject_history_mutation() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'Wallet wave communications and receipts are immutable';
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS wave_immutable_communications ON wave_communications;
CREATE TRIGGER wave_immutable_communications BEFORE UPDATE OR DELETE ON wave_communications
  FOR EACH ROW EXECUTE FUNCTION wave_reject_history_mutation();
DROP TRIGGER IF EXISTS wave_immutable_receipts ON wave_receipts;
CREATE TRIGGER wave_immutable_receipts BEFORE UPDATE OR DELETE ON wave_receipts
  FOR EACH ROW EXECUTE FUNCTION wave_reject_history_mutation();
COMMIT;
