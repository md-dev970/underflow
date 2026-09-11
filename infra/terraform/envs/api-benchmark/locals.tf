locals {
  name_prefix = "underflow-api-bench-${var.benchmark_id}"

  required_tags = {
    project     = "underflow"
    environment = "api-benchmark"
    purpose     = "disposable-load-test"
    managed     = "terraform"
  }

  container_environment = [
    { name = "PORT", value = "3080" },
    { name = "NODE_ENV", value = "production" },
    { name = "DATABASE_SSL_ENABLED", value = "true" },
    { name = "DATABASE_SSL_REJECT_UNAUTHORIZED", value = "false" },
    { name = "AWS_REGION", value = var.aws_region },
    { name = "AWS_SES_REGION", value = var.aws_region },
    { name = "AWS_SES_ACCESS_KEY_ID", value = "" },
    { name = "AWS_SES_SECRET_ACCESS_KEY", value = "" },
    { name = "EMAIL_PROVIDER", value = "console" },
    { name = "BILLING_ENABLED", value = "false" },
    { name = "STRIPE_SECRET_KEY", value = "" },
    { name = "STRIPE_WEBHOOK_SECRET", value = "" },
    { name = "STRIPE_SUCCESS_URL", value = "" },
    { name = "STRIPE_CANCEL_URL", value = "" },
    { name = "CLIENT_URL", value = "http://${aws_lb.api.dns_name}" },
    { name = "AUTH_COOKIE_DOMAIN", value = "" },
    { name = "AUTH_COOKIE_SAME_SITE", value = "lax" },
    { name = "LOG_LEVEL", value = "info" },
    { name = "COST_SYNC_LOOKBACK_DAYS", value = "30" },
  ]

  container_secrets = [
    for key in [
      "DATABASE_URL",
      "CSRF_SECRET",
      "JWT_ACCESS_SECRET",
      "JWT_REFRESH_SECRET",
      "BENCHMARK_PASSWORD",
      ] : {
      name      = key
      valueFrom = "${aws_secretsmanager_secret.runtime.arn}:${key}::"
    }
  ]
}
