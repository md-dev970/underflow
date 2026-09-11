#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 2 ]]; then
  echo "usage: $0 RESULTS_DIRECTORY OUTPUT_MARKDOWN" >&2
  exit 2
fi

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

"${PYTHON_COMMAND[@]}" - "$1" "$2" <<'PY'
import json
import pathlib
import sys

directory = pathlib.Path(sys.argv[1])
output = pathlib.Path(sys.argv[2])

def read(name):
    path = directory / name
    if not path.exists():
        raise SystemExit(f"missing required evidence: {path}")
    return json.loads(path.read_text(encoding="utf-8"))

def values(summary, metric):
    try:
        return summary["metrics"][metric]["values"]
    except KeyError as error:
        raise SystemExit(f"missing metric {metric}: {error}") from error

def points(cloudwatch, metric):
    result = cloudwatch["metrics"][metric]["datapoints"]
    if not result:
        raise SystemExit(f"missing CloudWatch datapoints for {metric}")
    return result

def worst_percentile(cloudwatch, percentile):
    return max(
        point["ExtendedStatistics"][percentile] * 1000
        for point in points(cloudwatch, "alb_target_response")
    )

def maximum_average(cloudwatch, metric):
    return max(point["Average"] for point in points(cloudwatch, metric))

def minimum_average(cloudwatch, metric):
    return min(point["Average"] for point in points(cloudwatch, metric))

def count_breaches(cloudwatch, percentile, target_ms):
    return sum(
        point["ExtendedStatistics"][percentile] * 1000 >= target_ms
        for point in points(cloudwatch, "alb_target_response")
    )

def sum_metric(cloudwatch, metric):
    return sum(point.get("Sum", 0) for point in cloudwatch["metrics"][metric]["datapoints"])

environment = read("environment.json")
dataset = read("dataset.json")
rollup = read("rollup.json")
smoke = read("smoke-summary.json")
invalid_load = read("load-summary.json")
supported = read("capacity-45vus-post-rollup-soak-summary.json")
supported_cw = read("capacity-45vus-post-rollup-soak-cloudwatch.json")
failed = read("capacity-50vus-post-rollup-soak-summary.json")
failed_cw = read("capacity-50vus-post-rollup-soak-cloudwatch.json")
explain = read("explain-after-rollup.json")

supported_requests = values(supported, "measured_requests")
supported_failures = values(supported, "measured_failures")
supported_checks = values(supported, "checks")
failed_requests = values(failed, "measured_requests")
failed_failures = values(failed, "measured_failures")
failed_checks = values(failed, "checks")

supported_p50 = worst_percentile(supported_cw, "p50")
supported_p95 = worst_percentile(supported_cw, "p95")
supported_p99 = worst_percentile(supported_cw, "p99")
failed_p50 = worst_percentile(failed_cw, "p50")
failed_p95 = worst_percentile(failed_cw, "p95")
failed_p99 = worst_percentile(failed_cw, "p99")

supported_passes = (
    supported_failures["rate"] < 0.01
    and supported_checks["rate"] > 0.99
    and supported_p50 < 30
    and supported_p95 < 100
    and supported_p99 < 250
)
failed_passes = (
    failed_failures["rate"] < 0.01
    and failed_checks["rate"] > 0.99
    and failed_p50 < 30
    and failed_p95 < 100
    and failed_p99 < 250
)
if not supported_passes:
    raise SystemExit("45-VU soak evidence does not meet the documented targets")
if failed_passes:
    raise SystemExit("50-VU soak evidence unexpectedly meets every documented target")
if int(dataset["costRollups"]) != int(rollup["rows"]):
    raise SystemExit("dataset and rollup evidence disagree")

raw_rows = int(dataset["costSnapshots"])
rollup_rows = int(dataset["costRollups"])
records_label = f"{raw_rows / 1_000_000:.2f}M"
resume = (
    "Built and benchmarked a multi-tenant AWS cost-monitoring API against "
    f"{records_label} cost records, sustaining {supported_requests['rate']:.2f} requests/second "
    f"with {supported_p95:.2f} ms worst-minute p95 server-side latency under 45 concurrent virtual users."
)

