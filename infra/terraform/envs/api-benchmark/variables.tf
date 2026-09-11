variable "aws_region" {
  description = "AWS region in which to create the disposable benchmark environment."
  type        = string
  default     = "us-east-1"
}

variable "benchmark_id" {
  description = "Unique lowercase identifier appended to every named benchmark resource."
  type        = string

  validation {
    condition     = can(regex("^[a-z0-9]{4,8}$", var.benchmark_id))
    error_message = "benchmark_id must contain 4-8 lowercase letters or digits."
  }
}

variable "load_test_cidr" {
  description = "Single explicit IPv4 CIDR allowed to reach the benchmark ALB on port 80."
  type        = string

  validation {
    condition = (
      can(cidrnetmask(var.load_test_cidr)) &&
      strcontains(var.load_test_cidr, "/") &&
      var.load_test_cidr != "0.0.0.0/0"
    )
    error_message = "load_test_cidr must be an explicit IPv4 CIDR and cannot be 0.0.0.0/0."
  }
}

variable "image_tag" {
  description = "Immutable Git SHA tag pushed to the benchmark ECR repository."
  type        = string

  validation {
    condition     = can(regex("^[0-9a-f]{7,40}$", var.image_tag))
    error_message = "image_tag must be a 7-40 character lowercase hexadecimal Git SHA."
  }
}

variable "db_instance_class" {
  description = "Single-AZ disposable PostgreSQL instance class."
  type        = string
  default     = "db.t4g.micro"
}

variable "db_engine_version" {
  description = "PostgreSQL version compatible with the application."
  type        = string
  default     = "16.13"
}

variable "performance_insights_enabled" {
  description = "Enable RDS Performance Insights only after confirming class support and cost."
  type        = bool
  default     = false
}
