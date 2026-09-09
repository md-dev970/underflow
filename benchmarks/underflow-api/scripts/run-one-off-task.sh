#!/usr/bin/env bash
set -euo pipefail

MODE="${1:-}"
if [[ "$MODE" != "migrate" && "$MODE" != "seed" ]]; then
  echo "usage: $0 migrate|seed" >&2
  exit 2
fi

for command in aws terraform jq; do
  command -v "$command" >/dev/null || { echo "$command is required" >&2; exit 2; }
done

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
TF_ROOT="$ROOT_DIR/infra/terraform/envs/api-benchmark"
RESULTS_DIR="${BENCHMARK_RESULTS_DIR:-$ROOT_DIR/benchmarks/underflow-api/results/local-evidence}"
mkdir -p "$RESULTS_DIR"

tf_output() {
  terraform -chdir="$TF_ROOT" output -raw "$1" | tr -d '\r'
}

REGION="$(tf_output aws_region)"
CLUSTER="$(tf_output ecs_cluster_name)"
TASK_DEFINITION="$(tf_output task_definition_arn)"
SECURITY_GROUP="$(tf_output ecs_security_group_id)"
mapfile -t SUBNETS < <(terraform -chdir="$TF_ROOT" output -json subnet_ids | jq -r '.[]')
SUBNET_LIST="$(IFS=,; echo "${SUBNETS[*]}")"

if [[ "$MODE" == "migrate" ]]; then
  COMMAND_JSON='["node","dist/db/migrate.js"]'
  ENVIRONMENT_JSON='[]'
else
  COMMAND_JSON='["node","dist/scripts/seed-benchmark.js"]'
  ENVIRONMENT_JSON='[{"name":"ALLOW_BENCHMARK_SEED","value":"true"}]'
fi

OVERRIDES="$(jq -cn \
  --argjson command "$COMMAND_JSON" \
  --argjson environment "$ENVIRONMENT_JSON" \
  '{containerOverrides:[{name:"api",command:$command,environment:$environment}]}')"

TASK_ARN="$(aws ecs run-task \
  --region "$REGION" \
  --cluster "$CLUSTER" \
  --task-definition "$TASK_DEFINITION" \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[$SUBNET_LIST],securityGroups=[$SECURITY_GROUP],assignPublicIp=ENABLED}" \
  --overrides "$OVERRIDES" \
  --query 'tasks[0].taskArn' \
  --output text)"

if [[ -z "$TASK_ARN" || "$TASK_ARN" == "None" ]]; then
  echo "ECS did not return a task ARN" >&2
  exit 1
fi

TASK_ID="${TASK_ARN##*/}"
echo "Waiting for benchmark $MODE task $TASK_ID"
aws ecs wait tasks-stopped --region "$REGION" --cluster "$CLUSTER" --tasks "$TASK_ARN"

EXIT_CODE="$(aws ecs describe-tasks \
  --region "$REGION" \
  --cluster "$CLUSTER" \
  --tasks "$TASK_ARN" \
  --query 'tasks[0].containers[?name==`api`].exitCode | [0]' \
  --output text)"

LOG_GROUP="/ecs/$(tf_output resource_prefix)/api"
LOG_STREAM="ecs/api/$TASK_ID"
RAW_LOG="$(mktemp)"
trap 'rm -f "$RAW_LOG"' EXIT

# Git Bash otherwise rewrites /ecs/... into a Windows filesystem path before
# invoking the native AWS CLI. Scope the override to this command so Terraform
# still receives converted -chdir paths.
MSYS_NO_PATHCONV=1 aws logs get-log-events \
  --region "$REGION" \
  --log-group-name "$LOG_GROUP" \
  --log-stream-name "$LOG_STREAM" \
  --output json > "$RAW_LOG"

"$ROOT_DIR/benchmarks/underflow-api/scripts/sanitize-results.sh" \
  "$RAW_LOG" "$RESULTS_DIR/${MODE}-task.log"

if [[ "$EXIT_CODE" != "0" ]]; then
  echo "Benchmark $MODE task failed with exit code $EXIT_CODE; see sanitized log" >&2
  exit 1
fi

if [[ "$MODE" == "seed" ]]; then
  jq '[.events[].message | fromjson? | select(.dataset == "underflow-api-benchmark-v1")] | last' \
    "$RESULTS_DIR/seed-task.log" > "$RESULTS_DIR/dataset.json"
  jq -e '.costSnapshots == 3650000 and .users == 10 and .workspaces == 10 and .awsAccounts == 200' \
    "$RESULTS_DIR/dataset.json" >/dev/null
fi

echo "Benchmark $MODE task completed with exit code 0"