plans = explain["plans"]
plan_times = {
    name: plans[name][0]["Execution Time"]
    for name in ("summary", "timeseries", "byService")
}
stats = {row["relname"]: row for row in explain["stats"]}

endpoint_metrics = [
    ("Cost summary", "endpoint_cost_summary_duration"),
    ("Cost timeseries", "endpoint_cost_timeseries_duration"),
    ("Cost by service", "endpoint_cost_by_service_duration"),
    ("AWS account list", "endpoint_aws_account_list_duration"),
    ("Sync history", "endpoint_sync_history_duration"),
]

lines = [
    "# Underflow API benchmark results",
    "",
    "## Objective",
    "",
    "Measure authenticated, PostgreSQL-backed cost-reporting reads on an isolated, disposable AWS configuration and establish a repeatable server-side capacity boundary.",
    "",
    "## Tested commit",
    "",
    f"The deployed image was built from local commit `{environment['gitSha']}` using image digest `{environment['imageDigest']}`. After an evidence-only history rewrite removed a bearer token from an earlier commit, the code-equivalent repository commit is `{environment['repositoryEquivalentSha']}`.",
    "",
    "## Infrastructure",
    "",
    "One ECS Fargate API task with 0.5 vCPU and 1,024 MiB memory, backed by a private, single-AZ `db.t4g.micro` PostgreSQL 16.13 instance with 20 GiB encrypted storage in `us-east-1`.",
    "",
    "## Dataset",
    "",
    f"{raw_rows:,} deterministic synthetic cost snapshots across {dataset['workspaces']} workspaces and {dataset['awsAccounts']} synthetic AWS accounts. Workspace/date/service reads use {rollup_rows:,} daily rollup rows, a {raw_rows / rollup_rows:.0f}x row-count reduction.",
    "",
    "## Workload",
    "",
    "Bearer-authenticated read traffic distributed as 30% cost summary, 30% timeseries, 25% by service, 10% AWS account list, and 5% sync history. Login occurs once during setup and is excluded from measured requests. The supported and failing boundary runs each lasted 15 minutes.",
    "",
    "## Acceptance targets",
    "",
    "Measured failure rate `<1%`, checks pass rate `>99%`, and every one-minute ALB `TargetResponseTime` datapoint p50 `<30 ms`, p95 `<100 ms`, and p99 `<250 ms`. ALB target response time excludes load-generator-to-ALB Internet transit.",
    "",
    "## Capacity results",
    "",
    "| Run | Duration | Requests | Requests/s | Failure rate | Checks | Worst p50 | Worst p95 | Worst p99 | Result |",
    "| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |",
    f"| 45 VUs | 15m | {supported_requests['count']:,} | {supported_requests['rate']:.2f} | {supported_failures['rate'] * 100:.4f}% | {supported_checks['rate'] * 100:.4f}% | {supported_p50:.2f} ms | {supported_p95:.2f} ms | {supported_p99:.2f} ms | Pass |",
    f"| 50 VUs | 15m | {failed_requests['count']:,} | {failed_requests['rate']:.2f} | {failed_failures['rate'] * 100:.4f}% | {failed_checks['rate'] * 100:.4f}% | {failed_p50:.2f} ms | {failed_p95:.2f} ms | {failed_p99:.2f} ms | Fail |",
    "",
    f"The documented configuration therefore sustained at least **{supported_requests['rate']:.2f} requests/second at 45 continuously active VUs**. The first sustained failing level tested was 50 VUs; this establishes a tested boundary, not a claim that 45 VUs equals 45 registered users or that 45 is the absolute maximum.",
    "",
    "## Initial smoke and normal-load outcomes",
    "",
    f"The initial 2-VU smoke run completed {values(smoke, 'measured_requests')['count']:,} measured requests with {values(smoke, 'measured_failures')['rate'] * 100:.3f}% functional failures and {values(smoke, 'checks')['rate'] * 100:.3f}% checks passed. It exposed the pre-rollup cost-query latency bottleneck.",
    "",
    f"The original ramped normal-load attempt recorded {values(invalid_load, 'measured_failures')['rate'] * 100:.2f}% failures after the load generator's public IP changed and was therefore invalid for capacity claims. It is retained as failure evidence but excluded from the supported result. A separate stress profile was not run after the fixed-load capacity boundary was established.",
    "",
    "## Database optimization evidence",
    "",
    f"The raw `cost_snapshots` relation occupied {stats['cost_snapshots']['total_size']}; the rollup relation occupied {stats['workspace_cost_daily_rollups']['total_size']}. Post-rollup full-year `EXPLAIN (ANALYZE, BUFFERS)` execution times were {plan_times['summary']:.3f} ms for summary, {plan_times['timeseries']:.3f} ms for timeseries, and {plan_times['byService']:.3f} ms for by-service. All used index-only scans.",
    "",
    "## Client-observed endpoint diagnostics",
    "",
    "These values include Internet transit from the load-generator location and are retained for diagnosis, not backend acceptance.",
    "",
    "| Endpoint | Average | Median | p90 | p95 | Maximum |",
    "| --- | ---: | ---: | ---: | ---: | ---: |",
]
for label, metric in endpoint_metrics:
    metric_values = values(supported, metric)
    lines.append(
        f"| {label} | {metric_values['avg']:.2f} ms | {metric_values['med']:.2f} ms | "
        f"{metric_values['p(90)']:.2f} ms | {metric_values['p(95)']:.2f} ms | {metric_values['max']:.2f} ms |"
    )

