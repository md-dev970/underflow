ALTER TABLE users
  ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMP NOT NULL DEFAULT NOW();

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS session_version INTEGER NOT NULL DEFAULT 1;

ALTER TABLE refresh_tokens
  ADD COLUMN IF NOT EXISTS user_agent TEXT;

ALTER TABLE refresh_tokens
  ADD COLUMN IF NOT EXISTS ip_address TEXT;

ALTER TABLE refresh_tokens
  ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMP NOT NULL DEFAULT NOW();

ALTER TABLE password_reset_tokens
  ADD COLUMN IF NOT EXISTS used_at TIMESTAMP;

ALTER TABLE alert_events
  ADD COLUMN IF NOT EXISTS event_key VARCHAR(255);

CREATE UNIQUE INDEX IF NOT EXISTS idx_cost_sync_runs_active_account
  ON cost_sync_runs (aws_account_id)
  WHERE status = 'running';

CREATE UNIQUE INDEX IF NOT EXISTS idx_alert_events_event_key
  ON alert_events (event_key)
  WHERE event_key IS NOT NULL;
