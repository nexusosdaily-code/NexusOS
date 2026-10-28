-- Apply only as part of explicitly approved protected-review commissioning.
-- Reservations intentionally survive failed mining and server restarts.
CREATE TABLE IF NOT EXISTS protected_review_consumptions (
  proposal_id uuid PRIMARY KEY,
  proposal_digest text NOT NULL UNIQUE,
  register_digest text NOT NULL,
  reserved_at timestamptz NOT NULL DEFAULT now()
);
