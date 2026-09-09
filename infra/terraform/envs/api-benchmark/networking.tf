data "aws_availability_zones" "available" {
  state = "available"
}

resource "aws_vpc" "benchmark" {
  cidr_block           = "10.90.0.0/16"
  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = { Name = "${local.name_prefix}-vpc" }
}

resource "aws_internet_gateway" "benchmark" {
  vpc_id = aws_vpc.benchmark.id
  tags   = { Name = "${local.name_prefix}-igw" }
}

resource "aws_subnet" "public" {
  count = 2

  vpc_id                  = aws_vpc.benchmark.id
  availability_zone       = data.aws_availability_zones.available.names[count.index]
  cidr_block              = cidrsubnet(aws_vpc.benchmark.cidr_block, 8, count.index)
  map_public_ip_on_launch = true

  tags = { Name = "${local.name_prefix}-public-${count.index + 1}" }
}

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.benchmark.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.benchmark.id
  }

  tags = { Name = "${local.name_prefix}-public" }
}

resource "aws_route_table_association" "public" {
  count = 2

  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

resource "aws_security_group" "alb" {
  name        = "${local.name_prefix}-alb"
  description = "Benchmark load generator ingress only."
  vpc_id      = aws_vpc.benchmark.id

  ingress {
    description = "HTTP from the explicitly configured load generator"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = [var.load_test_cidr]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "${local.name_prefix}-alb" }
}

resource "aws_security_group" "ecs" {
  name        = "${local.name_prefix}-ecs"
  description = "Benchmark API tasks; no direct public ingress."
  vpc_id      = aws_vpc.benchmark.id

  ingress {
    description     = "API traffic from the benchmark ALB only"
    from_port       = 3080
    to_port         = 3080
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "${local.name_prefix}-ecs" }
}

resource "aws_security_group" "rds" {
  name        = "${local.name_prefix}-rds"
  description = "Benchmark PostgreSQL ingress from API tasks only."
  vpc_id      = aws_vpc.benchmark.id

  ingress {
    description     = "PostgreSQL from benchmark API tasks only"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.ecs.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "${local.name_prefix}-rds" }
}
