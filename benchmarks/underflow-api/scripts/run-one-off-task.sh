#!/usr/bin/env bash
set -euo pipefail

MODE="${1:-}"
if [[ "$MODE" != "migrate" && "$MODE" != "seed" && "$MODE" != "rollup" && "$MODE" != "explain" ]]; then
  echo "usage: $0 migrate|seed|rollup|explain" >&2
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
elif [[ "$MODE" == "seed" ]]; then
  COMMAND_JSON='["node","dist/scripts/seed-benchmark.js"]'
  ENVIRONMENT_JSON='[{"name":"ALLOW_BENCHMARK_SEED","value":"true"}]'
elif [[ "$MODE" == "rollup" ]]; then
  COMMAND_JSON='["node","dist/scripts/backfill-cost-rollups.js"]'
  ENVIRONMENT_JSON='[{"name":"ALLOW_COST_ROLLUP_BACKFILL","value":"true"}]'
else
  EXPLAIN_SCRIPT='import { pool } from "./dist/config/db.js";
const workspaceId = "20000000-0000-4000-8000-000000000001";
const parameters = [workspaceId, "2025-01-01", "2025-12-31"];
const queries = {
  summary: `SELECT COALESCE(SUM(total_amount), 0) AS total_amount,
    COALESCE(MAX(currency), '\''USD'\'') AS currency
    FROM workspace_cost_daily_rollups
    WHERE workspace_id = $1 AND usage_date BETWEEN $2 AND $3`,
  timeseries: `SELECT usage_date, SUM(total_amount) AS total_amount,
    COALESCE(MAX(currency), '\''USD'\'') AS currency
    FROM workspace_cost_daily_rollups
    WHERE workspace_id = $1 AND usage_date BETWEEN $2 AND $3
    GROUP BY usage_date ORDER BY usage_date ASC`,
  byService: `SELECT service_name, SUM(total_amount) AS total_amount,
    COALESCE(MAX(currency), '\''USD'\'') AS currency
    FROM workspace_cost_daily_rollups
    WHERE workspace_id = $1 AND usage_date BETWEEN $2 AND $3
    GROUP BY service_name ORDER BY total_amount DESC`,
};
const plans = {};
for (const [name, sql] of Object.entries(queries)) {
  const result = await pool.query(`EXPLAIN (ANALYZE, BUFFERS, SETTINGS, FORMAT JSON) ${sql}`, parameters);
  plans[name] = result.rows[0]["QUERY PLAN"];
}
const stats = await pool.query(`SELECT relname,
  pg_size_pretty(pg_total_relation_size(relid)) AS total_size,
  pg_size_pretty(pg_relation_size(relid)) AS table_size,
  pg_size_pretty(pg_indexes_size(relid)) AS indexes_size,
  n_live_tup, seq_scan, idx_scan
  FROM pg_stat_user_tables
  WHERE relname IN ('\''cost_snapshots'\'', '\''workspace_cost_daily_rollups'\'')
  ORDER BY relname`);
console.log(JSON.stringify({ benchmarkDiagnostic: true, stats: stats.rows, plans }, null, 2));
await pool.end();'
  COMMAND_JSON="$(jq -cn --arg script "$EXPLAIN_SCRIPT" '["node","--input-type=module","--eval",$script]')"
  ENVIRONMENT_JSON='[]'
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
  jq -e '.costSnapshots == 3650000 and .costRollups == 182500 and .users == 10 and .workspaces == 10 and .awsAccounts == 200' \
    "$RESULTS_DIR/dataset.json" >/dev/null
elif [[ "$MODE" == "rollup" ]]; then
  jq '[.events[].message | fromjson? | select(.costRollupBackfill == true)] | last' \
    "$RESULTS_DIR/rollup-task.log" > "$RESULTS_DIR/rollup.json"
  jq -e '.rows == 182500' "$RESULTS_DIR/rollup.json" >/dev/null

  if [[ -f "$RESULTS_DIR/dataset.json" ]]; then
    DATASET_TMP="$(mktemp)"
    jq --slurpfile rollup "$RESULTS_DIR/rollup.json" \
      '.costRollups = $rollup[0].rows' "$RESULTS_DIR/dataset.json" > "$DATASET_TMP"
    mv "$DATASET_TMP" "$RESULTS_DIR/dataset.json"
  fi
fi

echo "Benchmark $MODE task completed with exit code 0"
