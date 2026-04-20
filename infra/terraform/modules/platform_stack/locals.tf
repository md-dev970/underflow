data "aws_caller_identity" "current" {}

data "aws_availability_zones" "available" {
  state = "available"
}

locals {
  worker_image = var.worker_image_uri != "" ? var.worker_image_uri : var.api_image_uri
  api_domain   = "api.${var.app_domain_name}"

  tags = merge(
    {
      project     = "underflow"
      environment = "production"
      managed     = "terraform"
    },
    var.tags,
  )

  azs = slice(data.aws_availability_zones.available.names, 0, 2)

  private_subnet_cidrs = [
    "10.0.1.0/24",
    "10.0.2.0/24",
  ]

  public_subnet_cidrs = [
    "10.0.101.0/24",
    "10.0.102.0/24",
  ]

  database_url = format(
    "postgresql://%s:%s@%s:5432/%s",
    urlencode(var.db_username),
    urlencode(var.db_password),
    aws_db_instance.postgres.address,
    var.db_name,
  )

  app_environment = [
    { name = "NODE_ENV", value = "production" },
    { name = "PORT", value = "3080" },
    { name = "DATABASE_URL", value = local.database_url },
    { name = "DATABASE_SSL_ENABLED", value = "true" },
    { name = "DATABASE_SSL_REJECT_UNAUTHORIZED", value = "false" },
    { name = "CSRF_SECRET", value = var.csrf_secret },
    { name = "JWT_ACCESS_SECRET", value = var.jwt_access_secret },
    { name = "JWT_REFRESH_SECRET", value = var.jwt_refresh_secret },
    { name = "JWT_ACCESS_EXPIRES_IN", value = var.jwt_access_expires_in },
    { name = "JWT_REFRESH_EXPIRES_IN", value = var.jwt_refresh_expires_in },
    { name = "CLIENT_URL", value = var.client_url },
    { name = "AUTH_COOKIE_DOMAIN", value = var.auth_cookie_domain },
    { name = "AUTH_COOKIE_SAME_SITE", value = var.auth_cookie_same_site },
    { name = "AWS_REGION", value = var.aws_region },
    { name = "AWS_SES_REGION", value = var.aws_ses_region },
    { name = "EMAIL_PROVIDER", value = var.email_provider },
    { name = "AUTH_EMAIL_FROM", value = var.auth_email_from },
    { name = "ALERT_EMAIL_FROM", value = var.alert_email_from },
    { name = "COST_SYNC_LOOKBACK_DAYS", value = tostring(var.cost_sync_lookback_days) },
    { name = "BILLING_ENABLED", value = tostring(var.billing_enabled) },
    { name = "STRIPE_SECRET_KEY", value = var.stripe_secret_key },
    { name = "STRIPE_WEBHOOK_SECRET", value = var.stripe_webhook_secret },
    { name = "STRIPE_SUCCESS_URL", value = var.stripe_success_url },
    { name = "STRIPE_CANCEL_URL", value = var.stripe_cancel_url },
    { name = "LOG_LEVEL", value = var.log_level },
    { name = "RATE_LIMIT_AUTH_WINDOW_MS", value = tostring(var.rate_limit_auth_window_ms) },
    { name = "RATE_LIMIT_AUTH_MAX_REQUESTS", value = tostring(var.rate_limit_auth_max_requests) },
    { name = "RATE_LIMIT_MUTATION_WINDOW_MS", value = tostring(var.rate_limit_mutation_window_ms) },
    { name = "RATE_LIMIT_MUTATION_MAX_REQUESTS", value = tostring(var.rate_limit_mutation_max_requests) },
  ]
}
