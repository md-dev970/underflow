output "terraform_state_bucket_name" {
  description = "Remote state bucket name."
  value       = module.tf_state_backend.bucket_name
}

output "terraform_lock_table_name" {
  description = "Remote state lock table name."
  value       = module.tf_state_backend.lock_table_name
}

output "github_actions_role_arn" {
  description = "ARN of the GitHub Actions deploy role."
  value       = module.github_oidc_role.role_arn
}

output "github_oidc_provider_arn" {
  description = "ARN of the GitHub OIDC provider."
  value       = module.github_oidc_role.oidc_provider_arn
}
