-- The by-service report needs service_name in addition to the values covered
-- by the workspace/date index. Including it allows all three cost-reporting
-- queries to avoid fetching the matching rows from the heap.
CREATE INDEX IF NOT EXISTS idx_cost_snapshots_workspace_date_reporting
  ON cost_snapshots (workspace_id, usage_date)
  INCLUDE (service_name, amount, currency);

-- The reporting index is a strict covering replacement for the narrower index
-- introduced by migration 003.
DROP INDEX IF EXISTS idx_cost_snapshots_workspace_date;

ANALYZE cost_snapshots;
