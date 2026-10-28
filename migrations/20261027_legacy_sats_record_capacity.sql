-- Non-destructive widening only. No balances, signatures, statuses, transaction
-- IDs or historical values are changed. Apply in a reviewed maintenance window;
-- this task never executes migrations against application/funded databases.
-- Both conversions preserve every value representable by the old column types.
BEGIN;
SET LOCAL lock_timeout = '5s';
ALTER TABLE rune_swaps ALTER COLUMN rune_amount TYPE bigint;
ALTER TABLE rune_swaps ALTER COLUMN rate TYPE numeric(20,4);
COMMIT;
