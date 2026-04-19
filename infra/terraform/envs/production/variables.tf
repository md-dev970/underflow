variable "aws_region" {
  description = "Primary AWS region for production."
  type        = string
  default     = "us-west-2"
}

variable "name_prefix" {
  description = "Production resource name prefix."
  type        = string
  default     = "underflow-prod"
}

variable "app_domain_name" {
  description = "Full app domain name, for example underflow.example.com."
  type        = string
}

variable "route53_zone_id" {
  description = "Route 53 hosted zone ID serving the app domain."
  type        = string
}

variable "web_bucket_name" {
  description = "S3 bucket used to store the built frontend assets."
  type        = string
}

variable "api_image_uri" {
  description = "API container image URI."
  type        = string
}

variable "worker_image_uri" {
  description = "Optional worker image URI. Defaults to the API image when empty."
  type        = string
  default     = ""
}

variable "app_count" {
  description = "Desired API task count."
  type        = number
  default     = 1
}

variable "worker_count" {
  description = "Desired worker task count."
  type        = number
  default     = 1
}

variable "api_cpu" {
  description = "API task CPU units."
  type        = number
  default     = 512
}

variable "api_memory" {
  description = "API task memory in MiB."
  type        = number
  default     = 1024
}

variable "worker_cpu" {
  description = "Worker task CPU units."
  type        = number
  default     = 512
}

variable "worker_memory" {
  description = "Worker task memory in MiB."
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
  description = "Automated RDS backup retention period in days."
  type        = number
  default     = 0
}

variable "db_multi_az" {
  description = "Whether the database should run in Multi-AZ mode."
  type        = bool
  default     = false
}

variable "csrf_secret" {
  description = "API CSRF secret."
  type        = string
  sensitive   = true
}

variable "jwt_access_secret" {
  description = "JWT access signing secret."
  type        = string
  sensitive   = true
}

variable "jwt_refresh_secret" {
  description = "JWT refresh signing secret."
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

variable "auth_cookie_domain" {
  description = "Optional production auth cookie domain."
  type        = string
  default     = ""
}

variable "auth_cookie_same_site" {
  description = "Production auth cookie SameSite setting."
  type        = string
  default     = "lax"
}

variable "cost_sync_lookback_days" {
  description = "Default Cost Explorer lookback window."
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
  description = "Email provider used in production."
  type        = string
  default     = "ses"
}

variable "aws_ses_region" {
  description = "SES region."
  type        = string
  default     = "us-west-2"
}

variable "billing_enabled" {
  description = "Whether billing features are enabled in production."
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
  description = "Auth rate limit ceiling."
  type        = number
  default     = 10
}

variable "rate_limit_mutation_window_ms" {
  description = "Mutation rate limit window in milliseconds."
  type        = number
  default     = 60000
}

variable "rate_limit_mutation_max_requests" {
  description = "Mutation rate limit ceiling."
  type        = number
  default     = 20
}

variable "tags" {
  description = "Additional production tags."
  type        = map(string)
  default     = {}
}