lines.extend([
    "",
    "## AWS resource metrics at the supported level",
    "",
    f"Peak one-minute ECS CPU was {maximum_average(supported_cw, 'ecs_cpu'):.2f}% and ECS memory was {maximum_average(supported_cw, 'ecs_memory'):.2f}%. Peak RDS CPU was {maximum_average(supported_cw, 'rds_cpu'):.2f}%, the minimum average freeable memory was {minimum_average(supported_cw, 'rds_free_memory') / 1024 / 1024:.2f} MiB, and database connections peaked at {maximum_average(supported_cw, 'rds_connections'):.0f}. The ALB recorded {sum_metric(supported_cw, 'alb_5xx'):.0f} load-balancer-generated 5xx responses and {sum_metric(supported_cw, 'alb_target_5xx'):.0f} target-generated 5xx responses during {supported_requests['count']:,} measured requests.",
    "",
    "## Observed bottleneck",
    "",
    f"At 50 VUs, p95 exceeded 100 ms in {count_breaches(failed_cw, 'p95', 100)} of 15 one-minute periods and p99 exceeded 250 ms in {count_breaches(failed_cw, 'p99', 250)} period. Peak one-minute ECS CPU reached {maximum_average(failed_cw, 'ecs_cpu'):.2f}% and RDS CPU reached {maximum_average(failed_cw, 'rds_cpu'):.2f}%. Functional reliability still met its target, so server-side tail latency—not widespread request failure—defined the tested capacity boundary.",
    "",
    "## Limitations",
    "",
    "Synthetic data; one AWS region; one Fargate task; HTTP restricted to one changing public CIDR; one load-generator location; a single-AZ burstable database; 15-minute confirmation windows; no production AWS integrations; and no post-boundary stress run. Results apply only to the documented configuration and workload.",
    "",
    "## Exact reproduction",
    "",
    "See `../../README.md`. The final confirmation command was:",
    "",
    "```bash",
    "CAPACITY_LABEL=post-rollup-soak \\",
    "  bash benchmarks/underflow-api/scripts/run-capacity-test.sh 45 15m",
    "```",
    "",
    "## Evidence-backed résumé bullet",
    "",
    resume,
    "",
    "```latex",
    "\\item Built and benchmarked a multi-tenant AWS cost-monitoring API against \\textbf{" + records_label + " cost records}, sustaining \\textbf{" + f"{supported_requests['rate']:.2f} requests/second" + "} with \\textbf{" + f"{supported_p95:.2f} ms worst-minute p95 server-side latency" + "} under \\textbf{45 concurrent virtual users}.",
    "```",
    "",
])

output.write_text("\n".join(lines), encoding="utf-8")
print(f"Generated {output} from the preserved 45-VU pass and 50-VU failure evidence")
PY
