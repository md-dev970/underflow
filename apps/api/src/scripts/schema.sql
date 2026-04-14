CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  phone VARCHAR(30),
  avatar_url TEXT,
  role VARCHAR(30) NOT NULL DEFAULT 'customer',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  is_email_verified BOOLEAN NOT NULL DEFAULT FALSE,
  password_changed_at TIMESTAMP NOT NULL DEFAULT NOW(),
  session_version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMP NOT NULL DEFAULT NOW();

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS session_version INTEGER NOT NULL DEFAULT 1;

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  user_agent TEXT,
  ip_address TEXT,
  last_used_at TIMESTAMP NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMP NOT NULL,
  revoked_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

ALTER TABLE refresh_tokens
  ADD COLUMN IF NOT EXISTS user_agent TEXT;

ALTER TABLE refresh_tokens
  ADD COLUMN IF NOT EXISTS ip_address TEXT;

ALTER TABLE refresh_tokens
  ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMP NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS user_notification_preferences (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  cost_alerts BOOLEAN NOT NULL DEFAULT TRUE,
  drift_reports BOOLEAN NOT NULL DEFAULT TRUE,
  maintenance BOOLEAN NOT NULL DEFAULT FALSE,
  feature_releases BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  used_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  stripe_customer_id VARCHAR(255) NOT NULL,
  stripe_subscription_id VARCHAR(255) UNIQUE,
  stripe_price_id VARCHAR(255),
  status VARCHAR(50) NOT NULL,
  current_period_start TIMESTAMP,
  current_period_end TIMESTAMP,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
  stripe_payment_intent_id VARCHAR(255) UNIQUE,
  amount_cents INTEGER NOT NULL,
  currency VARCHAR(10) NOT NULL DEFAULT 'usd',
  status VARCHAR(50) NOT NULL,
  paid_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL UNIQUE,
  owner_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS workspace_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(30) NOT NULL DEFAULT 'owner',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (workspace_id, user_id)
);

CREATE TABLE IF NOT EXISTS aws_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  aws_account_id VARCHAR(12) NOT NULL,
  role_arn TEXT NOT NULL,
  external_id TEXT,
  status VARCHAR(30) NOT NULL DEFAULT 'pending',
  last_verified_at TIMESTAMP,
  last_sync_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cost_sync_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aws_account_id UUID NOT NULL REFERENCES aws_accounts(id) ON DELETE CASCADE,
  status VARCHAR(30) NOT NULL,
  started_at TIMESTAMP NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMP,
  error_message TEXT
);

CREATE TABLE IF NOT EXISTS cost_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  aws_account_id UUID NOT NULL REFERENCES aws_accounts(id) ON DELETE CASCADE,
  usage_date DATE NOT NULL,
  service_name VARCHAR(255) NOT NULL,
  amount DECIMAL(18, 6) NOT NULL,
  currency VARCHAR(10) NOT NULL DEFAULT 'USD',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (workspace_id, aws_account_id, usage_date, service_name)
);

CREATE TABLE IF NOT EXISTS budget_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  aws_account_id UUID REFERENCES aws_accounts(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  threshold_amount DECIMAL(18, 2) NOT NULL,
  currency VARCHAR(10) NOT NULL DEFAULT 'USD',
  period VARCHAR(20) NOT NULL DEFAULT 'monthly',
  recipient_email VARCHAR(255) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS alert_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_id UUID NOT NULL REFERENCES budget_alerts(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  aws_account_id UUID REFERENCES aws_accounts(id) ON DELETE CASCADE,
  observed_amount DECIMAL(18, 2) NOT NULL,
  currency VARCHAR(10) NOT NULL DEFAULT 'USD',
  triggered_at TIMESTAMP NOT NULL DEFAULT NOW(),
  status VARCHAR(30) NOT NULL DEFAULT 'triggered'
);

CREATE TABLE IF NOT EXISTS notification_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_event_id UUID NOT NULL REFERENCES alert_events(id) ON DELETE CASCADE,
  channel VARCHAR(30) NOT NULL DEFAULT 'email',
  recipient VARCHAR(255) NOT NULL,
  status VARCHAR(30) NOT NULL,
  sent_at TIMESTAMP,
  error_message TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
