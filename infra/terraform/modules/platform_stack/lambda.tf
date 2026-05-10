data "archive_file" "scheduled_cost_sync" {
  type        = "zip"
  source_dir  = var.scheduled_sync_lambda_source_dir
  output_path = "${path.root}/.terraform/${var.name_prefix}-scheduled-cost-sync.zip"
}

resource "aws_cloudwatch_log_group" "scheduled_cost_sync_lambda" {
  name              = "/aws/lambda/${var.name_prefix}-scheduled-cost-sync"
  retention_in_days = 30
  tags              = local.tags
}

resource "aws_lambda_function" "scheduled_cost_sync" {
  function_name    = "${var.name_prefix}-scheduled-cost-sync"
  role             = aws_iam_role.scheduled_sync_lambda.arn
  runtime          = "nodejs22.x"
  handler          = "dist/jobs/scheduled-cost-sync.lambda.handler"
  filename         = data.archive_file.scheduled_cost_sync.output_path
  source_code_hash = data.archive_file.scheduled_cost_sync.output_base64sha256
  timeout          = 900
  memory_size      = 512

  vpc_config {
    subnet_ids         = values(aws_subnet.private)[*].id
    security_group_ids = [aws_security_group.ecs.id]
  }

  environment {
    variables = {
      for item in local.lambda_environment : item.name => item.value
    }
  }

  depends_on = [
    aws_cloudwatch_log_group.scheduled_cost_sync_lambda,
  ]

  tags = local.tags
}

resource "aws_cloudwatch_event_rule" "scheduled_cost_sync" {
  name                = "${var.name_prefix}-scheduled-cost-sync"
  description         = "Runs verified AWS account cost sync on a fixed schedule."
  schedule_expression = local.scheduled_sync_schedule_expression
  tags                = local.tags
}

resource "aws_cloudwatch_event_target" "scheduled_cost_sync" {
  rule      = aws_cloudwatch_event_rule.scheduled_cost_sync.name
  target_id = "scheduled-cost-sync-lambda"
  arn       = aws_lambda_function.scheduled_cost_sync.arn
}

resource "aws_lambda_permission" "scheduled_cost_sync_eventbridge" {
  statement_id  = "AllowExecutionFromEventBridgeScheduledSync"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.scheduled_cost_sync.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.scheduled_cost_sync.arn
}
