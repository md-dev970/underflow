output "cloudfront_distribution_id" {
  description = "CloudFront distribution ID."
  value       = aws_cloudfront_distribution.site.id
}

output "cloudfront_distribution_domain_name" {
  description = "CloudFront distribution domain name."
  value       = aws_cloudfront_distribution.site.domain_name
}

output "web_bucket_name" {
  description = "Web assets S3 bucket name."
  value       = aws_s3_bucket.web.bucket
}

output "cluster_name" {
  description = "ECS cluster name."
  value       = aws_ecs_cluster.main.name
}

output "api_service_name" {
  description = "ECS API service name."
  value       = aws_ecs_service.api.name
}

output "worker_service_name" {
  description = "ECS worker service name."
  value       = aws_ecs_service.worker.name
}

output "api_task_definition_arn" {
  description = "API task definition ARN."
  value       = aws_ecs_task_definition.api.arn
}

output "worker_task_definition_arn" {
  description = "Worker task definition ARN."
  value       = aws_ecs_task_definition.worker.arn
}

output "migration_task_definition_arn" {
  description = "Migration task definition ARN."
  value       = aws_ecs_task_definition.migrate.arn
}

output "private_subnet_ids" {
  description = "Private subnet IDs for ECS tasks."
  value       = values(aws_subnet.private)[*].id
}

output "ecs_security_group_id" {
  description = "Security group attached to ECS tasks."
  value       = aws_security_group.ecs.id
}

output "ecr_repository_url" {
  description = "Application ECR repository URL."
  value       = aws_ecr_repository.app.repository_url
}

output "db_endpoint" {
  description = "RDS endpoint hostname."
  value       = aws_db_instance.postgres.address
}

output "alb_dns_name" {
  description = "ALB DNS name for the API origin."
  value       = aws_lb.api.dns_name
}

output "app_url" {
  description = "Public application URL."
  value       = "https://${var.app_domain_name}"
}
