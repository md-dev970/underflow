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

def read(name, required=True):
    path = directory / name
    if not path.exists():
        if required:
            raise SystemExit(f"missing required evidence: {path}")
        return None
    return json.loads(path.read_text())

environment = read("environment.json")
dataset = read("dataset.json")
smoke = read("smoke-summary.json")
load = read("load-summary.json")
stress = read("stress-summary.json", required=False)
cloudwatch = read("cloudwatch-summary.json")

def values(summary, metric):
    try:
        return summary["metrics"][metric]["values"]
    except KeyError as error:
        raise SystemExit(f"missing metric {metric}: {error}") from error

def metric_row(label, summary):
    requests = values(summary, "measured_requests")
    duration = values(summary, "measured_duration")
    failures = values(summary, "measured_failures")
    checks = values(summary, "checks")
    return (
        f"| {label} | {requests['count']:.0f} | {requests['rate']:.2f} | "
        f"{duration['med']:.2f} | {duration['p(90)']:.2f} | {duration['p(95)']:.2f} | "
        f"{duration['p(99)']:.2f} | {duration['max']:.2f} | "
        f"{failures['rate'] * 100:.3f}% | {checks['rate'] * 100:.3f}% |"
    )

endpoint_metrics = [
    ("Cost summary", "endpoint_cost_summary_duration"),
    ("Cost timeseries", "endpoint_cost_timeseries_duration"),
    ("Cost by service", "endpoint_cost_by_service_duration"),
    ("AWS account list", "endpoint_aws_account_list_duration"),
    ("Sync history", "endpoint_sync_history_duration"),
]

load_duration = values(load, "measured_duration")
load_requests = values(load, "measured_requests")
vus = int(values(load, "vus_max")["max"])
cost_rows = int(dataset["costSnapshots"])
records_label = f"{cost_rows / 1_000_000:.2f}M" if cost_rows >= 1_000_000 else f"{cost_rows:,}"
resume = (
    "Built and benchmarked a multi-tenant AWS cost-monitoring API against "
    f"{records_label} cost records, sustaining {load_requests['rate']:.2f} requests/second "
    f"with {load_duration['p(95)']:.2f} ms p95 latency under {vus} concurrent users."
)

lines = [
    "# Underflow API benchmark results",
    "",
    "## Objective",
    "",
    "Measure authenticated, PostgreSQL-backed cost-reporting reads on the documented disposable AWS configuration.",
    "",
    "## Tested commit",
    "",
    f"`{environment['gitSha']}` using image digest `{environment['imageDigest']}`.",
    "",
    "## Infrastructure",
    "",
    "On the documented one-task ECS and db.t4g.micro configuration described in `environment.json`.",
    "",
    "## Dataset",
    "",
    f"{cost_rows:,} deterministic synthetic cost snapshots across {dataset['workspaces']} workspaces and {dataset['awsAccounts']} synthetic AWS accounts.",
    "",
    "## Workload",
    "",
    "30% summary, 30% timeseries, 25% by service, 10% AWS account list, and 5% sync history, with bearer-token authentication on every measured request.",
    "",
    "## Thresholds",
    "",
    "Failure rate < 1%, p95 < 200 ms, p99 < 500 ms, and checks pass rate > 99%.",
    "",
    "## Results",
    "",
    "| Run | Requests | Requests/s | p50 ms | p90 ms | p95 ms | p99 ms | Max ms | Failures | Checks passed |",
    "| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |",
    metric_row("Smoke", smoke),
    metric_row("Normal load", load),
]
if stress is not None:
    lines.append(metric_row("Stress", stress))

lines.extend([
    "",
    "## Per-endpoint results (normal load)",
    "",
    "| Endpoint | p95 ms | p99 ms | Max ms |",
    "| --- | ---: | ---: | ---: |",
])
for label, metric in endpoint_metrics:
    metric_values = values(load, metric)
    lines.append(
        f"| {label} | {metric_values['p(95)']:.2f} | {metric_values['p(99)']:.2f} | {metric_values['max']:.2f} |"
    )

lines.extend([
    "",
    "## AWS resource metrics",
    "",
    "Captured for the measured interval in `cloudwatch-summary.json`.",
    "",
    "## Observed bottlenecks",
    "",
    "Interpret from the preserved k6 and CloudWatch evidence; do not generalize beyond this configuration.",
    "",
    "## Limitations",
    "",
    "Synthetic data, one AWS region, one Fargate task, one load-generator location, HTTP restricted by CIDR, and a single-AZ burstable RDS instance.",
    "",
    "## Exact reproduction commands",
    "",
    "See `../README.md` and the immutable environment metadata in this directory.",
    "",
    "## Evidence-backed résumé bullet",
    "",
    resume,
    "",
    "```latex",
    "\\item " + resume.replace("%", "\\%"),
    "```",
    "",
])

output.write_text("\n".join(lines), encoding="utf-8")
print(f"Generated {output} from preserved result values")
PY
