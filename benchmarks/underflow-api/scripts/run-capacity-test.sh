#!/usr/bin/env bash
set -euo pipefail

CAPACITY_VUS="${1:-7}"
CAPACITY_DURATION="${2:-3m}"
CAPACITY_LABEL="${CAPACITY_LABEL:-post-rollup}"
CLOUDWATCH_WAIT_SECONDS="${CLOUDWATCH_WAIT_SECONDS:-120}"

if [[ ! "$CAPACITY_VUS" =~ ^[1-9][0-9]*$ ]] || (( CAPACITY_VUS > 100 )); then
  echo "VUs must be an integer from 1 through 100" >&2
  exit 2
fi

if [[ ! "$CAPACITY_LABEL" =~ ^[A-Za-z0-9._-]+$ ]]; then
  echo "CAPACITY_LABEL may contain only letters, numbers, dots, underscores, and hyphens" >&2
  exit 2
fi

for command in aws curl jq k6 terraform tr; do
  command -v "$command" >/dev/null 2>&1 || {
    echo "$command is required" >&2
    exit 2
  }
done

REPO_ROOT="${REPO_ROOT:-$(git rev-parse --show-toplevel)}"
TF_ROOT="${TF_ROOT:-$REPO_ROOT/infra/terraform/envs/api-benchmark}"

tf_output() {
  terraform -chdir="$TF_ROOT" output -raw "$1" | tr -d '\r'
}

AWS_REGION="$(tf_output aws_region)"
PREFIX="$(tf_output resource_prefix)"
BENCHMARK_ID="${PREFIX#underflow-api-bench-}"
BASE_URL="$(tf_output api_base_url)"

if [[ -z "${BENCHMARK_RESULTS_DIR:-${RESULTS_DIR:-}}" ]]; then
  RESULTS_BASE="$REPO_ROOT/benchmarks/underflow-api/results"
  shopt -s nullglob
  existing_results=("$RESULTS_BASE"/*-"$BENCHMARK_ID")
  shopt -u nullglob
  if (( ${#existing_results[@]} > 0 )); then
    RESULTS_DIR="${existing_results[${#existing_results[@]} - 1]}"
  else
    RESULTS_DIR="$RESULTS_BASE/$(date -u +%F)-$BENCHMARK_ID"
  fi
else
  RESULTS_DIR="${BENCHMARK_RESULTS_DIR:-${RESULTS_DIR:-}}"
fi
mkdir -p "$RESULTS_DIR"

RUN_NAME="capacity-${CAPACITY_VUS}vus-${CAPACITY_LABEL}"
K6_SUMMARY="$RESULTS_DIR/${RUN_NAME}-summary.json"
CLOUDWATCH_SUMMARY="$RESULTS_DIR/${RUN_NAME}-cloudwatch.json"

if [[ -e "$K6_SUMMARY" || -e "$CLOUDWATCH_SUMMARY" ]]; then
  echo "Refusing to overwrite existing evidence for $RUN_NAME" >&2
  echo "Set CAPACITY_LABEL to a new label before rerunning." >&2
  exit 1
fi

bash "$REPO_ROOT/benchmarks/underflow-api/scripts/update-load-test-ip.sh"
curl --fail --silent --show-error "$BASE_URL/api/v1/health" >/dev/null

TEST_EMAIL="benchmark+01@example.invalid"
WORKSPACE_ID="20000000-0000-4000-8000-000000000001"
TEST_PASSWORD="$(aws secretsmanager get-secret-value \
  --region "$AWS_REGION" \
  --secret-id "$PREFIX-runtime" \
  --query SecretString \
  --output text | jq -r '.BENCHMARK_PASSWORD')"
[[ -n "$TEST_PASSWORD" && "$TEST_PASSWORD" != "null" ]] || {
  echo "Benchmark password was missing from Secrets Manager" >&2
  exit 1
}

echo "Running $CAPACITY_VUS VUs for $CAPACITY_DURATION"
CAPACITY_START="$(date -u +%FT%TZ)"
set +e
RESULTS_DIR="$RESULTS_DIR" \
SUMMARY_NAME="${RUN_NAME}-summary.json" \
BASE_URL="$BASE_URL" \
TEST_EMAIL="$TEST_EMAIL" \
TEST_PASSWORD="$TEST_PASSWORD" \
WORKSPACE_ID="$WORKSPACE_ID" \
CAPACITY_VUS="$CAPACITY_VUS" \
CAPACITY_DURATION="$CAPACITY_DURATION" \
  k6 run "$REPO_ROOT/benchmarks/underflow-api/k6/capacity.js"
K6_EXIT=$?
set -e
CAPACITY_END="$(date -u +%FT%TZ)"
unset TEST_PASSWORD

echo "Waiting ${CLOUDWATCH_WAIT_SECONDS}s for CloudWatch datapoints"
sleep "$CLOUDWATCH_WAIT_SECONDS"

AWS_REGION="$AWS_REGION" \
ECS_CLUSTER="$(tf_output ecs_cluster_name)" \
ECS_SERVICE="$(tf_output ecs_service_name)" \
RDS_IDENTIFIER="$(tf_output rds_identifier)" \
ALB_ARN_SUFFIX="$(tf_output load_balancer_arn_suffix)" \
TARGET_GROUP_ARN_SUFFIX="$(tf_output target_group_arn_suffix)" \
START_TIME="$CAPACITY_START" \
END_TIME="$CAPACITY_END" \
OUTPUT_FILE="$CLOUDWATCH_SUMMARY" \
  bash "$REPO_ROOT/benchmarks/underflow-api/scripts/collect-aws-metadata.sh"

echo "Functional summary"
jq '{
  iterations: .metrics.iterations.values,
  requests: .metrics.measured_requests.values,
  failures: .metrics.measured_failures.values,
  checks: .metrics.checks.values
}' "$K6_SUMMARY"

echo "Server and resource summary"
jq '{
  alb_latency: .metrics.alb_target_response.datapoints,
  rds_cpu: .metrics.rds_cpu.datapoints,
  rds_memory: .metrics.rds_free_memory.datapoints,
  ecs_cpu: .metrics.ecs_cpu.datapoints
}' "$CLOUDWATCH_SUMMARY"

if (( K6_EXIT != 0 )); then
  echo "FAIL: k6 exited with status $K6_EXIT" >&2
  exit 1
fi

bash "$REPO_ROOT/benchmarks/underflow-api/scripts/check-capacity-result.sh" \
  "$K6_SUMMARY" "$CLOUDWATCH_SUMMARY"

echo "Evidence saved to:"
echo "  $K6_SUMMARY"
echo "  $CLOUDWATCH_SUMMARY"
