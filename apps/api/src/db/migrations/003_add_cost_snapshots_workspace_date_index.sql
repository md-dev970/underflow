-- The benchmark summary and reporting queries filter by workspace and date
-- without always filtering by AWS account. The original unique index orders
-- aws_account_id before usage_date, so it cannot efficiently serve that path.
CREATE INDEX IF NOT EXISTS idx_cost_snapshots_workspace_date
  ON cost_snapshots (workspace_id, usage_date)
  INCLUDE (amount, currency);

ANALYZE cost_snapshots;
