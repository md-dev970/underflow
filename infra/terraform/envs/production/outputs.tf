output "cloudfront_distribution_id" {
  description = "CloudFront distribution ID."
  value       = module.platform.cloudfront_distribution_id
}

output "cloudfront_distribution_domain_name" {
  description = "CloudFront distribution domain name."
  value       = module.platform.cloudfront_distribution_domain_name
}

output "web_bucket_name" {
  description = "Static web asset bucket name."
  value       = module.platform.web_bucket_name
}

output "cluster_name" {
  description = "ECS cluster name."
  value       = module.platform.cluster_name
}

output "api_service_name" {
  description = "API ECS service name."
  value       = module.platform.api_service_name
}

output "worker_service_name" {
  description = "Worker ECS service name."
  value       = module.platform.worker_service_name
}

output "api_task_definition_arn" {
  description = "API task definition ARN."
  value       = module.platform.api_task_definition_arn
}

output "worker_task_definition_arn" {
  description = "Worker task definition ARN."
  value       = module.platform.worker_task_definition_arn
}

output "migration_task_definition_arn" {
  description = "Migration task definition ARN."
  value       = module.platform.migration_task_definition_arn
}

output "private_subnet_ids" {
  description = "Private subnet IDs for ECS tasks."
  value       = module.platform.private_subnet_ids
}

output "ecs_security_group_id" {
  description = "ECS security group ID."
  value       = module.platform.ecs_security_group_id
}

output "ecr_repository_url" {
  description = "ECR repository URL."
  value       = module.platform.ecr_repository_url
}

output "db_endpoint" {
  description = "RDS endpoint."
  value       = module.platform.db_endpoint
}

output "alb_dns_name" {
  description = "API ALB DNS name."
  value       = module.platform.alb_dns_name
}

output "app_url" {
  description = "Public application URL."
  value       = module.platform.app_url
}
