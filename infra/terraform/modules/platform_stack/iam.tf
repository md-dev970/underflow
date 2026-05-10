data "aws_iam_policy_document" "task_execution_assume_role" {
  statement {
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["ecs-tasks.amazonaws.com"]
    }
  }
}

data "aws_iam_policy_document" "lambda_execution_assume_role" {
  statement {
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "task_execution" {
  name               = "${var.name_prefix}-task-execution"
  assume_role_policy = data.aws_iam_policy_document.task_execution_assume_role.json
  tags               = local.tags
}

resource "aws_iam_role_policy_attachment" "task_execution" {
  role       = aws_iam_role.task_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

resource "aws_iam_role" "task_runtime" {
  name               = "${var.name_prefix}-task-runtime"
  assume_role_policy = data.aws_iam_policy_document.task_execution_assume_role.json
  tags               = local.tags
}

data "aws_iam_policy_document" "task_runtime" {
  statement {
    sid    = "AllowAssumeCustomerCostRoles"
    effect = "Allow"
    actions = [
      "sts:AssumeRole",
    ]
    resources = [
      "arn:aws:iam::*:role/UnderflowCostExplorerRead",
    ]
  }

  statement {
    sid    = "AllowSesEmailSend"
    effect = "Allow"
    actions = [
      "ses:SendEmail",
      "ses:SendRawEmail",
    ]
    resources = ["*"]
  }

  statement {
    sid    = "AllowEcsExec"
    effect = "Allow"
    actions = [
      "ssmmessages:CreateControlChannel",
      "ssmmessages:CreateDataChannel",
      "ssmmessages:OpenControlChannel",
      "ssmmessages:OpenDataChannel",
    ]
    resources = ["*"]
  }
}

resource "aws_iam_role_policy" "task_runtime" {
  name   = "${var.name_prefix}-task-runtime"
  role   = aws_iam_role.task_runtime.id
  policy = data.aws_iam_policy_document.task_runtime.json
}

resource "aws_iam_role" "scheduled_sync_lambda" {
  name               = "${var.name_prefix}-scheduled-sync-lambda"
  assume_role_policy = data.aws_iam_policy_document.lambda_execution_assume_role.json
  tags               = local.tags
}

resource "aws_iam_role_policy_attachment" "scheduled_sync_lambda_basic" {
  role       = aws_iam_role.scheduled_sync_lambda.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy_attachment" "scheduled_sync_lambda_vpc" {
  role       = aws_iam_role.scheduled_sync_lambda.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole"
}

data "aws_iam_policy_document" "scheduled_sync_lambda" {
  statement {
    sid    = "AllowAssumeCustomerCostRoles"
    effect = "Allow"
    actions = [
      "sts:AssumeRole",
    ]
    resources = [
      "arn:aws:iam::*:role/UnderflowCostExplorerRead",
    ]
  }

  statement {
    sid    = "AllowSesEmailSend"
    effect = "Allow"
    actions = [
      "ses:SendEmail",
      "ses:SendRawEmail",
    ]
    resources = ["*"]
  }
}

resource "aws_iam_role_policy" "scheduled_sync_lambda" {
  name   = "${var.name_prefix}-scheduled-sync-lambda"
  role   = aws_iam_role.scheduled_sync_lambda.id
  policy = data.aws_iam_policy_document.scheduled_sync_lambda.json
}
