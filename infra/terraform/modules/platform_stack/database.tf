resource "aws_db_subnet_group" "postgres" {
  name       = "${var.name_prefix}-db-subnets"
  subnet_ids = values(aws_subnet.private)[*].id
  tags       = local.tags
}

resource "aws_db_instance" "postgres" {
  identifier                          = "${var.name_prefix}-postgres"
  engine                              = "postgres"
  engine_version                      = "16.13"
  instance_class                      = var.db_instance_class
  allocated_storage                   = var.db_allocated_storage
  max_allocated_storage               = var.db_allocated_storage * 2
  db_name                             = var.db_name
  username                            = var.db_username
  password                            = var.db_password
  db_subnet_group_name                = aws_db_subnet_group.postgres.name
  vpc_security_group_ids              = [aws_security_group.db.id]
  backup_retention_period             = var.db_backup_retention_period
  deletion_protection                 = false
  skip_final_snapshot                 = true
  final_snapshot_identifier           = "${var.name_prefix}-postgres-final"
  publicly_accessible                 = false
  multi_az                            = var.db_multi_az
  storage_encrypted                   = true
  auto_minor_version_upgrade          = true
  apply_immediately                   = true
  performance_insights_enabled        = true
  iam_database_authentication_enabled = false

  tags = local.tags
}
