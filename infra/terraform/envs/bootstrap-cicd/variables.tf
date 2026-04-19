variable "aws_region" {
  description = "AWS region for bootstrap infrastructure."
  type        = string
  default     = "us-west-2"
}

variable "terraform_state_bucket_name" {
  description = "Globally unique S3 bucket name used for Terraform remote state."
  type        = string
}

variable "terraform_lock_table_name" {
  description = "DynamoDB table name used for Terraform state locking."
  type        = string
}

variable "force_destroy_state_bucket" {
  description = "Whether to allow Terraform to destroy the state bucket even if it still contains objects."
  type        = bool
  default     = false
}

variable "github_repository" {
  description = "GitHub repository in owner/name format."
  type        = string
}

variable "github_actions_role_name" {
  description = "IAM role name assumed by GitHub Actions."
  type        = string
  default     = "underflow-github-actions-deploy"
}

variable "github_oidc_subjects" {
  description = "Allowed GitHub OIDC subjects."
  type        = list(string)
  default     = []
}

variable "github_oidc_thumbprints" {
  description = "OIDC thumbprints for GitHub Actions."
  type        = list(string)
  default     = ["6938fd4d98bab03faadb97b34396831e3780aea1"]
}

variable "tags" {
  description = "Additional tags applied to bootstrap resources."
  type        = map(string)
  default     = {}
}
