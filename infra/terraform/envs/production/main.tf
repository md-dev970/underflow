provider "aws" {
  region = var.aws_region
}

provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"
}

locals {
  default_tags = merge(
    {
      project     = "underflow"
      environment = "production"
      managed     = "terraform"
    },
    var.tags,
  )
}

module "platform" {
  source = "../../modules/platform_stack"

  providers = {
    aws           = aws
    aws.us_east_1 = aws.us_east_1
  }

  aws_region                       = var.aws_region
  name_prefix                      = var.name_prefix
  app_domain_name                  = var.app_domain_name
  route53_zone_id                  = var.route53_zone_id
  web_bucket_name                  = var.web_bucket_name
  api_image_uri                    = var.api_image_uri
  worker_image_uri                 = var.worker_image_uri
  app_count                        = var.app_count
  worker_count                     = var.worker_count
  api_cpu                          = var.api_cpu
  api_memory                       = var.api_memory
  worker_cpu                       = var.worker_cpu
  worker_memory                    = var.worker_memory
  db_instance_class                = var.db_instance_class
  db_name                          = var.db_name
  db_username                      = var.db_username
  db_password                      = var.db_password
  db_allocated_storage             = var.db_allocated_storage
  db_backup_retention_period       = var.db_backup_retention_period
  db_multi_az                      = var.db_multi_az
  csrf_secret                      = var.csrf_secret
  jwt_access_secret                = var.jwt_access_secret
  jwt_refresh_secret               = var.jwt_refresh_secret
  jwt_access_expires_in            = var.jwt_access_expires_in
  jwt_refresh_expires_in           = var.jwt_refresh_expires_in
  client_url                       = "https://${var.app_domain_name}"
  auth_cookie_domain               = var.auth_cookie_domain
  auth_cookie_same_site            = var.auth_cookie_same_site
  cost_sync_lookback_days          = var.cost_sync_lookback_days
  alert_email_from                 = var.alert_email_from
  auth_email_from                  = var.auth_email_from
  email_provider                   = var.email_provider
  aws_ses_region                   = var.aws_ses_region
  billing_enabled                  = var.billing_enabled
  stripe_secret_key                = var.stripe_secret_key
  stripe_webhook_secret            = var.stripe_webhook_secret
  stripe_success_url               = var.stripe_success_url
  stripe_cancel_url                = var.stripe_cancel_url
  log_level                        = var.log_level
  rate_limit_auth_window_ms        = var.rate_limit_auth_window_ms
  rate_limit_auth_max_requests     = var.rate_limit_auth_max_requests
  rate_limit_mutation_window_ms    = var.rate_limit_mutation_window_ms
  rate_limit_mutation_max_requests = var.rate_limit_mutation_max_requests
  tags                             = local.default_tags
}
