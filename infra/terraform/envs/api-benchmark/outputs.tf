output "aws_region" {
  value = var.aws_region
}

output "resource_prefix" {
  value = local.name_prefix
}

output "ecr_repository_url" {
  value = aws_ecr_repository.api.repository_url
}

output "ecs_cluster_name" {
  value = aws_ecs_cluster.benchmark.name
}

output "ecs_service_name" {
  value = aws_ecs_service.api.name
}

output "task_definition_arn" {
  value = aws_ecs_task_definition.api.arn
}

output "alb_dns_name" {
  value = aws_lb.api.dns_name
}

output "api_base_url" {
  value = "http://${aws_lb.api.dns_name}"
}

output "rds_identifier" {
  value = aws_db_instance.postgres.identifier
}

output "ecs_security_group_id" {
  value = aws_security_group.ecs.id
}

output "subnet_ids" {
  value = aws_subnet.public[*].id
}

output "load_balancer_arn_suffix" {
  value = aws_lb.api.arn_suffix
}

output "target_group_arn_suffix" {
  value = aws_lb_target_group.api.arn_suffix
}

output "availability_zones" {
  value = aws_subnet.public[*].availability_zone
}

output "runtime_secret_arn" {
  value     = aws_secretsmanager_secret.runtime.arn
  sensitive = true
}
