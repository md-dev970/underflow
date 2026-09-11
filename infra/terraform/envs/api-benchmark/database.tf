resource "random_password" "database" {
  length           = 32
  special          = true
  override_special = "!#$%&*+-.:=?_"
}

resource "random_password" "csrf" {
  length  = 48
  special = false
}

resource "random_password" "jwt_access" {
  length  = 64
  special = false
}

resource "random_password" "jwt_refresh" {
  length  = 64
  special = false
}

resource "random_password" "benchmark" {
  length  = 24
  special = false
}

resource "aws_db_subnet_group" "benchmark" {
  name       = "${local.name_prefix}-db-subnets"
  subnet_ids = aws_subnet.public[*].id
  tags       = { Name = "${local.name_prefix}-db-subnets" }
}

resource "aws_db_instance" "postgres" {
  identifier                   = "${local.name_prefix}-postgres"
  engine                       = "postgres"
  engine_version               = var.db_engine_version
  instance_class               = var.db_instance_class
  allocated_storage            = 20
  storage_type                 = "gp3"
  storage_encrypted            = true
  db_name                      = "underflow_benchmark"
  username                     = "underflow_benchmark"
  password                     = random_password.database.result
  port                         = 5432
  db_subnet_group_name         = aws_db_subnet_group.benchmark.name
  vpc_security_group_ids       = [aws_security_group.rds.id]
  publicly_accessible          = false
  multi_az                     = false
  backup_retention_period      = 0
  deletion_protection          = false
  skip_final_snapshot          = true
  auto_minor_version_upgrade   = true
  apply_immediately            = true
  performance_insights_enabled = var.performance_insights_enabled

  tags = { Name = "${local.name_prefix}-postgres" }
}

resource "aws_secretsmanager_secret" "runtime" {
  name                    = "${local.name_prefix}-runtime"
  description             = "Disposable API benchmark runtime secrets."
  recovery_window_in_days = 0
  tags                    = { Name = "${local.name_prefix}-runtime" }
}

resource "aws_secretsmanager_secret_version" "runtime" {
  secret_id = aws_secretsmanager_secret.runtime.id
  secret_string = jsonencode({
    DATABASE_URL       = "postgresql://underflow_benchmark:${urlencode(random_password.database.result)}@${aws_db_instance.postgres.address}:5432/underflow_benchmark"
    CSRF_SECRET        = random_password.csrf.result
    JWT_ACCESS_SECRET  = random_password.jwt_access.result
    JWT_REFRESH_SECRET = random_password.jwt_refresh.result
    BENCHMARK_PASSWORD = random_password.benchmark.result
  })
}
