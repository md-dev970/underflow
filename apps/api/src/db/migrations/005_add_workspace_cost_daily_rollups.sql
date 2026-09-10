CREATE TABLE IF NOT EXISTS workspace_cost_daily_rollups (
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  usage_date DATE NOT NULL,
  service_name VARCHAR(255) NOT NULL,
  total_amount DECIMAL(18, 6) NOT NULL,
  currency VARCHAR(10) NOT NULL DEFAULT 'USD',
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  PRIMARY KEY (workspace_id, usage_date, service_name)
);

CREATE INDEX IF NOT EXISTS idx_workspace_cost_daily_rollups_workspace_service_date
  ON workspace_cost_daily_rollups (workspace_id, service_name, usage_date)
  INCLUDE (total_amount, currency);
