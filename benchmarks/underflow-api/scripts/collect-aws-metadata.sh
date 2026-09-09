#!/usr/bin/env bash
set -euo pipefail

required=(AWS_REGION ECS_CLUSTER ECS_SERVICE RDS_IDENTIFIER ALB_ARN_SUFFIX TARGET_GROUP_ARN_SUFFIX START_TIME END_TIME OUTPUT_FILE)
for name in "${required[@]}"; do
  [[ -n "${!name:-}" ]] || { echo "$name is required" >&2; exit 2; }
done

command -v aws >/dev/null || { echo "aws is required" >&2; exit 2; }
if command -v py >/dev/null; then
  PYTHON_COMMAND=(py -3)
elif command -v python3 >/dev/null; then
  PYTHON_COMMAND=(python3)
elif command -v python >/dev/null; then
  PYTHON_COMMAND=(python)
else
  echo "python3, py, or python is required" >&2
  exit 2
fi

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

collect_metric() {
  local key="$1" namespace="$2" metric="$3" statistic="$4"
  shift 4
  aws cloudwatch get-metric-statistics \
    --region "$AWS_REGION" \
    --namespace "$namespace" \
    --metric-name "$metric" \
    --dimensions "$@" \
    --start-time "$START_TIME" \
    --end-time "$END_TIME" \
    --period 60 \
    --statistics "$statistic" \
    --output json > "$TMP_DIR/$key.json"
}

collect_metric ecs_cpu AWS/ECS CPUUtilization Average \
  Name=ClusterName,Value="$ECS_CLUSTER" Name=ServiceName,Value="$ECS_SERVICE"
collect_metric ecs_memory AWS/ECS MemoryUtilization Average \
  Name=ClusterName,Value="$ECS_CLUSTER" Name=ServiceName,Value="$ECS_SERVICE"
collect_metric ecs_running_tasks ECS/ContainerInsights RunningTaskCount Average \
  Name=ClusterName,Value="$ECS_CLUSTER" Name=ServiceName,Value="$ECS_SERVICE"
collect_metric alb_target_response AWS/ApplicationELB TargetResponseTime Average \
  Name=LoadBalancer,Value="$ALB_ARN_SUFFIX" Name=TargetGroup,Value="$TARGET_GROUP_ARN_SUFFIX"
collect_metric alb_4xx AWS/ApplicationELB HTTPCode_ELB_4XX_Count Sum \
  Name=LoadBalancer,Value="$ALB_ARN_SUFFIX"
collect_metric alb_5xx AWS/ApplicationELB HTTPCode_ELB_5XX_Count Sum \
  Name=LoadBalancer,Value="$ALB_ARN_SUFFIX"
collect_metric alb_target_5xx AWS/ApplicationELB HTTPCode_Target_5XX_Count Sum \
  Name=LoadBalancer,Value="$ALB_ARN_SUFFIX" Name=TargetGroup,Value="$TARGET_GROUP_ARN_SUFFIX"
collect_metric rds_cpu AWS/RDS CPUUtilization Average Name=DBInstanceIdentifier,Value="$RDS_IDENTIFIER"
collect_metric rds_connections AWS/RDS DatabaseConnections Average Name=DBInstanceIdentifier,Value="$RDS_IDENTIFIER"
collect_metric rds_free_memory AWS/RDS FreeableMemory Average Name=DBInstanceIdentifier,Value="$RDS_IDENTIFIER"
collect_metric rds_read_latency AWS/RDS ReadLatency Average Name=DBInstanceIdentifier,Value="$RDS_IDENTIFIER"
collect_metric rds_write_latency AWS/RDS WriteLatency Average Name=DBInstanceIdentifier,Value="$RDS_IDENTIFIER"
collect_metric rds_burst_balance AWS/RDS BurstBalance Average Name=DBInstanceIdentifier,Value="$RDS_IDENTIFIER"
collect_metric rds_cpu_credit AWS/RDS CPUCreditBalance Average Name=DBInstanceIdentifier,Value="$RDS_IDENTIFIER"

aws ecs describe-services \
  --region "$AWS_REGION" \
  --cluster "$ECS_CLUSTER" \
  --services "$ECS_SERVICE" \
  --query 'services[0].{desiredCount:desiredCount,runningCount:runningCount,pendingCount:pendingCount}' \
  --output json > "$TMP_DIR/ecs_tasks.json"

"${PYTHON_COMMAND[@]}" - "$TMP_DIR" "$OUTPUT_FILE" "$START_TIME" "$END_TIME" <<'PY'
import json
import pathlib
import sys

source = pathlib.Path(sys.argv[1])
output = pathlib.Path(sys.argv[2])
payload = {
    "startTime": sys.argv[3],
    "endTime": sys.argv[4],
    "periodSeconds": 60,
    "ecsTaskCountsAtCollection": json.loads((source / "ecs_tasks.json").read_text()),
    "metrics": {},
}
for path in sorted(source.glob("*.json")):
    if path.name == "ecs_tasks.json":
        continue
    metric = json.loads(path.read_text())
    payload["metrics"][path.stem] = {
        "label": metric.get("Label"),
        "datapoints": sorted(metric.get("Datapoints", []), key=lambda item: item["Timestamp"]),
    }
output.parent.mkdir(parents=True, exist_ok=True)
output.write_text(json.dumps(payload, indent=2) + "\n")
PY

echo "Saved CloudWatch summary to $OUTPUT_FILE"
