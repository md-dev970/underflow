variable "aws_region" {
  description = "Primary AWS region for the platform."
  type        = string
}

variable "name_prefix" {
  description = "Resource name prefix."
  type        = string
  default     = "underflow-prod"
}

variable "app_domain_name" {
  description = "Full public domain name for the application."
  type        = string
}

variable "route53_zone_id" {
  description = "Route 53 hosted zone ID for the application domain."
  type        = string
}

variable "web_bucket_name" {
  description = "S3 bucket name used for static web assets."
  type        = string
}

variable "api_image_uri" {
  description = "Container image URI for the API service."
  type        = string
}

variable "worker_image_uri" {
  description = "Container image URI for the worker service."
  type        = string
  default     = ""
}

variable "app_count" {
  description = "Desired number of API tasks."
  type        = number
  default     = 1
}

variable "worker_count" {
  description = "Desired number of worker tasks."
  type        = number
  default     = 1
}

variable "api_cpu" {
  description = "CPU units for the API task."
  type        = number
  default     = 512
}

variable "api_memory" {
  description = "Memory (MiB) for the API task."
  type        = number
  default     = 1024
}

variable "worker_cpu" {
  description = "CPU units for the worker task."
  type        = number
  default     = 512
}

variable "worker_memory" {
  description = "Memory (MiB) for the worker task."
  type        = number
  default     = 1024
}

variable "db_instance_class" {
  description = "RDS instance class."
  type        = string
  default     = "db.t4g.micro"
}

variable "db_name" {
  description = "PostgreSQL database name."
  type        = string
}

variable "db_username" {
  description = "PostgreSQL master username."
  type        = string
}

variable "db_password" {
  description = "PostgreSQL master password."
  type        = string
  sensitive   = true
}

variable "db_allocated_storage" {
  description = "Allocated RDS storage in GiB."
  type        = number
  default     = 20
}

variable "db_backup_retention_period" {
  description = "Number of days to retain automated RDS backups."
  type        = number
  default     = 7
}

variable "db_multi_az" {
  description = "Whether the production database should run in Multi-AZ mode."
  type        = bool
  default     = false
}

variable "csrf_secret" {
  description = "CSRF secret used by the API."
  type        = string
  sensitive   = true
}

variable "jwt_access_secret" {
  description = "JWT access-token signing secret."
  type        = string
  sensitive   = true
}

variable "jwt_refresh_secret" {
  description = "JWT refresh-token signing secret."
  type        = string
  sensitive   = true
}

variable "jwt_access_expires_in" {
  description = "JWT access token lifetime."
  type        = string
  default     = "30m"
}

variable "jwt_refresh_expires_in" {
  description = "JWT refresh token lifetime."
  type        = string
  default     = "30d"
}

variable "client_url" {
  description = "Public client URL used for auth emails and CORS."
  type        = string
}

variable "auth_cookie_domain" {
  description = "Optional cookie domain override."
  type        = string
  default     = ""
}

variable "auth_cookie_same_site" {
  description = "Auth cookie SameSite setting."
  type        = string
  default     = "lax"
}

variable "cost_sync_lookback_days" {
  description = "Default number of days to look back when syncing Cost Explorer data."
  type        = number
  default     = 30
}

variable "alert_email_from" {
  description = "Alert email sender address."
  type        = string
}

variable "auth_email_from" {
  description = "Authentication email sender address."
  type        = string
}

variable "email_provider" {
  description = "Email provider configuration for the API."
  type        = string
  default     = "ses"
}

variable "aws_ses_region" {
  description = "SES region."
  type        = string
  default     = "us-west-2"
}

variable "billing_enabled" {
  description = "Whether billing features are enabled."
  type        = bool
  default     = false
}

variable "stripe_secret_key" {
  description = "Stripe secret key."
  type        = string
  default     = ""
  sensitive   = true
}

variable "stripe_webhook_secret" {
  description = "Stripe webhook secret."
  type        = string
  default     = ""
  sensitive   = true
}

variable "stripe_success_url" {
  description = "Stripe success URL."
  type        = string
  default     = ""
}

variable "stripe_cancel_url" {
  description = "Stripe cancel URL."
  type        = string
  default     = ""
}

variable "log_level" {
  description = "Application log level."
  type        = string
  default     = "info"
}

variable "rate_limit_auth_window_ms" {
  description = "Auth rate limit window in milliseconds."
  type        = number
  default     = 60000
}

variable "rate_limit_auth_max_requests" {
  description = "Auth rate limit maximum requests."
  type        = number
  default     = 10
}

variable "rate_limit_mutation_window_ms" {
  description = "Mutation rate limit window in milliseconds."
  type        = number
  default     = 60000
}

variable "rate_limit_mutation_max_requests" {
  description = "Mutation rate limit maximum requests."
  type        = number
  default     = 20
}

variable "tags" {
  description = "Additional tags applied to platform resources."
  type        = map(string)
  default     = {}
}
