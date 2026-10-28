#!/bin/bash
set -euo pipefail

if [ "${NODE_ENV:-development}" = "production" ]; then
  echo "Post-merge setup is development-only" >&2
  exit 1
fi

npm install --legacy-peer-deps

if [ -f requirements.txt ]; then
  pip install -r requirements.txt --quiet
fi

npx tsx scripts/bootstrap-community-election-dev.ts
npx tsx scripts/apply-community-election-dev-guards.ts
npx tsx scripts/apply-wallet-wave-dev.ts
npx tsx scripts/bootstrap-private-trust-dev.ts
npx tsx scripts/bootstrap-founder-wallet-hold-dev.ts

# Do not run a blanket db:push against this legacy database automatically.
# Rename/uniqueness prompts can ask to truncate populated wallet tables, and
# some resolver failures even exit zero. Future schema changes must add their
# reviewed, idempotent development migration here and update shared/schema.ts.
echo "Scoped development migrations complete; full database reconciliation requires explicit review"
